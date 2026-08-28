import { NextRequest, NextResponse } from 'next/server'
import { Paddle, Environment, EventName } from '@paddle/paddle-node-sdk'
import { createServiceClient } from '@/lib/supabase/server'

// Disable Next.js body parsing so req.text() returns the raw bytes
// required for Paddle signature verification
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Paddle SDK — initialised once per cold start
// ---------------------------------------------------------------------------
const paddle = new Paddle(process.env.PADDLE_API_KEY ?? '', {
  environment:
    process.env.NEXT_PUBLIC_PADDLE_ENV === 'production'
      ? Environment.production
      : Environment.sandbox,
})

// ---------------------------------------------------------------------------
// Shared helper — credit coins for a completed/paid transaction
// ---------------------------------------------------------------------------
async function creditCoins(transaction: {
  id: string
  customData: unknown
  items?: { price?: { id?: string } }[]
}): Promise<NextResponse | null> {
  const customData = transaction.customData as { user_id?: string } | null
  const userId = customData?.user_id
  console.log('[Paddle Webhook] userId from customData:', userId)

  if (!userId) {
    console.error('[Paddle Webhook] ✖ missing user_id in custom_data')
    return NextResponse.json({ error: 'Missing user_id in custom_data' }, { status: 400 })
  }

  // Build price->coins map at request time so env var is always current
  const priceCoins: Record<string, number> = {
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_100 ?? 'UNSET']: 100,
  }

  const priceId = transaction.items?.[0]?.price?.id ?? ''
  const coinsToCredit = priceCoins[priceId] ?? 0
  console.log('[Paddle Webhook] priceId:', priceId, 'coinsToCredit:', coinsToCredit)

  if (coinsToCredit === 0) {
    console.log('[Paddle Webhook] unrecognised priceId — ignoring gracefully')
    return NextResponse.json({ received: true })
  }

  // Supabase service client (SUPABASE_SERVICE_ROLE_KEY -> bypasses RLS)
  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
    console.log('[Paddle Webhook] Supabase service client created')
  } catch (err) {
    console.error('[Paddle Webhook] failed to create Supabase service client:', err)
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
  }

  // Read current balance (null if row missing - first-time buyer)
  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('coin_balance')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    console.error('[Paddle Webhook] profile fetch error:', JSON.stringify(profileError))
    console.error('[Paddle Webhook] profile fetch details:', profileError.message, profileError.code, profileError.details)
    return NextResponse.json({ error: 'Failed to fetch user profile', details: profileError.message }, { status: 500 })
  }

  const newBalance = (currentProfile?.coin_balance ?? 0) + coinsToCredit
  console.log('[Paddle Webhook] coin_balance:', currentProfile?.coin_balance ?? 'NEW ROW', '->', newBalance)

  // Upsert with onConflict:'id' - creates row if missing, updates if present
  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        coin_balance: newBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

  if (upsertError) {
    console.error('[Paddle Webhook] failed to upsert coin_balance:', JSON.stringify(upsertError))
    console.error('[Paddle Webhook] upsert details:', upsertError.message, upsertError.code, upsertError.details)
    return NextResponse.json({ error: 'Failed to credit coins', details: upsertError.message }, { status: 500 })
  }

  // Record transaction log (non-fatal)
  const { error: txError } = await supabase.from('coin_transactions').insert({
    user_id: userId,
    amount: coinsToCredit,
    type: 'purchase',
    description: `Purchased ${coinsToCredit} coins via Paddle (tx: ${transaction.id})`,
  })

  if (txError) {
    console.warn('[Paddle Webhook] coin_transactions insert failed (non-fatal):', JSON.stringify(txError))
  }

  console.log('[Paddle Webhook] credited', coinsToCredit, 'coins to user', userId)
  return null // success - caller returns { received: true }
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/paddle
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  console.log('[Paddle Webhook] incoming request')

  // 1. Read raw body - MUST be done before any other body access
  let rawBody: string
  try {
    rawBody = await req.text()
    console.log('[Paddle Webhook] raw body length:', rawBody.length)
  } catch (err) {
    console.error('[Paddle Webhook] failed to read raw body:', err)
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  // 2. Signature + secret
  const signature = req.headers.get('paddle-signature') ?? ''
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET_KEY ?? ''

  console.log('[Paddle Webhook] paddle-signature present:', !!signature)
  console.log('[Paddle Webhook] PADDLE_WEBHOOK_SECRET_KEY set:', !!webhookSecret)

  if (!signature) {
    console.error('[Paddle Webhook] missing paddle-signature header')
    return NextResponse.json({ error: 'Missing paddle-signature header' }, { status: 401 })
  }

  if (!webhookSecret) {
    console.error('[Paddle Webhook] PADDLE_WEBHOOK_SECRET_KEY env var not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // 3. Verify signature and unmarshal event
  let event: Awaited<ReturnType<typeof paddle.webhooks.unmarshal>>
  try {
    event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature)
    console.log('[Paddle Webhook] signature verified, eventType:', event?.eventType)
  } catch (err) {
    console.error('[Paddle Webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  if (!event) {
    console.error('[Paddle Webhook] unmarshal returned null/undefined')
    return NextResponse.json({ error: 'Failed to unmarshal event' }, { status: 400 })
  }

  // 4. Handle transaction.completed AND transaction.paid
  //    Paddle sandbox may fire either depending on payment method configuration
  if (
    event.eventType === EventName.TransactionCompleted ||
    event.eventType === EventName.TransactionPaid
  ) {
    console.log('[Paddle Webhook] handling', event.eventType)
    const earlyResponse = await creditCoins(event.data as Parameters<typeof creditCoins>[0])
    if (earlyResponse) return earlyResponse
  } else {
    console.log('[Paddle Webhook] unhandled eventType:', event.eventType, '- ignoring')
  }

  return NextResponse.json({ received: true })
}
