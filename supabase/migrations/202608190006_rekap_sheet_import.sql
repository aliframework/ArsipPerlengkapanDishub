create table public.google_import_recap_sheets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  spreadsheet_id text not null,
  spreadsheet_url text not null,
  updated_at timestamptz not null default now()
);
alter table public.google_import_recap_sheets enable row level security;
create policy "baca rekap sheet sendiri" on public.google_import_recap_sheets for select to authenticated using (user_id=auth.uid());
