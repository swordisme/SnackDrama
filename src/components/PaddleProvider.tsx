'use client'

import Script from 'next/script'
import { createContext, useContext, useRef, useState } from 'react'

// Minimal types for Paddle.js v2 CDN global
interface PaddleCheckoutOptions {
  items: { priceId: string; quantity: number }[]
  customData?: Record<string, string>
  settings?: Record<string, unknown>
}

interface PaddleInstance {
  Checkout: {
    open: (options: PaddleCheckoutOptions) => void
  }
}

const PaddleContext = createContext<PaddleInstance | null>(null)

export function usePaddle() {
  return useContext(PaddleContext)
}

export default function PaddleProvider({ children }: { children: React.ReactNode }) {
  const [paddle, setPaddle] = useState<PaddleInstance | null>(null)
  const initialized = useRef(false)

  function handlePaddleLoad() {
    if (initialized.current) return
    initialized.current = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    if (!win.Paddle) {
      console.error('Paddle.js failed to load from CDN')
      return
    }

    try {
      // Paddle.js v2: set sandbox environment BEFORE Initialize
      win.Paddle.Environment.set('sandbox')
      win.Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '',
        eventCallback: (event: { name: string }) => {
          console.log('[Paddle event]', event.name)
        },
      })
      console.log('[Paddle] Initialized in sandbox mode')
      setPaddle(win.Paddle as PaddleInstance)
    } catch (err) {
      console.error('[Paddle] Initialization error:', err)
    }
  }

  return (
    <PaddleContext.Provider value={paddle}>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={handlePaddleLoad}
        onError={() => console.error('[Paddle] Script failed to load')}
      />
      {children}
    </PaddleContext.Provider>
  )
}

