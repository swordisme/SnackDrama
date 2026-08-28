import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verify user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Accept flexible param names from different callers
  const body = await req.json()
  const episodeId: string = body.episodeId || body.episode_id || body.id
  const seriesId: string  = body.seriesId  || body.series_id  || body.seriesSlug || body.slug || ''
  const coinCost: number  = body.coinCost  || body.coins      || body.cost       || 10

  if (!episodeId) {
    return NextResponse.json({ error: 'Missing episodeId' }, { status: 400 })
  }

  // Use service client for privileged DB operations (bypasses RLS)
  const serviceSupabase = await createServiceClient()

  // Get current coin balance
  const { data: profile, error: profileError } = await serviceSupabase
    .from('profiles')
    .select('coin_balance')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[unlock] profile fetch error:', JSON.stringify(profileError))
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.coin_balance < coinCost) {
    return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 })
  }

  const newBalance = profile.coin_balance - coinCost

  // Deduct coins
  const { error: updateError } = await serviceSupabase
    .from('profiles')
    .update({ coin_balance: newBalance })
    .eq('id', user.id)

  if (updateError) {
    console.error('[unlock] coin deduction error:', JSON.stringify(updateError))
    return NextResponse.json({ error: 'Failed to deduct coins' }, { status: 500 })
  }

  // Record spend transaction
  await serviceSupabase.from('coin_transactions').insert({
    user_id: user.id,
    amount: -coinCost,
    type: 'spend',
    description: `Unlocked episode ${episodeId}${seriesId ? ` (series: ${seriesId})` : ''}`,
  })

  // Record unlock
  await serviceSupabase.from('unlocked_episodes').insert({
    user_id: user.id,
    episode_id: episodeId,
  })

  return NextResponse.json({ success: true, newBalance })
}
