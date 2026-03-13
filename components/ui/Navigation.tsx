'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export function Navigation() {
  const { data: session } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isMenuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] bg-black/40 backdrop-blur-md shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🚀</span>
            <span className="text-white font-bold text-xl">NeoView</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/asteroids"
              className="text-white hover:text-purple-300 transition duration-300"
            >
              Asteroids
            </Link>
            <Link
              href="/dashboard"
              className="text-white hover:text-purple-300 transition duration-300"
            >
              Dashboard
            </Link>

            {session ? (
              <div
                className="relative flex items-center space-x-2"
                ref={menuRef}
              >
                {session.user?.image && (
                  <button
                    className="focus:outline-none"
                    tabIndex={0}
                    onClick={() => setIsMenuOpen(prev => !prev)}
                  >
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'Profile'}
                      className="w-9 h-9 rounded-full border-2 border-purple-400 shadow-md hover:scale-105 transition-transform"
                    />
                  </button>
                )}
                <span className="text-purple-200">{session.user?.name}</span>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-12 w-40 bg-black/90 rounded-lg shadow-lg py-2 z-50">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        signOut()
                      }}
                      className="block w-full text-left px-4 py-2 text-white hover:bg-purple-700 rounded transition"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded transition duration-300"
              >
                Sign In
              </Link>
            )}
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white text-2xl"
          >
            ☰
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-3">
              <Link
                href="/map"
                className="text-white hover:text-purple-300 transition duration-300"
              >
                Live Map
              </Link>
              <Link
                href="/dashboard"
                className="text-white hover:text-purple-300 transition duration-300"
              >
                Dashboard
              </Link>
              {session ? (
                <>
                  <span className="text-purple-200">{session.user?.name}</span>
                  <button
                    onClick={() => signOut()}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded transition duration-300 text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded transition duration-300"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
