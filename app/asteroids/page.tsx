'use client'

import { useState, useEffect } from 'react'
import {
  NormalizedAsteroid,
  AsteroidStats as AsteroidStatsType,
} from '@/types/asteroid'
import { AsteroidList } from '@/components/asteroids/AsteroidList'
import { AsteroidStatsDisplay } from '@/components/asteroids/AsteroidStats'
import { AsteroidTimeline } from '@/components/asteroids/AsteroidTimeline'
import { AsteroidSizeComparison } from '@/components/asteroids/AsteroidSizeComparison'
import { AsteroidDetailsModal } from '@/components/asteroids/AsteroidDetailsModal'
import { AsteroidDistanceVisualizer } from '@/components/asteroids/AsteroidDistanceVisualizer'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RefreshCw, Calendar } from 'lucide-react'
import { format, addDays } from 'date-fns'

export default function AsteroidsPage() {
  const [asteroids, setAsteroids] = useState<NormalizedAsteroid[]>([])
  const [stats, setStats] = useState<AsteroidStatsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAsteroid, setSelectedAsteroid] =
    useState<NormalizedAsteroid | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: addDays(new Date(), 7),
  })
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  const fetchAsteroids = async (noCache = false) => {
    try {
      setLoading(true)
      setError(null)

      const startDate = format(dateRange.start, 'yyyy-MM-dd')
      const endDate = format(dateRange.end, 'yyyy-MM-dd')

      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(noCache && { noCache: 'true' }),
      })

      const response = await fetch(`/api/asteroids?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch asteroids')
      }

      const data = await response.json()
      setAsteroids(data.asteroids)
      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching asteroids:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch asteroids')
    } finally {
      setLoading(false)
    }
    // Fetch favorites
    try {
      const favRes = await fetch('/api/user/saved-asteroids')
      if (favRes.ok) {
        const favData = await favRes.json()
        setFavoriteIds(
          new Set((favData.savedAsteroids || []).map((a: any) => a.asteroidId))
        )
      }
    } catch (e) {
      // ignore
    }
  }
  const handleToggleFavorite = async (asteroid: NormalizedAsteroid) => {
    if (favoriteIds.has(asteroid.id)) return // Already favorite
    try {
      const res = await fetch('/api/user/saved-asteroids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asteroidId: asteroid.id,
          asteroidName: asteroid.name,
        }),
      })
      if (res.ok) {
        setFavoriteIds(prev => new Set(prev).add(asteroid.id))
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    fetchAsteroids()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  const handleViewDetails = (asteroid: NormalizedAsteroid) => {
    setSelectedAsteroid(asteroid)
    setIsModalOpen(true)
  }

  const handleRefresh = () => {
    fetchAsteroids(true)
  }

  return (
    <div className="min-h-screen relative pt-20">
      <div className="container mx-auto px-4 py-8 space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              Near-Earth Asteroids
            </h1>
            <p className="text-slate-400 mt-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(dateRange.start, 'MMM d, yyyy')} -{' '}
              {format(dateRange.end, 'MMM d, yyyy')}
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh Data
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-4 bg-red-900/20 border-red-500/30">
            <p className="text-red-300">⚠️ {error}</p>
          </Card>
        )}

        {/* Loading State */}
        {loading && !asteroids.length && (
          <Card className="p-8 text-center bg-slate-900/50 backdrop-blur border-purple-500/20">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="text-slate-400">
                Loading asteroid data from NASA...
              </p>
            </div>
          </Card>
        )}

        {/* Stats */}
        {stats && !loading && <AsteroidStatsDisplay stats={stats} />}

        {/* Main Content */}
        {!loading && asteroids.length > 0 && (
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="bg-slate-900/50 border border-purple-500/20">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="size">Size Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
              <AsteroidList
                asteroids={asteroids}
                onViewDetails={handleViewDetails}
                onToggleFavorite={handleToggleFavorite}
                favoriteIds={favoriteIds}
              />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <AsteroidTimeline asteroids={asteroids} />
              {selectedAsteroid && (
                <AsteroidDistanceVisualizer asteroid={selectedAsteroid} />
              )}
            </TabsContent>

            <TabsContent value="size" className="space-y-6">
              <AsteroidSizeComparison asteroids={asteroids} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Details Modal */}
      <AsteroidDetailsModal
        asteroid={selectedAsteroid}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={
          selectedAsteroid ? favoriteIds.has(selectedAsteroid.id) : false
        }
      />
    </div>
  )
}
