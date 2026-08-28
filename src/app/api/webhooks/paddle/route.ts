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
// POST /api/webhooks/paddle
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  console.log('[Paddle Webhook] ▶ incoming request')

  // 1. Read raw body — MUST be done before any other body access
  let rawBody: string
  try {
    rawBody = await req.text()
    console.log('[Paddle Webhook] raw body length:', rawBody.length)
  } catch (err) {
    console.error('[Paddle Webhook] ✖ failed to read raw body:', err)
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  // 2. Pull signature and secret
  const signature = req.headers.get('paddle-signature') ?? ''
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET_KEY ?? ''

  console.log('[Paddle Webhook] signature header present:', !!signature)
  console.log('[Paddle Webhook] PADDLE_WEBHOOK_SECRET_KEY set:', !!webhookSecret)

  if (!signature) {
    console.error('[Paddle Webhook] ✖ missing paddle-signature header')
    return NextResponse.json({ error: 'Missing paddle-signature header' }, { status: 401 })
  }

  if (!webhookSecret) {
    console.error('[Paddle Webhook] ✖ PADDLE_WEBHOOK_SECRET_KEY env var not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // 3. Verify signature and unmarshal event
  let event: Awaited<ReturnType<typeof paddle.webhooks.unmarshal>>
  try {
    event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature)
    console.log('[Paddle Webhook] ✔ signature verified, eventType:', event?.eventType)
  } catch (err) {
    console.error('[Paddle Webhook] ✖ signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  if (!event) {
    console.error('[Paddle Webhook] ✖ unmarshal returned null/undefined')
    return NextResponse.json({ error: 'Failed to unmarshal event' }, { status: 400 })
  }

  // 4. Handle transaction.completed
  if (event.eventType === EventName.TransactionCompleted) {
    console.log('[Paddle Webhook] handling transaction.completed')
    const transaction = event.data

    // Read user_id injected via customData at checkout open()
    const customData = transaction.customData as { user_id?: string } | null
    const userId = customData?.user_id
    console.log('[Paddle Webhook] userId from customData:', userId)

    if (!userId) {
      console.error('[Paddle Webhook] ✖ missing user_id in custom_data')
      return NextResponse.json({ error: 'Missing user_id in custom_data' }, { status: 400 })
    }

    // Resolve coins from the first line item's price ID
    // Build map inline so env var is read at request time (not module load time)
    const priceCoins: Record<string, number> = {
      [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_100 ?? 'UNSET']: 100,
    }

    const priceId = transaction.items?.[0]?.price?.id ?? ''
    const coinsToCredit = priceCoins[priceId] ?? 0
    console.log('[Paddle Webhook] priceId:', priceId, '→ coinsToCredit:', coinsToCredit)

    if (coinsToCredit === 0) {
      console.log('[Paddle Webhook] unrecognised priceId — ignoring gracefully')
      return NextResponse.json({ received: true })
    }

    // 5. Supabase service client (uses SUPABASE_SERVICE_ROLE_KEY → bypasses RLS)
    let supabase: Awaited<ReturnType<typeof createServiceClient>>
    try {
      supabase = await createServiceClient()
      console.log('[Paddle Webhook] ✔ Supabase service client created')
    } catch (err) {
      console.error('[Paddle Webhook] ✖ failed to create Supabase service client:', err)
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // 6. Read current balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[Paddle Webhook] ✖ profile fetch error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    if (!profile) {
      console.error('[Paddle Webhook] ✖ no profile found for userId:', userId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const newBalance = (profile.coin_balance ?? 0) + coinsToCredit
    console.log('[Paddle Webhook] updating coin_balance:', profile.coin_balance, '→', newBalance)

    // 7. Credit coins
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ coin_balance: newBalance })
      .eq('id', userId)

    if (updateError) {
      console.error('[Paddle Webhook] ✖ failed to update coin_balance:', updateError)
      return NextResponse.json({ error: 'Failed to credit coins' }, { status: 500 })
    }

    // 8. Record transaction log
    const { error: txError } = await supabase.from('coin_transactions').insert({
      user_id: userId,
      amount: coinsToCredit,
      type: 'purchase',
      description: `Purchased ${coinsToCredit} coins via Paddle (tx: ${transaction.id})`,
    })

    if (txError) {
      // Non-fatal — coins already credited; log but don't fail the webhook
      console.warn('[Paddle Webhook] ⚠ coin_transactions insert failed (non-fatal):', txError)
    }

    console.log('[Paddle Webhook] ✔ credited', coinsToCredit, 'coins to user', userId)
  } else {
    console.log('[Paddle Webhook] unhandled eventType:', event.eventType, '— ignoring')
  }

  return NextResponse.json({ received: true })
}
