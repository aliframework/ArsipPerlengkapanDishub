-- Wilayah diverifikasi dari Pembagian Wilayah Administrasi Kota Madiun (Pemkot/JDIH)
-- dan https://kelurahan-pangongangan.madiunkota.go.id/kode-wilayah-administrasi-pemerintahan-kelurahan-di-kota-madiun/
insert into public.ref_kecamatan(nama) values ('Manguharjo'),('Taman'),('Kartoharjo') on conflict (nama) do nothing;

insert into public.ref_kelurahan(kecamatan_id,nama)
select k.id,v.kelurahan from (values
 ('Manguharjo','Manguharjo'),('Manguharjo','Sogaten'),('Manguharjo','Patihan'),
 ('Manguharjo','Ngegong'),('Manguharjo','Winongo'),('Manguharjo','Madiun Lor'),
 ('Manguharjo','Pangongangan'),('Manguharjo','Nambangan Lor'),('Manguharjo','Nambangan Kidul'),
 ('Taman','Mojorejo'),('Taman','Pandean'),('Taman','Banjarejo'),('Taman','Kuncen'),
 ('Taman','Manisrejo'),('Taman','Kejuron'),('Taman','Josenan'),('Taman','Demangan'),('Taman','Taman'),
 ('Kartoharjo','Kartoharjo'),('Kartoharjo','Oro-Oro Ombo'),('Kartoharjo','Klegen'),
 ('Kartoharjo','Kanigoro'),('Kartoharjo','Pilangbango'),('Kartoharjo','Rejomulyo'),
 ('Kartoharjo','Sukosari'),('Kartoharjo','Tawangrejo'),('Kartoharjo','Kelun')
) as v(kecamatan,kelurahan) join public.ref_kecamatan k on k.nama=v.kecamatan
on conflict (kecamatan_id,nama) do nothing;

-- Jenis lama dipertahankan untuk laporan historis, tetapi disembunyikan dari form baru.
update public.ref_jenis_perlengkapan set aktif=false;
insert into public.ref_jenis_perlengkapan(nama,aktif) values
 ('APILL',true),('Warning Light',true),('Rambu Lalu Lintas',true),('Speedbump',true),
 ('Cermin Tikungan',true),('Water Barrier',true),('Pelican Crossing',true)
on conflict (nama) do update set aktif=excluded.aktif;

create table if not exists public.ref_jenis_rambu (
 id uuid primary key default gen_random_uuid(),nama text unique not null,
 aktif boolean not null default true,created_at timestamptz not null default now()
);
insert into public.ref_jenis_rambu(nama,aktif) values
 ('Rambu Petunjuk',true),('Rambu Larangan',true),('Rambu Perintah',true),('Rambu Peringatan',true)
on conflict (nama) do update set aktif=excluded.aktif;
alter table public.ref_jenis_rambu enable row level security;
drop policy if exists "baca jenis rambu" on public.ref_jenis_rambu;
create policy "baca jenis rambu" on public.ref_jenis_rambu for select to authenticated using (aktif=true);

-- RPC memvalidasi kategori rambu di server dan mengosongkannya untuk jenis selain rambu.
create or replace function public.buat_laporan_kerusakan(
 p_sumber text,p_pelapor text,p_wa text,p_nama_petugas text,p_nip text,p_jalan text,
 p_kecamatan_id uuid,p_kelurahan_id uuid,p_jenis_id uuid,p_tingkat text,p_foto text[],p_deskripsi text,
 p_waktu_laporan timestamptz,p_jenis_rambu text,p_status text,p_waktu_penanganan timestamptz,
 p_petugas_menangani text,p_dokumentasi_penanganan text[],p_catatan_penanganan text
) returns public.laporan_kerusakan language plpgsql security definer set search_path=public as $$
declare v_kecamatan text;v_kelurahan text;v_jenis text;v_jenis_rambu text;v_nomor text;
 v_report public.laporan_kerusakan;v_waktu timestamptz:=coalesce(p_waktu_laporan,now());
begin
 if auth.uid() is null then raise exception 'Tidak terautentikasi'; end if;
 select nama into v_kecamatan from ref_kecamatan where id=p_kecamatan_id;
 select nama into v_kelurahan from ref_kelurahan where id=p_kelurahan_id and kecamatan_id=p_kecamatan_id;
 select nama into v_jenis from ref_jenis_perlengkapan where id=p_jenis_id and aktif=true;
 if v_kecamatan is null or v_kelurahan is null or v_jenis is null then raise exception 'Referensi tidak valid'; end if;
 if v_jenis='Rambu Lalu Lintas' then
  select nama into v_jenis_rambu from ref_jenis_rambu where nama=nullif(trim(p_jenis_rambu),'') and aktif=true;
  if v_jenis_rambu is null then raise exception 'Kategori rambu wajib dipilih dan harus valid'; end if;
 end if;
 perform pg_advisory_xact_lock(hashtext(to_char(v_waktu,'YYYY-MM')));
 select 'DISHUB-MADIUN-'||to_char(v_waktu,'YYYY-MM')||'-'||lpad((count(*)+1)::text,3,'0') into v_nomor
 from laporan_kerusakan where coalesce(waktu_laporan,created_at)>=date_trunc('month',v_waktu)
 and coalesce(waktu_laporan,created_at)<date_trunc('month',v_waktu)+interval '1 month';
 insert into laporan_kerusakan(nomor_laporan,sumber_laporan,nama_pelapor,no_wa_pelapor,admin_id,nama_petugas_input,nip_petugas_input,nama_jalan,kecamatan,kelurahan,jenis_perlengkapan,tingkat_kerusakan,foto_paths,deskripsi,status,waktu_laporan,jenis_rambu,asal_data)
 values(v_nomor,p_sumber,p_pelapor,p_wa,auth.uid(),p_nama_petugas,p_nip,p_jalan,v_kecamatan,v_kelurahan,v_jenis,p_tingkat,p_foto,p_deskripsi,coalesce(nullif(p_status,''),'Belum Ditangani'),v_waktu,v_jenis_rambu,'manual') returning * into v_report;
 if p_waktu_penanganan is not null or nullif(p_petugas_menangani,'') is not null or cardinality(coalesce(p_dokumentasi_penanganan,'{}'))>0 or nullif(p_catatan_penanganan,'') is not null or coalesce(nullif(p_status,''),'Belum Ditangani')<>'Belum Ditangani' then
  insert into laporan_penanganan(laporan_id,status,waktu_penanganan,petugas_menangani,dokumentasi_urls,catatan,updated_by)
  values(v_report.id,coalesce(nullif(p_status,''),'Belum Ditangani'),p_waktu_penanganan,nullif(p_petugas_menangani,''),coalesce(p_dokumentasi_penanganan,'{}'),nullif(p_catatan_penanganan,''),auth.uid());
 end if;return v_report;
end $$;
revoke all on function public.buat_laporan_kerusakan(text,text,text,text,text,text,uuid,uuid,uuid,text,text[],text,timestamptz,text,text,timestamptz,text,text[],text) from public;
grant execute on function public.buat_laporan_kerusakan(text,text,text,text,text,text,uuid,uuid,uuid,text,text[],text,timestamptz,text,text,timestamptz,text,text[],text) to authenticated;
