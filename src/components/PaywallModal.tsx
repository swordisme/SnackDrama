'use client'

import { X, Lock, Coins, Zap } from 'lucide-react'
import { COIN_PACKAGES } from '@/lib/mock-data'
import type { CoinPackage } from '@/types'

interface PaywallModalProps {
  episodeNumber: number
  userCoinBalance: number
  onClose: () => void
  onUnlockWithCoins: () => void
  onSubscribe: () => void
  onBuyCoins: (pkg: CoinPackage) => void
}

export default function PaywallModal({
  episodeNumber,
  userCoinBalance,
  onClose,
  onUnlockWithCoins,
  onSubscribe,
  onBuyCoins,
}: PaywallModalProps) {
  const canAfford = userCoinBalance >= 10

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-sm bg-gray-950 border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Lock icon */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mb-3">
            <Lock className="w-7 h-7 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Unlock Episode {episodeNumber}</h2>
          <p className="text-sm text-gray-400 mt-1">Choose how to continue watching</p>
        </div>

        {/* Coin balance */}
        <div className="flex items-center justify-center gap-2 mb-5 py-2 rounded-xl bg-white/5">
          <span className="text-yellow-400">🪙</span>
          <span className="text-sm text-gray-300">
            Your balance: <span className="text-white font-bold">{userCoinBalance} coins</span>
          </span>
        </div>

        {/* Option 1: Coins */}
        <button
          onClick={onUnlockWithCoins}
          disabled={!canAfford}
          className={`w-full flex items-center justify-between p-4 rounded-2xl border mb-3 transition-all ${
            canAfford
              ? 'border-yellow-400/50 bg-yellow-400/10 hover:bg-yellow-400/20 cursor-pointer'
              : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪙</span>
            <div className="text-left">
              <p className="text-white font-semibold">Use 10 Coins</p>
              <p className="text-xs text-gray-400">
                {canAfford ? 'Unlock this episode instantly' : 'Not enough coins'}
              </p>
            </div>
          </div>
          <span className="text-yellow-400 font-bold">10</span>
        </button>

        {/* Option 2: Subscription */}
        <button
          onClick={onSubscribe}
          className="w-full flex items-center justify-between p-4 rounded-2xl border border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 mb-5 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-purple-400" />
            <div className="text-left">
              <p className="text-white font-semibold">All-Access Pass</p>
              <p className="text-xs text-gray-400">$9.99/week · Unlock everything</p>
            </div>
          </div>
          <span className="text-purple-400 font-bold">$9.99</span>
        </button>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-950 px-3 text-xs text-gray-500">Or buy more coins</span>
          </div>
        </div>

        {/* Coin packages */}
        <div className="grid grid-cols-3 gap-2">
          {COIN_PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => onBuyCoins(pkg)}
              className="flex flex-col items-center p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-yellow-400/30 transition-all"
            >
              <span className="text-lg">🪙</span>
              <span className="text-white font-bold text-sm">{pkg.coins}</span>
              <span className="text-gray-400 text-xs">${pkg.price_usd}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
