import { MOCK_SERIES, MOCK_EPISODES } from '@/lib/mock-data'
import EpisodePlayer from '@/components/EpisodePlayer'
import Header from '@/components/Header'

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

  return (
    <div className="bg-black min-h-screen">
      <Header user={null} />
      <EpisodePlayer series={series} episodes={episodes} user={null} />
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
