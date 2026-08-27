import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleOAuth } from '@/lib/google-oauth';
import { getReports } from '@/lib/reports';
import { getDriveParent } from '@/lib/google-drive-settings';

function reason(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error) {
    const value = error as { message?: unknown; response?: { data?: { error?: { message?: unknown } } } };
    return String(value.response?.data?.error?.message || value.message || 'Kesalahan tidak diketahui');
  }
  return String(error || 'Kesalahan tidak diketahui');
}

export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', req.url));
    const admin = createAdminClient();
    const { data: token, error: tokenError } = await admin.from('google_oauth_tokens').select('refresh_token').eq('user_id', user.id).maybeSingle();
    if (tokenError) throw tokenError;
    if (!token) return NextResponse.redirect(new URL('/api/google/connect', req.url));
    const auth = getGoogleOAuth(); auth.setCredentials({ refresh_token: token.refresh_token }); await auth.getAccessToken();
    const drive = google.drive({ version: 'v3', auth });
    const parent = await getDriveParent(user.id);
    const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    const folderName = 'Arsip Laporan ' + day;
    const list = await drive.files.list({ q: `'${parent}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`, fields: 'files(id)', spaces: 'drive' });
    const archive = list.data.files?.[0]?.id || (await drive.files.create({ requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }, fields: 'id' })).data.id!;
    const file = await drive.files.create({ requestBody: { name: 'Rekap Laporan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.'), mimeType: 'application/vnd.google-apps.spreadsheet', parents: [archive] }, fields: 'id,webViewLink' });
    const id = file.data.id!;
    const { data: rows, error } = await getReports(Object.fromEntries(new URL(req.url).searchParams));
    if (error) throw error;
    const values = [['DINAS PERHUBUNGAN KOTA MADIUN'], ['Total Laporan: ' + (rows?.length ?? 0)], ['No', 'Nomor Laporan', 'Tanggal', 'Sumber', 'Nama Pelapor', 'No WA', 'Nama Jalan', 'Kecamatan', 'Kelurahan', 'Jenis Perlengkapan', 'Tingkat Kerusakan', 'Deskripsi', 'Status', 'Nama Petugas', 'NIP'], ...(rows ?? []).map((r, i) => [i + 1, r.nomor_laporan, new Date(r.created_at).toLocaleString('id-ID'), r.sumber_laporan, r.nama_pelapor, r.no_wa_pelapor || '', r.nama_jalan, r.kecamatan, r.kelurahan, r.jenis_perlengkapan, r.tingkat_kerusakan, r.deskripsi, r.status, r.nama_petugas_input, r.nip_petugas_input])];
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.update({ spreadsheetId: id, range: 'Sheet1!A1', valueInputOption: 'RAW', requestBody: { values } });
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: [{ repeatCell: { range: { sheetId: 0, startRowIndex: 2, endRowIndex: 3 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } }, { updateSheetProperties: { properties: { sheetId: 0, gridProperties: { frozenRowCount: 3 } }, fields: 'gridProperties.frozenRowCount' } }, { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 15 } } }] } });
    const sheetUrl = file.data.webViewLink || `https://docs.google.com/spreadsheets/d/${id}`;
    return NextResponse.redirect(new URL('/laporan/export-sukses?url=' + encodeURIComponent(sheetUrl), req.url));
  } catch (error) { return NextResponse.json({ error: 'Export gagal: ' + reason(error) }, { status: 500 }); }
}
