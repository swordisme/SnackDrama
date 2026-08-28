'use client'

import Script from 'next/script'
import { createContext, useContext, useRef, useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

// Paddle.js v2 event shape (subset we care about)
interface PaddleEvent {
  name: string
  data?: {
    transaction_id?: string
    status?: string
  }
}

interface PaddleContextValue {
  paddle: PaddleInstance | null
  /** Register a callback that fires when checkout.completed fires in Paddle.js */
  onCheckoutComplete: (cb: () => void) => () => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const PaddleContext = createContext<PaddleContextValue>({
  paddle: null,
  onCheckoutComplete: () => () => {},
})

export function usePaddle() {
  return useContext(PaddleContext)
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export default function PaddleProvider({ children }: { children: React.ReactNode }) {
  const [paddle, setPaddle] = useState<PaddleInstance | null>(null)
  const initialized = useRef(false)
  // Set of listeners to call on checkout.completed
  const checkoutListeners = useRef<Set<() => void>>(new Set())

  const onCheckoutComplete = useCallback((cb: () => void) => {
    checkoutListeners.current.add(cb)
    return () => checkoutListeners.current.delete(cb)
  }, [])

  function handlePaddleLoad() {
    if (initialized.current) return
    initialized.current = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    if (!win.Paddle) {
      console.error('[Paddle] Paddle.js failed to load from CDN')
      return
    }

    try {
      // Paddle.js v2: set sandbox environment BEFORE Initialize
      win.Paddle.Environment.set('sandbox')
      win.Paddle.Initialize({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '',
        eventCallback: (event: PaddleEvent) => {
          console.log('[Paddle event]', event.name, event.data)

          // checkout.completed fires in the browser when payment succeeds
          if (event.name === 'checkout.completed') {
            console.log('[Paddle] checkout.completed - notifying listeners')
            checkoutListeners.current.forEach((cb) => cb())
          }
        },
      })
      console.log('[Paddle] Initialized in sandbox mode')
      setPaddle(win.Paddle as PaddleInstance)
    } catch (err) {
      console.error('[Paddle] Initialization error:', err)
    }
  }

  return (
    <PaddleContext.Provider value={{ paddle, onCheckoutComplete }}>
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
