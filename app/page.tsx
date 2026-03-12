import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-aviation-dark via-blue-900 to-aviation-dark flex items-center">
      <div className="container mx-auto px-4 py-24 flex flex-col items-center max-w-4xl">
        <div className="text-center w-full space-y-6">
          <h1 className="text-6xl font-bold text-white mb-4">✈️ STRATOVIEW</h1>
          <p className="text-xl text-blue-200 mb-12">
            Real-Time Global Aircraft Tracking & Visualization
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <Link
              href="/map"
              className="bg-aviation-blue hover:bg-aviation-light text-white font-bold py-3 px-8 rounded-lg transition duration-300"
            >
              View Live Map
            </Link>
            <Link
              href="/dashboard"
              className="bg-aviation-accent hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition duration-300"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-12 w-full">
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              🌍 Global Coverage
            </h3>
            <p className="text-blue-200">
              Track thousands of aircraft worldwide in real-time
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              🔍 Advanced Filters
            </h3>
            <p className="text-blue-200">
              Filter by altitude, speed, country, and more
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              📍 Planes Above Me
            </h3>
            <p className="text-blue-200">
              Find aircraft flying near your location
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
