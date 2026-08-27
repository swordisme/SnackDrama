export interface Episode {
  id: string
  series_id: string
  title: string
  episode_number: number
  video_url: string
  thumbnail_url: string
  is_free: boolean
  duration_seconds: number
}

export interface Series {
  id: string
  title: string
  slug: string
  description: string
  thumbnail_url: string
  total_episodes: number
}

export interface UserProfile {
  id: string
  email: string
  coin_balance: number
  subscription_active: boolean
  subscription_expires_at: string | null
}

export interface CoinPackage {
  id: string
  name: string
  coins: number
  price_usd: number
  paddle_price_id: string
}
