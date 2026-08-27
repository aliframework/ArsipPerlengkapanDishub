-- Token OAuth hanya dikelola server dengan SUPABASE_SERVICE_ROLE_KEY.
create table public.google_oauth_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  scope text,
  updated_at timestamptz not null default now()
);
alter table public.google_oauth_tokens enable row level security;
-- Tidak ada policy: pengguna browser tidak dapat membaca token OAuth.
