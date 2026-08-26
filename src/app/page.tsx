import Link from 'next/link'
import { Play } from 'lucide-react'

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/40 via-black to-black" />

      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-700/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <span className="text-2xl font-bold tracking-tight">
          <span className="text-yellow-400">Snack</span>
          <span className="text-white">Drama</span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-full border border-white/10 hover:border-white/30"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 text-center">
        {/* Series badge */}
        <span className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Now Streaming
        </span>

        {/* Title */}
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-tight mb-4 tracking-tight">
          Forbidden
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-500">
            Lesson
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-gray-400 max-w-md mb-10 leading-relaxed italic">
          &ldquo;She taught him everything. Except how to forget her.&rdquo;
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/watch/forbidden-lesson"
            className="group flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold text-lg hover:shadow-lg hover:shadow-yellow-500/30 transition-all duration-300 hover:scale-105"
          >
            <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
            Watch Now
          </Link>
          <span className="text-gray-500 text-sm">Free to start · No credit card required</span>
        </div>

        {/* Stats row */}
        <div className="mt-16 flex items-center gap-8 text-center">
          <div>
            <p className="text-2xl font-bold text-white">15</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Episodes</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-2xl font-bold text-white">5</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Free</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-2xl font-bold text-yellow-400">10</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Coins / Ep</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-gray-600 text-xs">
        © {new Date().getFullYear()} SnackDrama. All rights reserved.
      </footer>
    </main>
  )
}
