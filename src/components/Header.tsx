'use client'

import Link from 'next/link'
import { LogIn, LogOut, ShoppingCart } from 'lucide-react'
import type { UserProfile } from '@/types'

interface HeaderProps {
  user?: UserProfile | null
  onLogout?: () => void
  onBuyCoins?: () => void
}

export default function Header({ user, onLogout, onBuyCoins }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
      {/* Logo */}
      <Link href="/" className="text-xl font-bold tracking-tight">
        <span className="text-yellow-400">Snack</span>
        <span className="text-white">Drama</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {user ? (
          <>
            {/* Coin balance */}
            <button
              onClick={onBuyCoins}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 hover:bg-yellow-400/20 transition-colors"
            >
              <span className="text-sm">🪙</span>
              <span className="text-yellow-400 font-bold text-sm">{user.coin_balance}</span>
            </button>

            {/* Buy coins */}
            <button
              onClick={onBuyCoins}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white text-sm"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Buy Coins
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-300 text-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-yellow-400 text-black font-semibold text-sm hover:bg-yellow-300 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
