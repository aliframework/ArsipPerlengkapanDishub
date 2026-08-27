alter table public.laporan_kerusakan
  add column if not exists waktu_laporan timestamptz,
  add column if not exists jenis_rambu text,
  add column if not exists asal_data text not null default 'manual';

update public.laporan_kerusakan set waktu_laporan=created_at where waktu_laporan is null;

create table if not exists public.laporan_penanganan (
  id uuid primary key default gen_random_uuid(),
  laporan_id uuid not null references public.laporan_kerusakan(id) on delete cascade,
  status text not null,
  waktu_penanganan timestamptz,
  petugas_menangani text,
  dokumentasi_urls text[] not null default '{}',
  catatan text,
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists laporan_penanganan_laporan_idx on public.laporan_penanganan(laporan_id,created_at desc);
alter table public.laporan_penanganan enable row level security;
drop policy if exists "baca penanganan laporan" on public.laporan_penanganan;
create policy "baca penanganan laporan" on public.laporan_penanganan for select to authenticated using (true);

drop function if exists public.buat_laporan_kerusakan(text,text,text,text,text,text,uuid,uuid,uuid,text,text[],text);
create or replace function public.buat_laporan_kerusakan(
  p_sumber text,p_pelapor text,p_wa text,p_nama_petugas text,p_nip text,p_jalan text,
  p_kecamatan_id uuid,p_kelurahan_id uuid,p_jenis_id uuid,p_tingkat text,p_foto text[],p_deskripsi text,
  p_waktu_laporan timestamptz,p_jenis_rambu text,p_status text,p_waktu_penanganan timestamptz,
  p_petugas_menangani text,p_dokumentasi_penanganan text[],p_catatan_penanganan text
) returns public.laporan_kerusakan language plpgsql security definer set search_path=public as $$
declare v_kecamatan text;v_kelurahan text;v_jenis text;v_nomor text;v_report public.laporan_kerusakan;v_waktu timestamptz:=coalesce(p_waktu_laporan,now());
begin
 if auth.uid() is null then raise exception 'Tidak terautentikasi'; end if;
 select nama into v_kecamatan from ref_kecamatan where id=p_kecamatan_id;
 select nama into v_kelurahan from ref_kelurahan where id=p_kelurahan_id and kecamatan_id=p_kecamatan_id;
 select nama into v_jenis from ref_jenis_perlengkapan where id=p_jenis_id and aktif=true;
 if v_kecamatan is null or v_kelurahan is null or v_jenis is null then raise exception 'Referensi tidak valid'; end if;
 perform pg_advisory_xact_lock(hashtext(to_char(v_waktu,'YYYY-MM')));
 select 'DISHUB-MADIUN-'||to_char(v_waktu,'YYYY-MM')||'-'||lpad((count(*)+1)::text,3,'0') into v_nomor
 from laporan_kerusakan where coalesce(waktu_laporan,created_at)>=date_trunc('month',v_waktu) and coalesce(waktu_laporan,created_at)<date_trunc('month',v_waktu)+interval '1 month';
 insert into laporan_kerusakan(nomor_laporan,sumber_laporan,nama_pelapor,no_wa_pelapor,admin_id,nama_petugas_input,nip_petugas_input,nama_jalan,kecamatan,kelurahan,jenis_perlengkapan,tingkat_kerusakan,foto_paths,deskripsi,status,waktu_laporan,jenis_rambu,asal_data)
 values(v_nomor,p_sumber,p_pelapor,p_wa,auth.uid(),p_nama_petugas,p_nip,p_jalan,v_kecamatan,v_kelurahan,v_jenis,p_tingkat,p_foto,p_deskripsi,coalesce(nullif(p_status,''),'Belum Ditangani'),v_waktu,nullif(p_jenis_rambu,''),'manual') returning * into v_report;
 if p_waktu_penanganan is not null or nullif(p_petugas_menangani,'') is not null or cardinality(coalesce(p_dokumentasi_penanganan,'{}'))>0 or nullif(p_catatan_penanganan,'') is not null or coalesce(nullif(p_status,''),'Belum Ditangani')<>'Belum Ditangani' then
   insert into laporan_penanganan(laporan_id,status,waktu_penanganan,petugas_menangani,dokumentasi_urls,catatan,updated_by)
   values(v_report.id,coalesce(nullif(p_status,''),'Belum Ditangani'),p_waktu_penanganan,nullif(p_petugas_menangani,''),coalesce(p_dokumentasi_penanganan,'{}'),nullif(p_catatan_penanganan,''),auth.uid());
 end if;
 return v_report;
end $$;
revoke all on function public.buat_laporan_kerusakan(text,text,text,text,text,text,uuid,uuid,uuid,text,text[],text,timestamptz,text,text,timestamptz,text,text[],text) from public;
grant execute on function public.buat_laporan_kerusakan(text,text,text,text,text,text,uuid,uuid,uuid,text,text[],text,timestamptz,text,text,timestamptz,text,text[],text) to authenticated;
