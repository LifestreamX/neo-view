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
// OPENSKY_PROXY_URL removed, reverting to direct OpenSky usage
const CACHE_KEY = 'aircraft_data'
const CACHE_TTL = 600000 // 10 minutes - longer cache to avoid hitting rate limits
const MAX_RETRIES = 2
const INITIAL_RETRY_DELAY = 2000 // 2 seconds
const OPENSKY_TOKEN_CACHE_KEY = 'opensky_token'
const TOKEN_ERROR_COOLDOWN = 60 * 1000 // 1 minute cooldown after token failures (shorter for faster recovery)

// Rate limiting for OpenSky API
// Anonymous: 10 seconds between requests minimum
// Authenticated: 5 seconds between requests (to be safe)
const MIN_REQUEST_INTERVAL_ANONYMOUS = 10000 // 10 seconds
const MIN_REQUEST_INTERVAL_AUTHENTICATED = 5000 // 5 seconds

// When token endpoint returns 403 repeatedly we should avoid hammering it.
let tokenErrorUntil = 0
let lastOpenSkyRequestTime = 0

export class AviationAPIService {
  private static instance: AviationAPIService
  private lastFetchSource: 'live' | 'cache' | 'mock' | null = null
  private lastFetchTime: number | null = null

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

      // Rate limiting: ensure we don't make requests too frequently
      const hasAuth = !!(
        process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD
      )
      const minInterval = hasAuth
        ? MIN_REQUEST_INTERVAL_AUTHENTICATED
        : MIN_REQUEST_INTERVAL_ANONYMOUS

      const timeSinceLastRequest = Date.now() - lastOpenSkyRequestTime
      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest
        logger.info(
          `Rate limiting: waiting ${waitTime}ms before next OpenSky request`
        )
        await this.sleep(waitTime)
      }

      // Prepare axios config
      const axiosConfig: any = {
        // Increase timeout to 60s to avoid premature aborts from slow egress
        timeout: 60000,
        headers: {
          'User-Agent': 'StratoView/1.0',
        },
      }

      // OpenSky token flow. Prefer proxy if configured, otherwise use client creds.
      const clientId = process.env.OPENSKY_CLIENT_ID
      const clientSecret = process.env.OPENSKY_CLIENT_SECRET
      let accessToken: string | null = null

      if (clientId && clientSecret) {
        logger.debug(
          `[OpenSky OAuth2] Using clientId: ${clientId.slice(0, 6)}... (secret hidden)`
        )
        // Try to get cached token
        accessToken = nodeCache.get<string>(OPENSKY_TOKEN_CACHE_KEY) || null
        let tokenExpiresAt =
          nodeCache.get<number>(`${OPENSKY_TOKEN_CACHE_KEY}_expires`) || 0
        const now = Date.now()
        logger.debug(
          `[OpenSky OAuth2] Cached token: ${!!accessToken}, expires at: ${tokenExpiresAt}, now: ${now}`
        )
        // If no token or expired, fetch new token
        if (!accessToken || now > tokenExpiresAt) {
          // Avoid hammering token endpoint if recently failed
          if (tokenErrorUntil && now < tokenErrorUntil) {
            logger.warn(
              '[OpenSky OAuth2] Token endpoint in cooldown, skipping token fetch; falling back to anonymous requests'
            )
            // leave accessToken null to use anonymous access
          } else {
            try {
              logger.debug('[OpenSky OAuth2] Fetching new token...')
              const tokenResp = await axios.post(
                OPENSKY_TOKEN_URL,
                new URLSearchParams({
                  grant_type: 'client_credentials',
                  client_id: clientId,
                  client_secret: clientSecret,
                }),
                {
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  // Token fetch can be slow from some hosts; allow longer for retries
                  timeout: 60000,
                }
              )
              accessToken = tokenResp.data.access_token
              const expiresIn = tokenResp.data.expires_in || 1800 // seconds
              // Refresh 30s before expiry
              tokenExpiresAt = now + (expiresIn - 30) * 1000
              nodeCache.set(
                OPENSKY_TOKEN_CACHE_KEY,
                accessToken,
                expiresIn - 30
              )
              nodeCache.set(
                `${OPENSKY_TOKEN_CACHE_KEY}_expires`,
                tokenExpiresAt,
                expiresIn - 30
              )
              logger.info(
                `[OpenSky OAuth2] Obtained new token, expires in ${expiresIn}s (at ${tokenExpiresAt})`
              )
            } catch (err: any) {
              logger.error(
                '[OpenSky OAuth2] Failed to fetch token',
                err?.response?.data || err
              )
              tokenErrorUntil = now + TOKEN_ERROR_COOLDOWN
              // Do not throw here; fall back to anonymous access instead of failing the whole request
              accessToken = null
            }
          }
        }
        logger.debug(
          `[OpenSky OAuth2] Using Bearer token: ${accessToken ? accessToken.slice(0, 12) + '...' : 'none'}`
        )
        axiosConfig.headers = {
          ...axiosConfig.headers,
          Authorization: `Bearer ${accessToken}`,
        }
      } else {
        logger.warn(
          '[OpenSky OAuth2] No credentials configured - using anonymous access (strict rate limits apply)'
        )
      }

      // Update last request time before making the request
      lastOpenSkyRequestTime = Date.now()
      const requestUrl = OPENSKY_API_URL
      logger.debug(`[OpenSky API] Requesting: ${requestUrl}`)
      logger.debug(
        `[OpenSky API] Headers: ${JSON.stringify(axiosConfig.headers)}`
      )
      try {
        const response = await axios.get<OpenSkyResponse>(
          requestUrl,
          axiosConfig
        )
        logger.debug('[OpenSky API] Response received')
        if (response.data && (response.data as any).states) {
          logger.info(
            `[OpenSky API] Returned ${(response.data as any).states.length} aircraft`
          )
        }
        logger.apiRequest('GET', OPENSKY_API_URL, response.status)
        return response.data
      } catch (err: any) {
        logger.error('[OpenSky API] Request failed', err?.response?.data || err)
        throw err
      }
    } catch (error) {
      const axiosError = error as AxiosError

      const status = axiosError.response?.status
      logger.apiError('GET', OPENSKY_API_URL, {
        message: axiosError.message,
        status,
        attempt: retryCount + 1,
      })

      // Log response body from OpenSky if present to help debugging
      if (axiosError.response && axiosError.response.data) {
        logger.debug('OpenSky error body', axiosError.response.data)
      }

      // If we're being rate-limited, wait longer before retry
      if (status === 429) {
        if (retryCount < MAX_RETRIES) {
          // Exponential backoff with longer delays for rate limiting
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount) * 10
          logger.warn(
            `Rate limited by OpenSky (429). Retrying in ${delay}ms... (attempt ${retryCount + 2})`
          )
          await this.sleep(delay)
          return this.fetchWithRetry(retryCount + 1)
        }

        logger.warn(
          'OpenSky rate limit encountered (429); max retries reached, using cache if available'
        )
        return null
      }

      // For authentication errors, log but don't retry
      if (status === 401 || status === 403) {
        logger.error(
          `OpenSky authentication failed (${status}). Check OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET environment variables.`
        )
        // Invalidate cached token on 401/403
        nodeCache.del(OPENSKY_TOKEN_CACHE_KEY)
        nodeCache.del(`${OPENSKY_TOKEN_CACHE_KEY}_expires`)
        tokenErrorUntil = Date.now() + TOKEN_ERROR_COOLDOWN
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
      this.lastFetchSource = 'cache'
      this.lastFetchTime = Date.now()
      return nodeCache.get<NormalizedAircraft[]>(CACHE_KEY) || []
    }

    // Fetch fresh data
    const response = await this.fetchWithRetry()

    if (!response || !response.states || response.states.length === 0) {
      logger.error(
        'No data available from OpenSky API (API failed/empty and no cache)'
      )
      this.lastFetchSource = 'live'
      this.lastFetchTime = Date.now()
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
      this.lastFetchSource = 'live'
      this.lastFetchTime = Date.now()
    } else {
      logger.warn('Normalized data is empty, not updating cache')
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

// expose status getter for debug endpoints
export const getAviationStatus = () => {
  const inst = AviationAPIService.getInstance() as any
  return {
    lastFetchSource: inst.lastFetchSource ?? null,
    lastFetchTime: inst.lastFetchTime ?? null,
    cacheKeys: nodeCache.keys(),
  }
}
