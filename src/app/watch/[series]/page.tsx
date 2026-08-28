import { MOCK_SERIES, MOCK_EPISODES } from '@/lib/mock-data'
import EpisodePlayer from '@/components/EpisodePlayer'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types'

// Never serve a cached version — always read fresh session cookies
export const dynamic = 'force-dynamic'

interface WatchPageProps {
  params: Promise<{ series: string }>
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { series: seriesSlug } = await params

  // In production, fetch from Supabase based on seriesSlug
  const series = MOCK_SERIES
  const episodes = MOCK_EPISODES

  if (!series) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Series not found
      </div>
    )
  }

  // Fetch authenticated user profile from Supabase
  let userProfile: UserProfile | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, coin_balance, subscription_active, subscription_expires_at')
        .eq('id', user.id)
        .maybeSingle()
      userProfile = profile ?? null
    }
  } catch {
    // No session or profiles table not yet set up — continue as guest
  }

  return (
    <div className="bg-black min-h-screen">
      <Header user={userProfile} />
      <EpisodePlayer series={series} episodes={episodes} user={userProfile} />
    </div>
  )
}

export async function generateMetadata({ params }: WatchPageProps) {
  const { series: seriesSlug } = await params
  return {
    title: `Watch ${MOCK_SERIES.title} | SnackDrama`,
    description: MOCK_SERIES.description,
  }
}
