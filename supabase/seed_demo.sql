-- DATA DEMO SAJA — jalankan di Supabase SQL Editor untuk development.
-- Jangan gunakan di database produksi. Kelurahan berlabel DEMO bukan data administrasi resmi.
-- Membuat 9 laporan: masing-masing 3 laporan untuk Manguharjo, Taman, dan Kartoharjo.

insert into public.profiles (id, nama, nip)
select id, 'Admin Demo Dishub', '198501012010011001'
from auth.users
where not exists (select 1 from public.profiles p where p.id = auth.users.id)
limit 1;

insert into public.ref_kelurahan (kecamatan_id, nama)
select k.id, 'DEMO ' || k.nama
from public.ref_kecamatan k
on conflict (kecamatan_id, nama) do nothing;

with admin as (select id from public.profiles order by created_at limit 1),
data_demo(no, kecamatan, jalan, jenis, tingkat, status, pelapor, wa, deskripsi) as (
 values
 (1,'Manguharjo','Jl. Pahlawan','Rambu Lalu Lintas','Ringan','Belum Ditangani','Andi Pratama','081234567801','Rambu peringatan tampak pudar dan perlu pemeriksaan.'),
 (2,'Manguharjo','Jl. Setia Budi','PJU','Sedang','Dalam Proses','Siti Aminah','081234567802','Lampu penerangan jalan mati pada malam hari.'),
 (3,'Manguharjo','Jl. Bhayangkara','Marka Jalan','Berat','Belum Ditangani','Budi Santoso',null,'Marka jalan memudar pada area persimpangan.'),
 (4,'Taman','Jl. Diponegoro','APILL','Sedang','Belum Ditangani','Citra Lestari','081234567804','Lampu kuning APILL tidak menyala secara konsisten.'),
 (5,'Taman','Jl. Dr. Sutomo','Zebra Cross','Ringan','Selesai','Dedi Kurniawan','081234567805','Cat zebra cross mulai memudar.'),
 (6,'Taman','Jl. Mayjen Sungkono','CCTV / ATCS','Darurat','Dalam Proses','Eka Wulandari',null,'Kamera pemantau lalu lintas tidak dapat diakses.'),
 (7,'Kartoharjo','Jl. Soekarno Hatta','Guardrail / Pagar Pengaman','Berat','Belum Ditangani','Fajar Nugroho','081234567807','Guardrail penyok dan bergeser setelah insiden lalu lintas.'),
 (8,'Kartoharjo','Jl. Raya Ponorogo','Cermin Tikungan','Sedang','Dalam Proses','Gita Permata','081234567808','Cermin tikungan retak sehingga pandangan terbatas.'),
 (9,'Kartoharjo','Jl. Slamet Riyadi','Halte','Ringan','Selesai','Hendra Wijaya','081234567809','Atap halte membutuhkan perbaikan ringan.')
)
insert into public.laporan_kerusakan(nomor_laporan,sumber_laporan,nama_pelapor,no_wa_pelapor,admin_id,nama_petugas_input,nip_petugas_input,nama_jalan,kecamatan,kelurahan,jenis_perlengkapan,tingkat_kerusakan,deskripsi,status)
select 'DISHUB-DEMO-'||to_char(current_date,'YYYYMM')||'-'||lpad(d.no::text,3,'0'),case when d.no in (3,6) then 'Petugas Lapangan' else 'Masyarakat' end,d.pelapor,d.wa,admin.id,'Admin Demo Dishub','198501012010011001',d.jalan,d.kecamatan,'DEMO '||d.kecamatan,d.jenis,d.tingkat,d.deskripsi,d.status
from data_demo d cross join admin
join public.ref_kecamatan k on k.nama=d.kecamatan
join public.ref_kelurahan l on l.kecamatan_id=k.id and l.nama='DEMO '||d.kecamatan
join public.ref_jenis_perlengkapan j on j.nama=d.jenis
on conflict (nomor_laporan) do nothing;
