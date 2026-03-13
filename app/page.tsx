import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen relative flex items-center overflow-hidden">
      {/* Animated space background handled by globals.css */}

      {/* Shooting stars */}
      <div
        className="shooting-star"
        style={{ top: '10%', right: '10%', animationDelay: '0s' }}
      />
      <div
        className="shooting-star"
        style={{ top: '30%', right: '30%', animationDelay: '2s' }}
      />
      <div
        className="shooting-star"
        style={{ top: '50%', right: '50%', animationDelay: '4s' }}
      />

      <div className="container mx-auto px-4 py-32 flex flex-col items-center max-w-4xl relative z-10">
        <div className="text-center w-full space-y-6">
          <div className="inline-block mb-4 text-6xl md:text-7xl animate-pulse">
            🌠
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 mb-4">
            NeoView
          </h1>
          <p className="text-lg md:text-xl text-purple-200 mb-12">
            Track Near-Earth Asteroids in Real-Time with NASA Data
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <Link
              href="/asteroids"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 shadow-lg shadow-purple-500/50"
            >
              🔭 View Asteroids
            </Link>
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 shadow-lg shadow-cyan-500/50"
            >
              📊 Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 gap-y-8 w-full">
          <div className="bg-purple-900/30 backdrop-blur-sm p-8 rounded-lg text-center border border-purple-500/30 hover:border-purple-400/50 transition-colors">
            <h3 className="text-2xl font-bold text-purple-100 mb-2">
              🌍 Near-Earth Objects
            </h3>
            <p className="text-purple-200">
              Monitor asteroids approaching Earth with real-time NASA data
            </p>
          </div>
          <div className="bg-purple-900/30 backdrop-blur-sm p-8 rounded-lg text-center border border-purple-500/30 hover:border-purple-400/50 transition-colors">
            <h3 className="text-2xl font-bold text-purple-100 mb-2">
              ⚠️ Hazard Detection
            </h3>
            <p className="text-purple-200">
              Identify potentially hazardous asteroids by size and proximity
            </p>
          </div>
          <div className="bg-purple-900/30 backdrop-blur-sm p-8 rounded-lg text-center border border-purple-500/30 hover:border-purple-400/50 transition-colors">
            <h3 className="text-2xl font-bold text-purple-100 mb-2">
              📈 Rich Visualizations
            </h3>
            <p className="text-purple-200">
              Explore asteroids with interactive timelines and size comparisons
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
