import { NextResponse } from 'next/server'
import axios from 'axios'
import { nodeCache } from '@/lib/cache/node-cache'
import { aviationAPI } from '@/lib/api/aviation-api'

const OPENSKY_TOKEN_CACHE_KEY = 'opensky_token'
const OPENSKY_API_URL = 'https://opensky-network.org/api/states/all'
const OPENSKY_TOKEN_URL =
  process.env.OPENSKY_TOKEN_URL ||
  'https://opensky-network.org/auth/realms/opensky/protocol/openid-connect/token'

export async function GET() {
  try {
    const tokenCached = nodeCache.get<{ token: string }>(
      OPENSKY_TOKEN_CACHE_KEY
    )
    const tokenTtl = nodeCache.getTtl
      ? nodeCache.getTtl(OPENSKY_TOKEN_CACHE_KEY)
      : null

    // Attempt a quick token acquisition check if creds present
    let tokenFetchAttempt = null
    if (
      !tokenCached &&
      process.env.OPENSKY_CLIENT_ID &&
      process.env.OPENSKY_CLIENT_SECRET
    ) {
      try {
        const params = new URLSearchParams()
        params.append('grant_type', 'client_credentials')
        params.append('client_id', process.env.OPENSKY_CLIENT_ID as string)
        params.append(
          'client_secret',
          process.env.OPENSKY_CLIENT_SECRET as string
        )

        const resp = await axios.post(OPENSKY_TOKEN_URL, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        })
        tokenFetchAttempt = { status: 'ok', body: !!resp.data }
      } catch (err: any) {
        tokenFetchAttempt = {
          status: 'error',
          message: err?.response?.data || err.message,
        }
      }
    }

    // Attempt to fetch aircraft (will respect cache and rate limits)
    let aircraftCount: number | null = null
    try {
      const data = await aviationAPI.getAircraftData()
      aircraftCount = data.length
    } catch (err) {
      aircraftCount = null
    }

    return NextResponse.json({
      tokenCached: !!tokenCached,
      tokenTtl,
      tokenFetchAttempt,
      aircraftCount,
      env: {
        hasClientCreds: !!(
          process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET
        ),
        hasBasicAuth: !!(
          process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD
        ),
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    )
  }
}
