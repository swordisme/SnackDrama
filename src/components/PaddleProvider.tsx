'use client'

import Script from 'next/script'
import { createContext, useContext, useRef, useState } from 'react'

// Minimal type for the Paddle.js global (loaded via CDN)
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
    if (!win.Paddle) return

    win.Paddle.Environment.set('sandbox')
    win.Paddle.Initialize({
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '',
    })

    setPaddle(win.Paddle as PaddleInstance)
  }

  return (
    <PaddleContext.Provider value={paddle}>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={handlePaddleLoad}
      />
      {children}
    </PaddleContext.Provider>
  )
}
