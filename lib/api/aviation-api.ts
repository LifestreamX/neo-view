import axios, { AxiosError } from 'axios'
import { nodeCache } from '@/lib/cache/node-cache'
import { logger } from '@/lib/utils/logger'
import {
  OpenSkyResponse,
  NormalizedAircraft,
  AircraftFilters,
} from '@/types/aircraft'
import { isValidCoordinate } from '@/lib/utils/geo'

const OPENSKY_API_URL = 'https://opensky-network.org/api/states/all'
const OPENSKY_TOKEN_URL =
  process.env.OPENSKY_TOKEN_URL ||
  'https://opensky-network.org/auth/realms/opensky/protocol/openid-connect/token'
const CACHE_KEY = 'aircraft_data'
const CACHE_TTL = 60000 // 60 seconds - longer cache to avoid hitting rate limits
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second
const OPENSKY_TOKEN_CACHE_KEY = 'opensky_token'

export class AviationAPIService {
  private static instance: AviationAPIService

  private constructor() {}

  static getInstance(): AviationAPIService {
    if (!AviationAPIService.instance) {
      AviationAPIService.instance = new AviationAPIService()
    }
    return AviationAPIService.instance
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async fetchWithRetry(
    retryCount = 0
  ): Promise<OpenSkyResponse | null> {
    try {
      logger.debug(`Fetching aircraft data (attempt ${retryCount + 1})`)

      // Prepare axios config
      const axiosConfig: any = {
        timeout: 15000,
        headers: {
          'User-Agent': 'StratoView/1.0',
        },
      }

      // Prefer OAuth2 client credentials if provided (OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET)
      if (process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET) {
        const cached = nodeCache.get<{ token: string }>(OPENSKY_TOKEN_CACHE_KEY)
        if (cached && cached.token) {
          axiosConfig.headers.Authorization = `Bearer ${cached.token}`
          logger.debug('Using cached OpenSky OAuth token')
        } else {
          try {
            const params = new URLSearchParams()
            params.append('grant_type', 'client_credentials')
            params.append('client_id', process.env.OPENSKY_CLIENT_ID)
            params.append('client_secret', process.env.OPENSKY_CLIENT_SECRET)

            let tokenResp
            try {
              tokenResp = await axios.post(
                OPENSKY_TOKEN_URL,
                params.toString(),
                {
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  timeout: 10000,
                }
              )
            } catch (firstErr: any) {
              logger.warn('First token request failed, trying with Basic auth')
              // Retry using HTTP Basic auth header (Keycloak sometimes expects this)
              const basicAuth = Buffer.from(
                `${process.env.OPENSKY_CLIENT_ID}:${process.env.OPENSKY_CLIENT_SECRET}`
              ).toString('base64')
              tokenResp = await axios.post(
                OPENSKY_TOKEN_URL,
                'grant_type=client_credentials',
                {
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${basicAuth}`,
                  },
                  timeout: 10000,
                }
              )
            }

            const tokenData = tokenResp?.data
            if (tokenData && tokenData.access_token) {
              const ttl = Math.max((tokenData.expires_in || 300) - 10, 10)
              nodeCache.set(
                OPENSKY_TOKEN_CACHE_KEY,
                { token: tokenData.access_token },
                ttl
              )
              axiosConfig.headers.Authorization = `Bearer ${tokenData.access_token}`
              logger.info('Acquired new OpenSky OAuth token')
            }
          } catch (tokErr: any) {
            logger.warn(
              'Failed to acquire OpenSky OAuth token, using unauthenticated request'
            )
          }
        }
      } else if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
        // Fallback to legacy basic auth
        axiosConfig.auth = {
          username: process.env.OPENSKY_USERNAME,
          password: process.env.OPENSKY_PASSWORD,
        }
        logger.debug('Using OpenSky username/password auth')
      }

      const response = await axios.get<OpenSkyResponse>(
        OPENSKY_API_URL,
        axiosConfig
      )

      logger.apiRequest('GET', OPENSKY_API_URL, response.status)
      return response.data
    } catch (error) {
      const axiosError = error as AxiosError

      const status = axiosError.response?.status
      logger.apiError('GET', OPENSKY_API_URL, {
        message: axiosError.message,
        status,
        attempt: retryCount + 1,
      })

      // If we're being rate-limited, don't keep retrying — return null so
      // callers can use cached/stale data instead of hammering the API.
      if (status === 429) {
        logger.warn(
          'OpenSky rate limit encountered (429); using cache if available'
        )
        return null
      }

      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount)
        logger.warn(`Retrying in ${delay}ms... (attempt ${retryCount + 2})`)
        await this.sleep(delay)
        return this.fetchWithRetry(retryCount + 1)
      }

      logger.error('Max retries reached, returning null')
      return null
    }
  }

  private normalizeAircraftData(
    states: (string | number | boolean | null)[][]
  ): NormalizedAircraft[] {
    const normalized: NormalizedAircraft[] = []

    for (const state of states) {
      const [
        icao24,
        callsign,
        origin_country,
        time_position,
        last_contact,
        longitude,
        latitude,
        baro_altitude,
        on_ground,
        velocity,
        true_track,
      ] = state

      // Skip aircraft without valid position
      if (!isValidCoordinate(latitude as number, longitude as number)) {
        continue
      }

      // Skip aircraft on ground
      if (on_ground) {
        continue
      }

      normalized.push({
        icao24: (icao24 as string).trim(),
        callsign: callsign ? (callsign as string).trim() : 'Unknown',
        country: (origin_country as string).trim(),
        latitude: latitude as number,
        longitude: longitude as number,
        altitude: baro_altitude as number,
        velocity: velocity as number,
        heading: true_track as number,
        lastUpdate: last_contact as number,
        onGround: on_ground as boolean,
        verticalRate: 0,
      })
    }

    return normalized
  }

  async getAircraftData(useCache = true): Promise<NormalizedAircraft[]> {
    // Check cache first
    if (useCache && nodeCache.has(CACHE_KEY)) {
      logger.debug('Returning cached aircraft data (node-cache)')
      return nodeCache.get<NormalizedAircraft[]>(CACHE_KEY) || []
    }

    // Fetch fresh data
    const response = await this.fetchWithRetry()

    if (!response || !response.states || response.states.length === 0) {
      // Return cached data if API fails or returns empty
      const cachedData = nodeCache.get<NormalizedAircraft[]>(CACHE_KEY)
      if (cachedData && cachedData.length > 0) {
        logger.warn(
          'API failed or returned empty, using stale cache data (node-cache)'
        )
        return cachedData
      }
      logger.error('No data available (API failed/empty and no cache)')
      // Return empty array instead of null to prevent UI from breaking
      return []
    }

    // Normalize and cache
    const normalized = this.normalizeAircraftData(response.states)

    // Only update cache if we have valid data
    if (normalized.length > 0) {
      nodeCache.set(CACHE_KEY, normalized, CACHE_TTL / 1000) // node-cache TTL is in seconds
      logger.info(
        `Fetched and cached ${normalized.length} aircraft (node-cache)`
      )
    } else {
      logger.warn('Normalized data is empty, keeping old cache (node-cache)')
      const cachedData = nodeCache.get<NormalizedAircraft[]>(CACHE_KEY)
      return cachedData || []
    }

    return normalized
  }

  async getFilteredAircraft(
    filters: AircraftFilters
  ): Promise<NormalizedAircraft[]> {
    const aircraft = await this.getAircraftData()

    if (!aircraft) {
      return []
    }

    return aircraft.filter(ac => {
      // Altitude filter
      if (
        filters.minAltitude !== undefined &&
        ac.altitude < filters.minAltitude
      ) {
        return false
      }
      if (
        filters.maxAltitude !== undefined &&
        ac.altitude > filters.maxAltitude
      ) {
        return false
      }

      // Speed filter
      if (filters.minSpeed !== undefined && ac.velocity < filters.minSpeed) {
        return false
      }
      if (filters.maxSpeed !== undefined && ac.velocity > filters.maxSpeed) {
        return false
      }

      // Country filter
      if (
        filters.countries &&
        filters.countries.length > 0 &&
        !filters.countries.includes(ac.country)
      ) {
        return false
      }

      // ICAO24 filter
      if (
        filters.icao24 &&
        !ac.icao24.toLowerCase().includes(filters.icao24.toLowerCase())
      ) {
        return false
      }

      // Callsign filter
      if (
        filters.callsign &&
        !ac.callsign.toLowerCase().includes(filters.callsign.toLowerCase())
      ) {
        return false
      }

      return true
    })
  }

  clearCache(): void {
    nodeCache.del(CACHE_KEY)
    logger.debug('Aircraft cache cleared (node-cache)')
  }
}

export const aviationAPI = AviationAPIService.getInstance()
