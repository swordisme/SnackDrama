import { NextRequest, NextResponse } from 'next/server'
import { Paddle, Environment, EventName } from '@paddle/paddle-node-sdk'
import { createServiceClient } from '@/lib/supabase/server'

const paddle = new Paddle(process.env.PADDLE_API_KEY ?? '', {
  environment: process.env.NEXT_PUBLIC_PADDLE_ENV === 'production'
    ? Environment.production
    : Environment.sandbox,
})

// Coins awarded per price ID
const PRICE_COINS: Record<string, number> = {
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_100 ?? '']: 100,
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('paddle-signature') ?? ''
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET_KEY ?? ''

  // Verify signature and parse event
  let event
  try {
    event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  if (!event) {
    return NextResponse.json({ error: 'Failed to unmarshal event' }, { status: 400 })
  }

  if (event.eventType === EventName.TransactionCompleted) {
    const transaction = event.data

    // Read user_id from custom_data passed at checkout open()
    const customData = transaction.customData as { user_id?: string } | null
    const userId = customData?.user_id

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id in custom_data' }, { status: 400 })
    }

    // Work out how many coins to credit from the first line item price
    const priceId = transaction.items?.[0]?.price?.id ?? ''
    const coinsToCredit = PRICE_COINS[priceId] ?? 0

    if (coinsToCredit === 0) {
      // Unknown price — could be a subscription; ignore gracefully
      return NextResponse.json({ received: true })
    }

    const supabase = await createServiceClient()

    // Get current balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Credit coins
    await supabase
      .from('profiles')
      .update({ coin_balance: (profile.coin_balance ?? 0) + coinsToCredit })
      .eq('id', userId)

    // Record transaction
    await supabase.from('coin_transactions').insert({
      user_id: userId,
      amount: coinsToCredit,
      type: 'purchase',
      description: `Purchased ${coinsToCredit} coins via Paddle (tx: ${transaction.id})`,
    })
  }

  return NextResponse.json({ received: true })
}
