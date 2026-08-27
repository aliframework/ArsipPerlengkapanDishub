alter table public.google_oauth_tokens add column if not exists connected_email text;

create table if not exists public.google_drive_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  folder_id text not null default 'root',
  folder_name text not null default 'Drive Saya',
  folder_url text,
  updated_at timestamptz not null default now()
);
alter table public.google_drive_settings enable row level security;
drop policy if exists "baca pengaturan drive sendiri" on public.google_drive_settings;
create policy "baca pengaturan drive sendiri" on public.google_drive_settings for select to authenticated using(user_id=auth.uid());
