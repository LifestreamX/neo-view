'use client'

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import { NormalizedAircraft } from '@/types/aircraft'
import {
  formatAltitude,
  formatSpeed,
  formatHeading,
  getCardinalDirection,
} from '@/lib/utils/geo'

// Fix for default marker icon
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
  })
}

interface AircraftMapProps {
  aircraft: NormalizedAircraft[]
  center?: [number, number]
  zoom?: number
  showClusters?: boolean
  showTrails?: boolean
  onAircraftClick?: (aircraft: NormalizedAircraft) => void
}

export function AircraftMap({
  aircraft,
  center = [39.8283, -98.5795],
  zoom = 4,
  showClusters = true,
  showTrails = false,
  onAircraftClick,
}: AircraftMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const trailsRef = useRef<Map<string, L.Polyline>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return

    const map = L.map('map', {
      center,
      zoom,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    markerLayerRef.current = L.layerGroup().addTo(map)

    // Initialize cluster group
    if (showClusters) {
      clusterGroupRef.current = (L as any).markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        maxClusterRadius: 50,
      })
      if (clusterGroupRef.current) {
        clusterGroupRef.current.addTo(map)
      }
    }

    setIsLoading(false)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [center, zoom, showClusters])

  // Create aircraft icon
  const createAircraftIcon = (heading: number, color = '#42a5f5') => {
    return L.divIcon({
      html: `
        <div style="transform: rotate(${heading}deg); transition: transform 0.5s ease; display: flex; align-items: center; justify-content: center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="0.5">
            <path d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/>
          </svg>
        </div>
      `,
      className: 'aircraft-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    })
  }

  // Update aircraft markers
  useEffect(() => {
    if (!mapRef.current || isLoading) return

    // If no aircraft data, keep existing markers (don't clear)
    if (!aircraft || aircraft.length === 0) {
      console.warn('No aircraft data, keeping existing markers')
      return
    }

    const map = mapRef.current
    const currentMarkers = markersRef.current
    const aircraftKeys = new Set(aircraft.map(ac => ac.icao24))

    // Update or create markers
    aircraft.forEach(ac => {
      const key = ac.icao24
      let marker = currentMarkers.get(key)

      if (marker) {
        // Update existing marker position smoothly
        const currentLatLng = marker.getLatLng()
        const newLatLng = L.latLng(ac.latitude, ac.longitude)

        // Only update if position changed significantly (> 0.001 degrees)
        const distance = currentLatLng.distanceTo(newLatLng)
        if (distance > 100) {
          // ~100 meters
          marker.setLatLng(newLatLng)
        }

        // Only update icon if heading changed significantly (> 5 degrees)
        const currentIcon = (marker as any)._icon
        const oldHeading = (marker as any)._aircraftHeading || 0
        const newHeading = ac.heading || 0

        if (Math.abs(newHeading - oldHeading) > 5) {
          marker.setIcon(createAircraftIcon(newHeading))
          ;(marker as any)._aircraftHeading = newHeading
        }

        // Update popup data
        const popupContent = `
          <div class="p-2">
            <h3 class="font-bold text-lg mb-2">✈️ ${ac.callsign}</h3>
            <div class="space-y-1 text-sm">
              <p><strong>ICAO24:</strong> ${ac.icao24}</p>
              <p><strong>Country:</strong> ${ac.country}</p>
              <p><strong>Altitude:</strong> ${formatAltitude(ac.altitude)}</p>
              <p><strong>Speed:</strong> ${formatSpeed(ac.velocity)}</p>
              <p><strong>Heading:</strong> ${formatHeading(ac.heading)} ${getCardinalDirection(ac.heading)}</p>
              <p><strong>Position:</strong> ${ac.latitude.toFixed(4)}, ${ac.longitude.toFixed(4)}</p>
            </div>
          </div>
        `
        marker.setPopupContent(popupContent)
      } else {
        // Create new marker
        marker = L.marker([ac.latitude, ac.longitude], {
          icon: createAircraftIcon(ac.heading || 0),
        })
        ;(marker as any)._aircraftHeading = ac.heading || 0

        const popupContent = `
          <div class="p-2">
            <h3 class="font-bold text-lg mb-2">✈️ ${ac.callsign}</h3>
            <div class="space-y-1 text-sm">
              <p><strong>ICAO24:</strong> ${ac.icao24}</p>
              <p><strong>Country:</strong> ${ac.country}</p>
              <p><strong>Altitude:</strong> ${formatAltitude(ac.altitude)}</p>
              <p><strong>Speed:</strong> ${formatSpeed(ac.velocity)}</p>
              <p><strong>Heading:</strong> ${formatHeading(ac.heading)} ${getCardinalDirection(ac.heading)}</p>
              <p><strong>Position:</strong> ${ac.latitude.toFixed(4)}, ${ac.longitude.toFixed(4)}</p>
            </div>
          </div>
        `

        marker.bindPopup(popupContent)

        if (onAircraftClick) {
          marker.on('click', () => onAircraftClick(ac))
        }

        if (showClusters && clusterGroupRef.current) {
          clusterGroupRef.current.addLayer(marker)
        } else if (markerLayerRef.current) {
          markerLayerRef.current.addLayer(marker)
        }

        currentMarkers.set(key, marker)
      }
    })

    // Only remove markers that haven't been seen for multiple updates
    // This prevents flicker when API temporarily returns empty or partial data
    currentMarkers.forEach((marker, key) => {
      if (!aircraftKeys.has(key)) {
        // Mark as stale but don't remove immediately
        const staleCount = ((marker as any)._staleCount || 0) + 1
        ;(marker as any)._staleCount = staleCount

        // Only remove after several consecutive updates without seeing this aircraft
        // (increased threshold to reduce flicker from transient/partial API responses)
        if (staleCount > 6) {
          if (showClusters && clusterGroupRef.current) {
            clusterGroupRef.current.removeLayer(marker)
          } else if (markerLayerRef.current) {
            markerLayerRef.current.removeLayer(marker)
          }
          currentMarkers.delete(key)
        }
      } else {
        // Reset stale count if aircraft is seen again
        ;(marker as any)._staleCount = 0
      }
    })
  }, [aircraft, showClusters, isLoading, onAircraftClick])

  return (
    <div className="relative w-full h-full">
      <div id="map" className="w-full h-full z-0" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-aviation-dark/80 z-10">
          <div className="text-white text-xl">Loading map...</div>
        </div>
      )}
    </div>
  )
}
