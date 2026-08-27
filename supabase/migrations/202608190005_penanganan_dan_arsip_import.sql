alter table public.imported_laporan_kerusakan add column if not exists status_sumber text;
update public.imported_laporan_kerusakan set status_sumber=status where status_sumber is null;

create table public.imported_laporan_penanganan (
  id uuid primary key default gen_random_uuid(),
  laporan_import_id uuid not null references public.imported_laporan_kerusakan(id) on delete cascade,
  status text not null,
  waktu_penanganan timestamptz,
  petugas_menangani text,
  dokumentasi_urls text[] not null default '{}',
  catatan text,
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index imported_penanganan_laporan_idx on public.imported_laporan_penanganan(laporan_import_id, created_at desc);
alter table public.imported_laporan_penanganan enable row level security;
create policy "baca riwayat penanganan impor" on public.imported_laporan_penanganan for select to authenticated using (true);

create table public.google_sheet_import_sessions (
  id uuid primary key default gen_random_uuid(),
  spreadsheet_id text not null,
  spreadsheet_url text not null,
  spreadsheet_title text,
  drive_folder_url text,
  imported_by uuid not null references public.profiles(id),
  imported_at timestamptz not null default now(),
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  failed_rows integer not null default 0
);
alter table public.google_sheet_import_sessions enable row level security;
create policy "baca sesi impor" on public.google_sheet_import_sessions for select to authenticated using (true);
