'use client'

import { NormalizedAsteroid } from '@/types/asteroid'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertTriangle,
  ExternalLink,
  Calendar,
  Ruler,
  Gauge,
  Moon,
  Orbit,
  X,
} from 'lucide-react'
import { format } from 'date-fns'

interface AsteroidDetailsModalProps {
  asteroid: NormalizedAsteroid | null
  isOpen: boolean
  onClose: () => void
  onToggleFavorite?: (asteroid: NormalizedAsteroid) => void
  isFavorite?: boolean
}

export function AsteroidDetailsModal({
  asteroid,
  isOpen,
  onClose,
  onToggleFavorite,
  isFavorite = false,
}: AsteroidDetailsModalProps) {
  if (!asteroid) return null

  const formatDistance = (km: number) => {
    const lunarDistance = km / 384400
    return {
      km: km.toLocaleString(),
      ld: lunarDistance.toFixed(4),
      au: (km / 149597870.7).toFixed(6),
    }
  }

  const formatVelocity = (kmh: number) => {
    return {
      kmh: kmh.toLocaleString(),
      kms: (kmh / 3600).toFixed(2),
      mph: (kmh * 0.621371).toLocaleString(),
    }
  }

  const formatNum = (n?: number, d = 3) =>
    typeof n === 'number' && !Number.isNaN(n) ? n.toFixed(d) : 'N/A'

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="neo-scrollbar max-w-3xl max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-38rem)] overflow-y-auto bg-slate-900 border-purple-500/30 mx-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl text-purple-100 flex items-center gap-2">
                {asteroid.name}
                {asteroid.isPotentiallyHazardous && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Hazardous
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                NASA NEO ID: {asteroid.id}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleFavorite?.(asteroid)}
                className="hover:bg-purple-500/20"
              >
                <span className="text-2xl">{isFavorite ? '⭐' : '☆'}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onClose()}
                className="hover:bg-purple-500/10 text-slate-300"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-purple-200 flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              Physical Characteristics
            </h3>
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-800/50 p-4">
              <div>
                <p className="text-sm text-slate-400">Estimated Diameter</p>
                <p className="text-lg font-medium text-purple-100">
                  {asteroid.estimatedDiameterMin.toFixed(3)} -{' '}
                  {asteroid.estimatedDiameterMax.toFixed(3)} km
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {(asteroid.estimatedDiameterMin * 1000).toFixed(0)} -{' '}
                  {(asteroid.estimatedDiameterMax * 1000).toFixed(0)} meters
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Average Diameter</p>
                <p className="text-lg font-medium text-purple-100">
                  {(
                    (asteroid.estimatedDiameterMin +
                      asteroid.estimatedDiameterMax) /
                    2
                  ).toFixed(3)}{' '}
                  km
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {(
                    ((asteroid.estimatedDiameterMin +
                      asteroid.estimatedDiameterMax) /
                      2) *
                    1000
                  ).toFixed(0)}{' '}
                  meters
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-purple-500/20" />

          {/* Close Approaches */}
          {asteroid.closeApproachData &&
            asteroid.closeApproachData.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-purple-200 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Close Approaches ({asteroid.closeApproachData.length})
                </h3>
                <div className="space-y-3">
                  {asteroid.closeApproachData.map((approach, index) => {
                    const distance = formatDistance(approach.missDistanceKm)
                    const velocity = formatVelocity(
                      approach.relativeVelocityKmh
                    )
                    return (
                      <div
                        key={index}
                        className="rounded-lg bg-slate-800/50 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-400">
                              Approach Date
                            </p>
                            <p className="text-lg font-medium text-blue-200">
                              {format(
                                new Date(approach.closeApproachDate),
                                'MMMM d, yyyy'
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {format(
                                new Date(approach.closeApproachDate),
                                'HH:mm:ss'
                              )}{' '}
                              UTC
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-blue-500/50"
                          >
                            {approach.orbitingBody}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-slate-400 flex items-center gap-1">
                              <Moon className="w-3 h-3" /> Miss Distance
                            </p>
                            <p className="font-medium text-cyan-200">
                              {distance.km} km
                            </p>
                            <p className="text-xs text-slate-500">
                              {distance.ld} LD • {distance.au} AU
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400 flex items-center gap-1">
                              <Gauge className="w-3 h-3" /> Relative Velocity
                            </p>
                            <p className="font-medium text-orange-200">
                              {velocity.kmh} km/h
                            </p>
                            <p className="text-xs text-slate-500">
                              {velocity.kms} km/s • {velocity.mph} mph
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          <Separator className="bg-purple-500/20" />

          {/* Orbital Data */}
          {asteroid.orbitalData && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-purple-200 flex items-center gap-2">
                <Orbit className="w-5 h-5" />
                Orbital Information
              </h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-800/50 p-4">
                {asteroid.orbitalData.orbitId && (
                  <div>
                    <p className="text-sm text-slate-400">Orbit ID</p>
                    <p className="font-medium text-slate-200">
                      {asteroid.orbitalData.orbitId}
                    </p>
                  </div>
                )}
                {asteroid.orbitalData.orbitDeterminationDate && (
                  <div>
                    <p className="text-sm text-slate-400">
                      Orbit Determination
                    </p>
                    <p className="font-medium text-slate-200">
                      {format(
                        new Date(asteroid.orbitalData.orbitDeterminationDate),
                        'MMM d, yyyy'
                      )}
                    </p>
                  </div>
                )}
                {asteroid.orbitalData.firstObservationDate && (
                  <div>
                    <p className="text-sm text-slate-400">First Observed</p>
                    <p className="font-medium text-slate-200">
                      {format(
                        new Date(asteroid.orbitalData.firstObservationDate),
                        'MMM d, yyyy'
                      )}
                    </p>
                  </div>
                )}
                {asteroid.orbitalData.lastObservationDate && (
                  <div>
                    <p className="text-sm text-slate-400">Last Observed</p>
                    <p className="font-medium text-slate-200">
                      {format(
                        new Date(asteroid.orbitalData.lastObservationDate),
                        'MMM d, yyyy'
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* External Links */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-purple-500/50 hover:bg-purple-500/20"
              asChild
            >
              <a
                href={asteroid.nasaJplUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View on NASA JPL
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
