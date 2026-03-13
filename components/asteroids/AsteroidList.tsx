'use client'

import { useState, useEffect } from 'react'
import { NormalizedAsteroid, AsteroidFilters } from '@/types/asteroid'
import { AsteroidCard } from './AsteroidCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface AsteroidListProps {
  asteroids: NormalizedAsteroid[]
  onViewDetails?: (asteroid: NormalizedAsteroid) => void
  onToggleFavorite?: (asteroid: NormalizedAsteroid) => void
  favoriteIds?: Set<string>
}

const ITEMS_PER_PAGE = 12

export function AsteroidList({
  asteroids,
  onViewDetails,
  onToggleFavorite,
  favoriteIds = new Set(),
}: AsteroidListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<AsteroidFilters>({
    hazardousOnly: false,
    minDiameter: undefined,
    maxDiameter: undefined,
  })
  const [currentPage, setCurrentPage] = useState(1)

  // Filter asteroids based on search and filters
  const filteredAsteroids = asteroids.filter(asteroid => {
    // Search filter
    if (
      searchQuery &&
      !asteroid.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    // Hazardous filter
    if (filters.hazardousOnly && !asteroid.isPotentiallyHazardous) {
      return false
    }

    // Diameter filters
    const avgDiameter =
      (asteroid.estimatedDiameterMin + asteroid.estimatedDiameterMax) / 2
    if (
      filters.minDiameter !== undefined &&
      avgDiameter < filters.minDiameter
    ) {
      return false
    }
    if (
      filters.maxDiameter !== undefined &&
      avgDiameter > filters.maxDiameter
    ) {
      return false
    }

    return true
  })

  // Reset page when search/filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filters])

  const totalPages = Math.ceil(filteredAsteroids.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const asteroidsToShow = filteredAsteroids.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  const hazardousCount = filteredAsteroids.filter(
    a => a.isPotentiallyHazardous
  ).length

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4 space-y-4 bg-slate-900/50 backdrop-blur border-purple-500/20">
        <div className="space-y-2">
          <Label htmlFor="search" className="text-purple-200">
            Search Asteroids
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              id="search"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-purple-500/30 focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="hazardous"
            checked={filters.hazardousOnly}
            onCheckedChange={checked =>
              setFilters(prev => ({ ...prev, hazardousOnly: checked }))
            }
          />
          <Label htmlFor="hazardous" className="text-slate-300">
            Show only potentially hazardous asteroids ({hazardousCount})
          </Label>
        </div>

        <div className="space-y-2">
          <Label className="text-purple-200">Minimum Diameter (km)</Label>
          <Slider
            min={0}
            max={10}
            step={0.1}
            value={[filters.minDiameter || 0]}
            onValueChange={([value]) =>
              setFilters(prev => ({ ...prev, minDiameter: value || undefined }))
            }
            className="w-full"
          />
          <div className="text-sm text-slate-400">
            {filters.minDiameter
              ? `${filters.minDiameter.toFixed(1)} km`
              : 'No minimum'}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-purple-200">Maximum Diameter (km)</Label>
          <Slider
            min={0}
            max={10}
            step={0.1}
            value={[filters.maxDiameter || 10]}
            onValueChange={([value]) =>
              setFilters(prev => ({ ...prev, maxDiameter: value }))
            }
            className="w-full"
          />
          <div className="text-sm text-slate-400">
            {filters.maxDiameter
              ? `${filters.maxDiameter.toFixed(1)} km`
              : 'No maximum'}
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing{' '}
          <span className="text-purple-200 font-medium font-mono">
            {startIndex + 1}-
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredAsteroids.length)}
          </span>{' '}
          of{' '}
          <span className="text-purple-200 font-medium font-mono">
            {filteredAsteroids.length}
          </span>{' '}
          asteroids
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="border-purple-500/30 hover:bg-purple-500/10"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-400">
            Page{' '}
            <span className="text-purple-200 font-mono">{currentPage}</span> of{' '}
            <span className="text-purple-200 font-mono">{totalPages}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage(prev => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="border-purple-500/30 hover:bg-purple-500/10"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Asteroid Grid */}
      {filteredAsteroids.length === 0 ? (
        <Card className="p-8 text-center bg-slate-900/50 backdrop-blur border-purple-500/20">
          <p className="text-slate-400">No asteroids match your filters</p>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {asteroidsToShow.map(asteroid => (
              <AsteroidCard
                key={asteroid.id}
                asteroid={asteroid}
                onViewDetails={onViewDetails}
                onToggleFavorite={onToggleFavorite}
                isFavorite={favoriteIds.has(asteroid.id)}
              />
            ))}
          </div>

          {/* Pagination Bottom */}
          <div className="flex flex-col items-center gap-4 py-4 border-t border-purple-500/10">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                disabled={currentPage === 1}
                className="border-purple-500/30 hover:bg-purple-500/10 text-purple-200"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      pageNum = currentPage - 2 + i
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i)
                    }
                  }
                  if (pageNum <= 0 || pageNum > totalPages) return null

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setCurrentPage(pageNum)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className={
                        currentPage === pageNum
                          ? 'bg-purple-600'
                          : 'text-slate-400 hover:text-purple-200'
                      }
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                disabled={currentPage === totalPages}
                className="border-purple-500/30 hover:bg-purple-500/10 text-purple-200"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Showing {startIndex + 1} to{' '}
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredAsteroids.length)}{' '}
              of {filteredAsteroids.length} objects
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
