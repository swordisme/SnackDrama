import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verify user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { episodeId, seriesId } = await req.json() as { episodeId: string; seriesId: string }

  if (!episodeId || !seriesId) {
    return NextResponse.json({ error: 'Missing episodeId or seriesId' }, { status: 400 })
  }

  // Use service client for privileged operations
  const serviceSupabase = await createServiceClient()

  // Get user profile with coin balance
  const { data: profile } = await serviceSupabase
    .from('profiles')
    .select('coin_balance')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.coin_balance < 10) {
    return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 })
  }

  const newBalance = profile.coin_balance - 10

  // Deduct coins
  await serviceSupabase
    .from('profiles')
    .update({ coin_balance: newBalance })
    .eq('id', user.id)

  // Record transaction
  await serviceSupabase.from('coin_transactions').insert({
    user_id: user.id,
    amount: -10,
    type: 'spend',
    description: `Unlocked episode ${episodeId}`,
  })

  // Record unlock
  await serviceSupabase.from('unlocked_episodes').insert({
    user_id: user.id,
    episode_id: episodeId,
  })

  return NextResponse.json({ success: true, newBalance })
}
