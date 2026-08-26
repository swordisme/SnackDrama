import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature') ?? ''
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ?? ''

  // Verify signature
  const hmac = crypto.createHmac('sha256', secret)
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8')
  const signatureBuffer = Buffer.from(signature, 'utf8')

  if (
    digest.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(digest, signatureBuffer)
  ) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const eventName = payload?.meta?.event_name

  if (eventName === 'order_created') {
    const variantId = String(payload?.data?.attributes?.first_order_item?.variant_id ?? '')
    const userEmail = payload?.data?.attributes?.user_email as string

    if (!userEmail) {
      return NextResponse.json({ error: 'No user email' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Find user by email
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, coin_balance')
      .eq('email', userEmail)
      .single()

    if (!profileData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Coin package variant IDs (update these with real Lemon Squeezy variant IDs)
    const COIN_VARIANTS: Record<string, number> = {
      variant_50: 50,
      variant_150: 150,
      variant_500: 500,
    }

    const coins = COIN_VARIANTS[variantId]

    if (coins) {
      // Add coins to user balance
      await supabase
        .from('profiles')
        .update({ coin_balance: (profileData.coin_balance ?? 0) + coins })
        .eq('id', profileData.id)

      // Record transaction
      await supabase.from('coin_transactions').insert({
        user_id: profileData.id,
        amount: coins,
        type: 'purchase',
        description: `Purchased ${coins} coins`,
      })
    } else {
      // Subscription variant — activate subscription
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await supabase
        .from('profiles')
        .update({
          subscription_active: true,
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', profileData.id)
    }
  }

  return NextResponse.json({ success: true })
}
