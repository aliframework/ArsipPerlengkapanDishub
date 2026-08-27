create table if not exists public.google_combined_recap_sheets (
  user_id uuid not null references public.profiles(id) on delete cascade,
  recap_type text not null check(recap_type in ('all','month','year')),
  period_key text not null,
  spreadsheet_id text not null,
  spreadsheet_url text not null,
  folder_id text,
  updated_at timestamptz not null default now(),
  primary key(user_id,recap_type,period_key)
);
alter table public.google_combined_recap_sheets enable row level security;
drop policy if exists "baca rekap periode sendiri" on public.google_combined_recap_sheets;
create policy "baca rekap periode sendiri" on public.google_combined_recap_sheets for select to authenticated using(user_id=auth.uid());
