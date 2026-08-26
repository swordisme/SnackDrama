import { Episode, Series } from '@/types'

export const MOCK_SERIES: Series = {
  id: 'series-001',
  title: 'Forbidden Lesson',
  slug: 'forbidden-lesson',
  description:
    'She taught him everything. Except how to forget her. A story of forbidden love between a tutor and her student.',
  thumbnail_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
  total_episodes: 15,
}

export const MOCK_EPISODES: Episode[] = Array.from({ length: 15 }, (_, i) => ({
  id: `ep-${String(i + 1).padStart(3, '0')}`,
  series_id: 'series-001',
  title: getEpisodeTitle(i + 1),
  episode_number: i + 1,
  video_url: '',
  thumbnail_url: `https://picsum.photos/seed/${i + 100}/450/800`,
  is_free: i < 5,
  duration_seconds: 60 + Math.floor(Math.random() * 120),
}))

function getEpisodeTitle(n: number): string {
  const titles: Record<number, string> = {
    1: 'First Meeting',
    2: 'The Study Session',
    3: 'Late Nights',
    4: 'Almost Caught',
    5: 'Feelings Denied',
    6: 'The Confession',
    7: 'Stolen Moments',
    8: 'Breaking Rules',
    9: 'Jealousy',
    10: 'The Promise',
    11: 'Torn Apart',
    12: 'Fighting for Us',
    13: 'Secrets Revealed',
    14: 'The Decision',
    15: 'Forever After',
  }
  return titles[n] ?? `Episode ${n}`
}

export const COIN_PACKAGES = [
  { id: 'pkg-50', name: 'Starter Pack', coins: 50, price_usd: 4.99, lemon_squeezy_variant_id: 'variant_50' },
  { id: 'pkg-150', name: 'Popular Pack', coins: 150, price_usd: 9.99, lemon_squeezy_variant_id: 'variant_150' },
  { id: 'pkg-500', name: 'Mega Pack', coins: 500, price_usd: 24.99, lemon_squeezy_variant_id: 'variant_500' },
]
