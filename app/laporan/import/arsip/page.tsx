import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {ReportList,ReportListItem} from '@/components/report-list';

const PAGE_SIZE = 20;
type Params = { q?: string; status?: string; kecamatan?: string; page?: string };

export default async function ArsipImport({ searchParams }: { searchParams: Params }) {
  const supabase = createClient();
  const search = (searchParams.q || '').trim().slice(0, 100);
  const status = (searchParams.status || '').trim();
  const kecamatan = (searchParams.kecamatan || '').trim();
  const requestedPage = Math.max(1, Number.parseInt(searchParams.page || '1', 10) || 1);
  let query = supabase.from('imported_laporan_kerusakan')
    .select('id,nomor_import,waktu_laporan,imported_at,nama_pelapor,nama_petugas_input,nama_jalan,kecamatan,kelurahan,jenis_perlengkapan,tingkat_kerusakan,status,deskripsi,import_metadata', { count: 'exact' })
    .order('waktu_laporan', { ascending: false });
  if (search) {
    const safe = search.replace(/[,%()]/g, ' ');
    query = query.or(`nomor_import.ilike.%${safe}%,nama_pelapor.ilike.%${safe}%,nama_jalan.ilike.%${safe}%,kelurahan.ilike.%${safe}%`);
  }
  if (status) query = query.eq('status', status);
  if (kecamatan) query = query.eq('kecamatan', kecamatan);
  const from = (requestedPage - 1) * PAGE_SIZE;
  const [{ data: rowData, count }, { data: session }, { data: recap }, { data: districts }] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabase.from('google_sheet_import_sessions').select('spreadsheet_url,drive_folder_url').order('imported_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('google_import_recap_sheets').select('spreadsheet_url,updated_at').maybeSingle(),
    supabase.from('ref_kecamatan').select('nama').order('nama')
  ]);
  const rows = rowData ?? [];
  const items:ReportListItem[]=rows.map(row=>({id:row.id,nomor:row.nomor_import,waktu:row.waktu_laporan,pelapor:row.nama_pelapor,lokasi:row.nama_jalan,wilayah:`${row.kelurahan}, ${row.kecamatan}`,jenis:row.jenis_perlengkapan,tingkat:row.tingkat_kerusakan,status:row.status,deskripsi:row.deskripsi,petugas:row.nama_petugas_input,asal:'Import',href:`/laporan/import/arsip/${row.id}`}));
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const fallback = rows.find(row => (row.import_metadata as { sheet_url?: string } | null)?.sheet_url);
  const sourceUrl = session?.spreadsheet_url || (fallback?.import_metadata as { sheet_url?: string } | null)?.sheet_url;
  const hasFilter = Boolean(search || status || kecamatan);
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search); if (status) params.set('status', status); if (kecamatan) params.set('kecamatan', kecamatan);
    params.set('page', String(target)); return `/laporan/import/arsip?${params}`;
  };

  return <section>
    <header className="mb-6 rounded-2xl bg-gradient-to-r from-cyan-800 to-blue-700 p-6 text-white">
      <p className="text-xs font-bold tracking-[.16em] text-cyan-100">ARSIP TERPISAH</p><h1 className="mt-2 text-2xl font-bold">Arsip Data Import Google Sheet</h1>
      <p className="mt-2 text-sm text-cyan-50">Data ditampilkan 20 laporan per halaman agar pencarian dan pengelolaan tetap ringan.</p>
    </header>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500"><b className="text-slate-700">{total}</b> laporan ditemukan</p>
      <div className="flex flex-wrap gap-2">
        {recap?.spreadsheet_url && <a href={recap.spreadsheet_url} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Lihat Rekap Export ↗</a>}
        {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-800">Lihat Sheet Sumber ↗</a>}
        {session?.drive_folder_url && <a href={session.drive_folder_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Buka Folder Drive ↗</a>}
        <a href="/api/export/imported" className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700">{recap ? 'Perbarui Rekap' : 'Buat Rekap Export'}</a>
        <Link href="/laporan/import" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Import Data Baru</Link>
      </div>
    </div>
    <form className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(240px,1fr)_190px_190px_auto]" method="get">
      <label className="text-xs font-semibold text-slate-600">Cari laporan<input name="q" defaultValue={search} placeholder="Nomor, pelapor, jalan, kelurahan..." className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500" /></label>
      <label className="text-xs font-semibold text-slate-600">Status<select name="status" defaultValue={status} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Semua status</option>{['Belum Ditangani', 'Dalam Proses', 'Selesai'].map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Kecamatan<select name="kecamatan" defaultValue={kecamatan} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Semua kecamatan</option>{(districts ?? []).map(item => <option key={item.nama}>{item.nama}</option>)}</select></label>
      <div className="flex items-end gap-2"><button className="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Tampilkan</button>{hasFilter && <Link href="/laporan/import/arsip" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Reset</Link>}</div>
    </form>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-5 py-4"><h2 className="font-semibold">Hasil Pencarian</h2><p className="text-xs text-slate-500">Informasi penting diringkas tanpa tabel lebar.</p></div>
      <ReportList items={items} empty="Tidak ada data yang sesuai dengan pencarian atau filter."/>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
        <p className="text-sm text-slate-500">Menampilkan <b>{total ? from + 1 : 0}–{Math.min(from + rows.length, total)}</b> dari <b>{total}</b> data</p>
        <div className="flex items-center gap-2">
          {page > 1 ? <Link href={pageHref(page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">← Sebelumnya</Link> : <span className="cursor-not-allowed rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-300">← Sebelumnya</span>}
          <span className="px-2 text-sm text-slate-500">Halaman <b>{page}</b> / {totalPages}</span>
          {page < totalPages ? <Link href={pageHref(page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Berikutnya →</Link> : <span className="cursor-not-allowed rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-300">Berikutnya →</span>}
        </div>
      </footer>
    </div>
  </section>;
}
