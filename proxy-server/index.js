const express = require('express')
const axios = require('axios')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 4000

// POST /opensky-token -> returns OpenSky token using server-side credentials
app.post('/opensky-token', async (req, res) => {
  try {
    const params = new URLSearchParams()
    params.append('grant_type', 'client_credentials')
    params.append('client_id', process.env.OPENSKY_CLIENT_ID)
    params.append('client_secret', process.env.OPENSKY_CLIENT_SECRET)

    const resp = await axios.post(
      process.env.OPENSKY_TOKEN_URL,
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20000,
      }
    )

    return res.json(resp.data)
  } catch (err) {
    // Log the error for debugging
    console.error('OpenSky token error:', err)
    const status = err.response?.status || 500
    return res
      .status(status)
      .json({ error: err.message, data: err.response?.data })
  }
})

// GET /opensky-states?access_token=TOKEN -> proxies states/all
app.get('/opensky-states', async (req, res) => {
  try {
    const accessToken = req.query.access_token
    const headers = {}
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`

    const resp = await axios.get('https://opensky-network.org/api/states/all', {
      headers,
      timeout: 20000,
    })

    return res.json(resp.data)
  } catch (err) {
    const status = err.response?.status || 500
    return res
      .status(status)
      .json({ error: err.message, data: err.response?.data })
  }
})

app.listen(PORT, () => console.log(`OpenSky proxy running on ${PORT}`))
