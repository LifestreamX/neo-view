import { NextResponse } from 'next/server'
import axios from 'axios'

// POST /api/debug/opensky/token
// Trigger a direct token fetch to OpenSky and return full response/error for debugging.
export async function POST() {
  try {
    const clientId = process.env.OPENSKY_CLIENT_ID
    const clientSecret = process.env.OPENSKY_CLIENT_SECRET
    const tokenUrl =
      process.env.OPENSKY_TOKEN_URL ||
      'https://opensky-network.org/auth/realms/opensky/protocol/openid-connect/token'

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'missing OPENSKY_CLIENT_ID or OPENSKY_CLIENT_SECRET' }, { status: 400 })
    }

    const params = new URLSearchParams()
    params.append('grant_type', 'client_credentials')
    params.append('client_id', clientId as string)
    params.append('client_secret', clientSecret as string)

    const resp = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    })

    return NextResponse.json({ ok: true, data: resp.data })
  } catch (err: any) {
    const status = err.response?.status || 500
    const body = err.response?.data || null
    const message = err.message || 'unknown error'
    // Return details for debugging (do NOT leave this enabled long-term in production)
    return NextResponse.json({ ok: false, message, status, body }, { status })
  }
}
