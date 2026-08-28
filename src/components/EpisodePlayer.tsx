'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Play, Volume2, VolumeX } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Episode, Series, UserProfile } from '@/types'
import PaywallModal from './PaywallModal'
import type { CoinPackage } from '@/types'
import { usePaddle } from './PaddleProvider'
import { createClient } from '@/lib/supabase/client'

interface EpisodePlayerProps {
  series: Series
  episodes: Episode[]
  user?: UserProfile | null
}

export default function EpisodePlayer({ series, episodes, user }: EpisodePlayerProps) {
  const router = useRouter()
  const [paywallEpisode, setPaywallEpisode] = useState<Episode | null>(null)
  const [muted, setMuted] = useState(true)
  const [unlockedEpisodes, setUnlockedEpisodes] = useState<Set<string>>(new Set())
  const [authUser, setAuthUser] = useState<User | null>(null)
  // Live coin balance — initialised from server prop, updated after checkout
  const [liveCoinBalance, setLiveCoinBalance] = useState<number>(user?.coin_balance ?? 0)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const { paddle, onCheckoutComplete } = usePaddle()

  // Sync live auth session client-side — never rely solely on server prop
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setAuthUser(data.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Subscribe to Paddle checkout.completed — re-fetch profile for live balance update
  useEffect(() => {
    const unsubscribe = onCheckoutComplete(async () => {
      console.log('[EpisodePlayer] checkout.completed — refreshing coin balance')
      // Give the webhook ~2 s to credit coins before re-fetching
      await new Promise((r) => setTimeout(r, 2000))
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', currentUser.id)
        .maybeSingle()
      if (profile) {
        setLiveCoinBalance(profile.coin_balance ?? 0)
        console.log('[EpisodePlayer] coin balance refreshed:', profile.coin_balance)
      }
    })
    return unsubscribe
  }, [onCheckoutComplete])

  // IntersectionObserver: auto-play video in view
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    videoRefs.current.forEach((video, id) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              videoRefs.current.forEach((v, vid) => {
                if (vid !== id) {
                  v.pause()
                  v.currentTime = 0
                }
              })
              if (video.src) {
                video.play().catch(() => {})
              }
            }
          })
        },
        { threshold: 0.7 }
      )
      observer.observe(video)
      observers.push(observer)
    })

    return () => observers.forEach((obs) => obs.disconnect())
  }, [episodes])

  // Fetch live coin balance from Supabase whenever authUser is resolved/changed
  useEffect(() => {
    if (!authUser?.id) return

    async function fetchBalance() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', authUser!.id)
        .maybeSingle()

      if (error) {
        console.error('[EpisodePlayer] fetchBalance error:', error.message)
        return
      }

      if (data && typeof data.coin_balance === 'number') {
        setLiveCoinBalance(data.coin_balance)
        console.log('[EpisodePlayer] fetched coin_balance from DB:', data.coin_balance)
      }
    }

    fetchBalance()
  }, [authUser?.id])

  const handleEpisodeClick = useCallback(
    (episode: Episode) => {
      if (!episode.is_free && !unlockedEpisodes.has(episode.id)) {
        setPaywallEpisode(episode)
      }
    },
    [unlockedEpisodes]
  )

  const handleUnlockWithCoins = useCallback(async () => {
    if (!paywallEpisode) return
    if (!authUser) {
      router.push('/login?returnTo=/watch/forbidden-lesson')
      return
    }
    if (liveCoinBalance < 10) return

    // Optimistic UI update
    setUnlockedEpisodes((prev) => new Set([...prev, paywallEpisode.id]))
    setLiveCoinBalance((b) => b - 10)
    setPaywallEpisode(null)

    // Persist to DB via the unlock API route
    try {
      const res = await fetch('/api/episodes/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId: paywallEpisode.id }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[EpisodePlayer] unlock API error:', error)
        // Revert optimistic update on failure
        setUnlockedEpisodes((prev) => {
          const next = new Set(prev)
          next.delete(paywallEpisode.id)
          return next
        })
        setLiveCoinBalance((b) => b + 10)
      } else {
        console.log('[EpisodePlayer] episode unlocked and coins deducted in DB')
      }
    } catch (err) {
      console.error('[EpisodePlayer] unlock fetch failed:', err)
    }
  }, [paywallEpisode, authUser, liveCoinBalance, router])


  const handleSubscribe = useCallback(() => {
    if (!authUser) {
      router.push('/login?returnTo=/watch/forbidden-lesson')
      return
    }
    if (!paddle) {
      console.error('[Paddle] instance not initialized — checkout aborted')
      return
    }
    paddle.Checkout.open({
      items: [{ priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_100 ?? '', quantity: 1 }],
      customData: { user_id: authUser.id },
    })
  }, [paddle, authUser, router])

  const handleBuyCoins = useCallback((pkg: CoinPackage) => {
    const activePriceId =
      pkg.paddle_price_id ||
      process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_100 ||
      'pri_01m10azbe4dt3qzh22p7aepjg4'

    console.log('[Paddle] checkout triggered:', { activePriceId, paddle: !!paddle, userId: authUser?.id })

    if (!authUser) {
      console.warn('[Paddle] no auth session — redirecting to login')
      router.push('/login?returnTo=/watch/forbidden-lesson')
      return
    }

    if (!paddle) {
      console.error('[Paddle] instance not initialized — checkout aborted')
      return
    }

    paddle.Checkout.open({
      items: [{ priceId: activePriceId, quantity: 1 }],
      customData: { user_id: authUser.id },
    })
  }, [paddle, authUser, router])



  return (
    <>
      {/* Scroll container */}
      <div
        ref={containerRef}
        className="h-dvh overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {episodes.map((episode) => {
          const isLocked = !episode.is_free && !unlockedEpisodes.has(episode.id)

          return (
            <div
              key={episode.id}
              className="relative w-full h-dvh flex items-center justify-center bg-black"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Video or thumbnail */}
              {episode.video_url && !isLocked ? (
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(episode.id, el)
                    else videoRefs.current.delete(episode.id)
                  }}
                  src={episode.video_url}
                  className="w-full h-full object-cover"
                  loop
                  muted={muted}
                  playsInline
                  preload="metadata"
                />
              ) : (
                <>
                  {/* Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={episode.thumbnail_url}
                    alt={episode.title}
                    className={`w-full h-full object-cover ${
                      isLocked ? 'blur-lg scale-110 brightness-50' : ''
                    }`}
                  />

                  {/* Placeholder video ref for IntersectionObserver */}
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current.set(episode.id, el)
                      else videoRefs.current.delete(episode.id)
                    }}
                    className="hidden"
                  />
                </>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

              {/* Lock overlay for locked episodes */}
              {isLocked && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                  onClick={() => handleEpisodeClick(episode)}
                >
                  <div className="w-20 h-20 rounded-full bg-black/60 border border-yellow-400/50 flex items-center justify-center mb-4 backdrop-blur-sm">
                    <Lock className="w-9 h-9 text-yellow-400" />
                  </div>
                  <p className="text-white font-bold text-lg">Episode {episode.episode_number}</p>
                  <p className="text-gray-300 text-sm">Tap to unlock · 10 coins</p>
                </div>
              )}

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-end justify-between">
                  <div className="flex-1 mr-4">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-semibold mb-2">
                      {series.title}
                    </span>
                    <h3 className="text-white font-bold text-lg leading-tight">
                      {episode.episode_number}. {episode.title}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {Math.floor(episode.duration_seconds / 60)}m{' '}
                      {episode.duration_seconds % 60}s
                      {episode.is_free && (
                        <span className="ml-2 text-green-400 font-semibold">· Free</span>
                      )}
                    </p>
                  </div>

                  {/* Play/mute controls */}
                  {!isLocked && (
                    <div className="flex flex-col gap-3">
                      {episode.video_url && (
                        <button
                          onClick={() => setMuted((m) => !m)}
                          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                          {muted ? (
                            <VolumeX className="w-5 h-5 text-white" />
                          ) : (
                            <Volume2 className="w-5 h-5 text-white" />
                          )}
                        </button>
                      )}
                      {!episode.video_url && (
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Paywall modal */}
      {paywallEpisode && (
        <PaywallModal
          episodeNumber={paywallEpisode.episode_number}
          userCoinBalance={liveCoinBalance}
          onClose={() => setPaywallEpisode(null)}
          onUnlockWithCoins={handleUnlockWithCoins}
          onSubscribe={handleSubscribe}
          onBuyCoins={handleBuyCoins}
        />
      )}
    </>
  )
}
