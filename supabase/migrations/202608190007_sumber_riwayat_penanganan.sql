alter table public.imported_laporan_penanganan
  add column if not exists sumber_pembaruan text not null default 'manual',
  add column if not exists source_fingerprint text;

alter table public.imported_laporan_penanganan
  drop constraint if exists imported_penanganan_sumber_check;
alter table public.imported_laporan_penanganan
  add constraint imported_penanganan_sumber_check
  check (sumber_pembaruan in ('import', 'manual'));

create unique index if not exists imported_penanganan_source_fingerprint_idx
  on public.imported_laporan_penanganan(source_fingerprint)
  where source_fingerprint is not null;

comment on column public.imported_laporan_penanganan.sumber_pembaruan is
  'Asal riwayat penanganan: import dari Sheet sumber atau pembaruan manual petugas.';
