import Link from 'next/link'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold">
            <span className="text-yellow-400">Snack</span>
            <span className="text-white">Drama</span>
          </Link>
          <p className="text-gray-400 mt-2 text-sm">Sign in to track your episodes</p>
        </div>

        {/* Card */}
        <div className="bg-gray-950 border border-white/10 rounded-2xl p-6">
          <h1 className="text-xl font-bold text-white mb-6">Welcome back</h1>

          <form className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold hover:opacity-90 transition-opacity"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-yellow-400 hover:text-yellow-300">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
