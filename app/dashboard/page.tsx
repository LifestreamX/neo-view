'use client'

import React, { useEffect, useState } from 'react'
import { AsteroidDetailsModal } from '@/components/asteroids/AsteroidDetailsModal'
import { NormalizedAsteroid } from '@/types/asteroid'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/ui/Navigation'

interface SavedAsteroid {
  id: string
  asteroidId?: string
  asteroidName?: string
  notes?: string | null
  createdAt: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [savedAsteroids, setSavedAsteroids] = useState<SavedAsteroid[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAsteroid, setSelectedAsteroid] =
    useState<NormalizedAsteroid | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSavedAsteroids()
    }
  }, [status])

  const fetchSavedAsteroids = async () => {
    try {
      const response = await fetch('/api/user/saved-asteroids')
      const data = await response.json()

      if (response.ok) {
        setSavedAsteroids(data.savedAsteroids || [])
      }
    } catch (error) {
      console.error('Error fetching saved asteroids:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/user/saved-asteroids`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (response.ok) {
        setSavedAsteroids(savedAsteroids.filter(a => a.id !== id))
      }
    } catch (error) {
      console.error('Error deleting favorite asteroid:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-24">
          <div className="text-center text-white text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-4xl font-bold text-white mb-8">
          NeoView Dashboard
        </h1>

        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Welcome back, {session?.user?.name}!
          </h2>
          <p className="text-purple-200">
            Track your favorite asteroids and manage your preferences.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            Favorite Asteroids
          </h2>

          {savedAsteroids.length === 0 ? (
            <p className="text-purple-200">
              No favorites yet. Explore asteroids and save ones you like!
            </p>
          ) : (
            <div className="space-y-4">
              {savedAsteroids.map(item => (
                <div
                  key={item.id}
                  className="bg-white/5 p-4 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      {item.asteroidName || 'Unknown'}
                    </h3>
                    {item.notes && (
                      <p className="text-purple-300 text-sm mt-2">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!item.asteroidId) return
                        try {
                          const res = await fetch(
                            `/api/asteroids/${item.asteroidId}`
                          )
                          if (!res.ok) return
                          const data = await res.json()
                          setSelectedAsteroid(data.asteroid)
                          setIsModalOpen(true)
                        } catch (e) {
                          console.error('Failed to load asteroid details', e)
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition duration-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {/* Asteroid Details Modal */}
              <AsteroidDetailsModal
                asteroid={selectedAsteroid as any}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                isFavorite={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
