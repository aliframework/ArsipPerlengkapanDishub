alter table public.laporan_kerusakan
  add column if not exists external_submission_id text unique,
  add column if not exists source_submission_time timestamptz,
  add column if not exists import_metadata jsonb not null default '{}'::jsonb;

create or replace function public.import_laporan_google(
  p_submission_id text, p_submission_time timestamptz, p_waktu_laporan timestamptz,
  p_sumber text, p_pelapor text, p_wa text, p_admin_id uuid, p_nama_petugas text,
  p_nip text, p_jalan text, p_kecamatan text, p_kelurahan text, p_jenis text,
  p_tingkat text, p_deskripsi text, p_status text, p_metadata jsonb
) returns public.laporan_kerusakan language plpgsql security definer set search_path=public as $$
declare v_nomor text; v_row public.laporan_kerusakan; v_waktu timestamptz := coalesce(p_waktu_laporan, now());
begin
  if p_submission_id is null or btrim(p_submission_id)='' then raise exception 'Submission ID wajib diisi'; end if;
  if exists(select 1 from laporan_kerusakan where external_submission_id=p_submission_id) then raise exception 'Submission ID sudah pernah diimport'; end if;
  if not exists(select 1 from ref_kecamatan where nama=p_kecamatan) then raise exception 'Kecamatan tidak ditemukan: %',p_kecamatan; end if;
  if not exists(select 1 from ref_kelurahan l join ref_kecamatan k on k.id=l.kecamatan_id where k.nama=p_kecamatan and l.nama=p_kelurahan) then raise exception 'Kelurahan tidak sesuai kecamatan: %',p_kelurahan; end if;
  if not exists(select 1 from ref_jenis_perlengkapan where nama=p_jenis and aktif=true) then raise exception 'Jenis perlengkapan tidak ditemukan: %',p_jenis; end if;
  perform pg_advisory_xact_lock(hashtext(to_char(v_waktu,'YYYY-MM')));
  select 'DISHUB-MADIUN-'||to_char(v_waktu,'YYYY-MM')||'-'||lpad((count(*)+1)::text,3,'0') into v_nomor from laporan_kerusakan where created_at>=date_trunc('month',v_waktu) and created_at<date_trunc('month',v_waktu)+interval '1 month';
  insert into laporan_kerusakan(id,nomor_laporan,created_at,external_submission_id,source_submission_time,sumber_laporan,nama_pelapor,no_wa_pelapor,admin_id,nama_petugas_input,nip_petugas_input,nama_jalan,kecamatan,kelurahan,jenis_perlengkapan,tingkat_kerusakan,deskripsi,status,import_metadata)
  values(gen_random_uuid(),v_nomor,v_waktu,p_submission_id,p_submission_time,p_sumber,p_pelapor,p_wa,p_admin_id,p_nama_petugas,p_nip,p_jalan,p_kecamatan,p_kelurahan,p_jenis,p_tingkat,p_deskripsi,p_status,coalesce(p_metadata,'{}'::jsonb)) returning * into v_row;
  return v_row;
end $$;
revoke all on function public.import_laporan_google(text,timestamptz,timestamptz,text,text,text,uuid,text,text,text,text,text,text,text,text,text,jsonb) from public;
