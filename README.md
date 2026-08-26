# SnackDrama 🎬

A paywall-gated vertical video player platform — like TikTok/Reels but for short-form drama series. Users watch free episodes and unlock premium content with coins or a subscription.

## Features

- 📱 TikTok-style vertical scroll video player
- 🔐 Supabase Auth (email + OAuth)
- 🪙 Coin-based episode unlocks (10 coins per episode)
- 💳 Lemon Squeezy payments (coin packages + subscriptions)
- 🎭 Paywall modal with multiple unlock options
- 🌑 Dark theme with purple/gold accents

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **Payments**: Lemon Squeezy
- **Language**: TypeScript

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd snackdrama
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `LEMON_SQUEEZY_API_KEY` | Lemon Squeezy API key |
| `LEMON_SQUEEZY_STORE_ID` | Your Lemon Squeezy store ID |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g., https://yourapp.vercel.app) |

### 3. Supabase setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Enable Email Auth under **Authentication → Providers**

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Adding Real Video URLs

The app uses mock data in `src/lib/mock-data.ts`. To add real videos:

1. Open `src/lib/mock-data.ts`
2. Find the `MOCK_EPISODES` array
3. Update the `video_url` field for each episode:

```typescript
// Change this:
video_url: '',

// To this (use any direct video URL or Supabase Storage URL):
video_url: 'https://your-storage.supabase.co/storage/v1/object/public/videos/ep1.mp4',
```

**Recommended**: Upload videos to Supabase Storage and use the public URLs.

## Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Add all environment variables from `.env.local` in the Vercel dashboard
4. Deploy!

Vercel will auto-detect Next.js and configure everything.

### Lemon Squeezy Webhook

After deploying, set your webhook URL in Lemon Squeezy:
- URL: `https://your-app.vercel.app/api/webhooks/lemon-squeezy`
- Events: `order_created`
- Copy the signing secret → `LEMON_SQUEEZY_WEBHOOK_SECRET`

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Login page
│   ├── watch/[series]/       # Video player
│   ├── auth/callback/        # OAuth callback
│   └── api/
│       ├── webhooks/         # Lemon Squeezy webhooks
│       └── episodes/unlock/  # Coin unlock endpoint
├── components/
│   ├── EpisodePlayer.tsx     # TikTok-style player
│   ├── PaywallModal.tsx      # Unlock modal
│   └── Header.tsx            # Navigation
├── lib/
│   ├── supabase/             # Supabase clients
│   └── mock-data.ts          # Mock episode data
└── types/
    └── index.ts              # TypeScript types
supabase/
└── schema.sql               # Database schema + RLS
```

## License

MIT
