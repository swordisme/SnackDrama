-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  coin_balance integer not null default 0,
  subscription_active boolean not null default false,
  subscription_expires_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Series table
create table if not exists public.series (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text not null unique,
  description text,
  thumbnail_url text,
  created_at timestamp with time zone default now() not null
);

-- Episodes table
create table if not exists public.episodes (
  id uuid default uuid_generate_v4() primary key,
  series_id uuid references public.series(id) on delete cascade not null,
  title text not null,
  episode_number integer not null,
  video_url text,
  thumbnail_url text,
  is_free boolean not null default false,
  duration_seconds integer not null default 0,
  created_at timestamp with time zone default now() not null
);

-- Coin transactions table
create table if not exists public.coin_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('purchase', 'spend')),
  description text,
  created_at timestamp with time zone default now() not null
);

-- Unlocked episodes table
create table if not exists public.unlocked_episodes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  episode_id uuid references public.episodes(id) on delete cascade not null,
  unlocked_at timestamp with time zone default now() not null,
  unique(user_id, episode_id)
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.series enable row level security;
alter table public.episodes enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.unlocked_episodes enable row level security;

-- Profiles: users can only see/edit their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Series: anyone can view
create policy "Anyone can view series"
  on public.series for select
  to anon, authenticated
  using (true);

-- Episodes: anyone can view
create policy "Anyone can view episodes"
  on public.episodes for select
  to anon, authenticated
  using (true);

-- Coin transactions: users can only see their own
create policy "Users can view own transactions"
  on public.coin_transactions for select
  using (auth.uid() = user_id);

-- Unlocked episodes: users can only see their own
create policy "Users can view own unlocked episodes"
  on public.unlocked_episodes for select
  using (auth.uid() = user_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: auto-create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
