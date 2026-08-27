create table public.imported_laporan_kerusakan (
  id uuid primary key default gen_random_uuid(),
  nomor_import text unique not null,
  external_submission_id text unique not null,
  source_submission_time timestamptz,
  waktu_laporan timestamptz not null,
  imported_at timestamptz not null default now(),
  imported_by uuid not null references public.profiles(id),
  sumber_laporan text not null,
  nama_pelapor text not null,
  no_wa_pelapor text,
  nama_petugas_input text not null,
  nip_petugas_input text not null,
  nama_jalan text not null,
  kecamatan text not null,
  kelurahan text not null,
  jenis_perlengkapan text not null,
  tingkat_kerusakan text not null,
  deskripsi text not null,
  status text not null default 'Belum Ditangani',
  import_metadata jsonb not null default '{}'::jsonb
);
create index imported_laporan_waktu_idx on public.imported_laporan_kerusakan(waktu_laporan desc);
alter table public.imported_laporan_kerusakan enable row level security;
create policy "baca arsip impor" on public.imported_laporan_kerusakan for select to authenticated using (true);
