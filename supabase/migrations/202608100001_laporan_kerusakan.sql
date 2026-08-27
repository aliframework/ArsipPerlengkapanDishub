create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, nama text not null default '', nip text not null default '', created_at timestamptz not null default now());
create table public.ref_kecamatan (id uuid primary key default gen_random_uuid(), nama text unique not null, created_at timestamptz not null default now());
create table public.ref_kelurahan (id uuid primary key default gen_random_uuid(), kecamatan_id uuid not null references public.ref_kecamatan(id) on delete restrict, nama text not null, unique(kecamatan_id,nama));
create table public.ref_jenis_perlengkapan (id uuid primary key default gen_random_uuid(), nama text unique not null, aktif boolean not null default true);
create table public.laporan_kerusakan (id uuid primary key default gen_random_uuid(), nomor_laporan text unique not null, created_at timestamptz not null default now(), sumber_laporan text not null, nama_pelapor text not null, no_wa_pelapor text, admin_id uuid not null references public.profiles(id), nama_petugas_input text not null, nip_petugas_input text not null, nama_jalan text not null, kecamatan text not null, kelurahan text not null, jenis_perlengkapan text not null, tingkat_kerusakan text not null check (tingkat_kerusakan in ('Ringan','Sedang','Berat','Darurat')), foto_paths text[], deskripsi text not null, status text not null default 'Belum Ditangani');
create index laporan_created_idx on public.laporan_kerusakan(created_at desc);
create or replace function public.buat_laporan_kerusakan(p_sumber text,p_pelapor text,p_wa text,p_nama_petugas text,p_nip text,p_jalan text,p_kecamatan_id uuid,p_kelurahan_id uuid,p_jenis_id uuid,p_tingkat text,p_foto text[],p_deskripsi text) returns public.laporan_kerusakan language plpgsql security definer set search_path=public as $$
declare v_kecamatan text; v_kelurahan text; v_jenis text; v_nomor text; v_report public.laporan_kerusakan;
begin
 if auth.uid() is null then raise exception 'Tidak terautentikasi'; end if;
 select nama into v_kecamatan from ref_kecamatan where id=p_kecamatan_id; select nama into v_kelurahan from ref_kelurahan where id=p_kelurahan_id and kecamatan_id=p_kecamatan_id; select nama into v_jenis from ref_jenis_perlengkapan where id=p_jenis_id and aktif=true;
 if v_kecamatan is null or v_kelurahan is null or v_jenis is null then raise exception 'Referensi tidak valid'; end if;
 perform pg_advisory_xact_lock(hashtext(to_char(now(),'YYYY-MM')));
 select 'DISHUB-MADIUN-'||to_char(now(),'YYYY-MM')||'-'||lpad((count(*)+1)::text,3,'0') into v_nomor from laporan_kerusakan where created_at >= date_trunc('month',now()) and created_at < date_trunc('month',now()) + interval '1 month';
 insert into laporan_kerusakan(nomor_laporan,sumber_laporan,nama_pelapor,no_wa_pelapor,admin_id,nama_petugas_input,nip_petugas_input,nama_jalan,kecamatan,kelurahan,jenis_perlengkapan,tingkat_kerusakan,foto_paths,deskripsi) values(v_nomor,p_sumber,p_pelapor,p_wa,auth.uid(),p_nama_petugas,p_nip,p_jalan,v_kecamatan,v_kelurahan,v_jenis,p_tingkat,p_foto,p_deskripsi) returning * into v_report; return v_report;
end $$;
revoke all on function public.buat_laporan_kerusakan(text,text,text,text,text,text,uuid,uuid,uuid,text,text[],text) from public;
grant execute on function public.buat_laporan_kerusakan(text,text,text,text,text,text,uuid,uuid,uuid,text,text[],text) to authenticated;
create or replace function public.buat_profile_baru() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,nama,nip) values(new.id,coalesce(new.raw_user_meta_data->>'nama',''),coalesce(new.raw_user_meta_data->>'nip','')) on conflict do nothing; return new; end $$;
create trigger auth_user_profile after insert on auth.users for each row execute procedure public.buat_profile_baru();
insert into public.ref_kecamatan(nama) values ('Manguharjo'),('Taman'),('Kartoharjo');
-- TODO: isi ref_kelurahan setelah diverifikasi terhadap sumber resmi Pemkot Madiun/BPS.
insert into public.ref_jenis_perlengkapan(nama) values ('Rambu Lalu Lintas'),('Marka Jalan'),('APILL'),('PJU'),('Guardrail / Pagar Pengaman'),('Cermin Tikungan'),('Zebra Cross'),('Halte'),('JPO'),('CCTV / ATCS'),('Delineator / Traffic Cone'),('Lainnya');
alter table public.profiles enable row level security; alter table public.ref_kecamatan enable row level security; alter table public.ref_kelurahan enable row level security; alter table public.ref_jenis_perlengkapan enable row level security; alter table public.laporan_kerusakan enable row level security;
create policy "profile sendiri" on public.profiles for select to authenticated using (id=auth.uid());
create policy "baca kecamatan" on public.ref_kecamatan for select to authenticated using (true);
create policy "baca kelurahan" on public.ref_kelurahan for select to authenticated using (true);
create policy "baca jenis" on public.ref_jenis_perlengkapan for select to authenticated using (true);
create policy "baca laporan" on public.laporan_kerusakan for select to authenticated using (true);
create policy "upload foto sendiri" on storage.objects for insert to authenticated with check (bucket_id='laporan-foto' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "baca foto sendiri" on storage.objects for select to authenticated using (bucket_id='laporan-foto');
create policy "hapus foto sendiri" on storage.objects for delete to authenticated using (bucket_id='laporan-foto' and (storage.foldername(name))[1]=auth.uid()::text);
-- Buat bucket private bernama laporan-foto melalui Supabase Dashboard/API; jangan jadikan public.
