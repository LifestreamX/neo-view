'use client'

import { useState, useEffect, useCallback } from 'react'
import { NormalizedAircraft } from '@/types/aircraft'

export function useAircraftData(autoRefresh = true, interval = 30000) {
  const [aircraft, setAircraft] = useState<NormalizedAircraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAircraft = useCallback(async () => {
    try {
      const response = await fetch('/api/aircraft')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch aircraft')
      }

      // If API returned an empty array, skip updating to avoid transient
      // empty payloads causing UI flicker (keep previous state until
      // we receive a non-empty update).
      if (!data.aircraft || data.aircraft.length === 0) {
        console.warn(
          'Empty aircraft payload received — keeping previous aircraft state'
        )
      } else {
        // Merge incoming aircraft with the existing list to avoid
        // removing markers for aircraft that are briefly absent in a
        // single poll (e.g., SITL or transient API issues).
        setAircraft(prev => {
          const map = new Map<string, NormalizedAircraft>()
          prev.forEach(a => map.set(a.icao24, a))
          data.aircraft.forEach((a: NormalizedAircraft) => map.set(a.icao24, a))
          return Array.from(map.values())
        })
      }
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching aircraft:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAircraft()

    if (autoRefresh) {
      const intervalId = setInterval(fetchAircraft, interval)
      return () => clearInterval(intervalId)
    }
  }, [fetchAircraft, autoRefresh, interval])

  return { aircraft, loading, error, refetch: fetchAircraft }
}
