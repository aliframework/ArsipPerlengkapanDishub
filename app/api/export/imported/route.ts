import { NextResponse } from 'next/server';
import { google, sheets_v4 } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleOAuth } from '@/lib/google-oauth';
import {getDriveParent} from '@/lib/google-drive-settings';

const message = (error: unknown) => error instanceof Error ? error.message : String(error || 'Kesalahan tidak diketahui');
type Handling = { laporan_import_id: string; waktu_penanganan: string | null; petugas_menangani: string | null; dokumentasi_urls: string[] | null; catatan: string | null };
const color = (red: number, green: number, blue: number) => ({ red: red / 255, green: green / 255, blue: blue / 255 });
const conditional = (range: sheets_v4.Schema$GridRange, type: 'CUSTOM_FORMULA' | 'TEXT_EQ' | 'TEXT_CONTAINS', value: string, format: sheets_v4.Schema$CellFormat): sheets_v4.Schema$Request => ({
  addConditionalFormatRule: { index: 0, rule: { ranges: [range], booleanRule: { condition: { type, values: [{ userEnteredValue: value }] }, format } } }
});

export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', req.url));
    const admin = createAdminClient();
    const { data: token, error: tokenError } = await admin.from('google_oauth_tokens').select('refresh_token').eq('user_id', user.id).maybeSingle();
    if (tokenError) throw tokenError;
    if (!token) return NextResponse.redirect(new URL('/api/google/connect', req.url));

    const auth = getGoogleOAuth();
    auth.setCredentials({ refresh_token: token.refresh_token });
    const [{ data: rows, error }, { data: history }, { data: recap }] = await Promise.all([
      admin.from('imported_laporan_kerusakan').select('*').order('waktu_laporan', { ascending: false }),
      admin.from('imported_laporan_penanganan').select('*').order('created_at', { ascending: false }),
      admin.from('google_import_recap_sheets').select('spreadsheet_id,spreadsheet_url').eq('user_id', user.id).maybeSingle()
    ]);
    if (error) throw error;
    const latest = new Map<string, Handling>();
    for (const item of (history || []) as Handling[]) if (!latest.has(item.laporan_import_id)) latest.set(item.laporan_import_id, item);

    let id = recap?.spreadsheet_id || '';
    let url = recap?.spreadsheet_url || '';
    if (!id) {
      const drive = google.drive({ version: 'v3', auth });
      const parent = await getDriveParent(user.id);
      const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      const folderName = `Arsip Export Data Import ${day}`;
      const found = await drive.files.list({ q: `'${parent}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`, fields: 'files(id)' });
      const folderId = found.data.files?.[0]?.id || (await drive.files.create({ requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }, fields: 'id' })).data.id!;
      const file = await drive.files.create({ requestBody: { name: 'Rekap Data Import', mimeType: 'application/vnd.google-apps.spreadsheet', parents: [folderId] }, fields: 'id,webViewLink' });
      id = file.data.id!;
      url = file.data.webViewLink || `https://docs.google.com/spreadsheets/d/${id}`;
    }

    const dataRows = rows || [];
    const values = [
      ['DINAS PERHUBUNGAN KOTA MADIUN'],
      ['REKAP DATA IMPORT GOOGLE SHEET'],
      [`Total Data: ${dataRows.length} • Diperbarui: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`],
      ['No', 'Nomor Import', 'Submission ID', 'Waktu Laporan', 'Sumber', 'Pelapor', 'No WA', 'Nama Petugas Input', 'NIP', 'Nama Jalan', 'Kecamatan', 'Kelurahan', 'Jenis Perlengkapan', 'Tingkat Kerusakan', 'Deskripsi', 'Status Penanganan', 'Waktu Penanganan', 'Petugas yang Menangani', 'Dokumentasi Penanganan', 'Catatan Penanganan'],
      ...dataRows.map((row, index) => {
        const handling = latest.get(row.id);
        return [index + 1, row.nomor_import, row.external_submission_id, new Date(row.waktu_laporan).toLocaleString('id-ID'), row.sumber_laporan, row.nama_pelapor, row.no_wa_pelapor || '', row.nama_petugas_input, row.nip_petugas_input, row.nama_jalan, row.kecamatan, row.kelurahan, row.jenis_perlengkapan, row.tingkat_kerusakan, row.deskripsi, row.status, handling?.waktu_penanganan ? new Date(handling.waktu_penanganan).toLocaleString('id-ID') : '', handling?.petugas_menangani || '', handling?.dokumentasi_urls?.join('\n') || '', handling?.catatan || ''];
      })
    ];

    const sheets = google.sheets({ version: 'v4', auth });
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: id, fields: 'sheets(properties(sheetId,title),conditionalFormats)' });
    const sheet = metadata.data.sheets?.[0];
    const sheetId = sheet?.properties?.sheetId ?? 0;
    const sheetTitle = sheet?.properties?.title || 'Sheet1';
    await sheets.spreadsheets.values.clear({ spreadsheetId: id, range: `'${sheetTitle.replace(/'/g, "''")}'` });
    await sheets.spreadsheets.values.update({ spreadsheetId: id, range: `'${sheetTitle.replace(/'/g, "''")}'!A1`, valueInputOption: 'RAW', requestBody: { values } });

    const rowEnd = Math.max(5, values.length);
    const requests: sheets_v4.Schema$Request[] = [];
    for (let index = (sheet?.conditionalFormats?.length || 0) - 1; index >= 0; index--) requests.push({ deleteConditionalFormatRule: { sheetId, index } });
    requests.push(
      { unmergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 20 } } },
      { mergeCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 20 }, mergeType: 'MERGE_ALL' } },
      { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 20 }, mergeType: 'MERGE_ALL' } },
      { mergeCells: { range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 20 }, mergeType: 'MERGE_ALL' } },
      { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 20 }, cell: { userEnteredFormat: { backgroundColor: color(30, 58, 138), horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', textFormat: { bold: true, foregroundColor: color(255, 255, 255), fontSize: 15 } } }, fields: 'userEnteredFormat' } },
      { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 20 }, cell: { userEnteredFormat: { backgroundColor: color(14, 116, 144), horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', textFormat: { bold: true, foregroundColor: color(255, 255, 255), fontSize: 12 } } }, fields: 'userEnteredFormat' } },
      { repeatCell: { range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 20 }, cell: { userEnteredFormat: { backgroundColor: color(224, 242, 254), horizontalAlignment: 'CENTER', textFormat: { bold: true, foregroundColor: color(12, 74, 110) } } }, fields: 'userEnteredFormat' } },
      { repeatCell: { range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 20 }, cell: { userEnteredFormat: { backgroundColor: color(15, 23, 42), horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP', textFormat: { bold: true, foregroundColor: color(255, 255, 255) }, borders: { bottom: { style: 'SOLID_MEDIUM', color: color(6, 182, 212) } } } }, fields: 'userEnteredFormat' } },
      { repeatCell: { range: { sheetId, startRowIndex: 4, endRowIndex: rowEnd, startColumnIndex: 0, endColumnIndex: 20 }, cell: { userEnteredFormat: { verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP', borders: { bottom: { style: 'SOLID', color: color(226, 232, 240) } } } }, fields: 'userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy,userEnteredFormat.borders' } },
      conditional({ sheetId, startRowIndex: 4, endRowIndex: rowEnd, startColumnIndex: 0, endColumnIndex: 20 }, 'CUSTOM_FORMULA', '=ISEVEN(ROW())', { backgroundColor: color(241, 245, 249) }),
      conditional({ sheetId, startRowIndex: 4, endRowIndex: rowEnd, startColumnIndex: 15, endColumnIndex: 16 }, 'TEXT_EQ', 'Selesai', { backgroundColor: color(220, 252, 231), textFormat: { bold: true, foregroundColor: color(21, 128, 61) } }),
      conditional({ sheetId, startRowIndex: 4, endRowIndex: rowEnd, startColumnIndex: 15, endColumnIndex: 16 }, 'TEXT_EQ', 'Dalam Proses', { backgroundColor: color(219, 234, 254), textFormat: { bold: true, foregroundColor: color(29, 78, 216) } }),
      conditional({ sheetId, startRowIndex: 4, endRowIndex: rowEnd, startColumnIndex: 15, endColumnIndex: 16 }, 'TEXT_EQ', 'Belum Ditangani', { backgroundColor: color(254, 243, 199), textFormat: { bold: true, foregroundColor: color(180, 83, 9) } }),
      conditional({ sheetId, startRowIndex: 4, endRowIndex: rowEnd, startColumnIndex: 13, endColumnIndex: 14 }, 'TEXT_CONTAINS', 'Berat', { backgroundColor: color(254, 226, 226), textFormat: { bold: true, foregroundColor: color(185, 28, 28) } }),
      { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 4 } }, fields: 'gridProperties.frozenRowCount' } },
      { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 4 }, properties: { pixelSize: 30 }, fields: 'pixelSize' } },
      { autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 20 } } },
      { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 14, endIndex: 15 }, properties: { pixelSize: 300 }, fields: 'pixelSize' } },
      { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 18, endIndex: 20 }, properties: { pixelSize: 260 }, fields: 'pixelSize' } }
    );
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests } });
    const { error: saveError } = await admin.from('google_import_recap_sheets').upsert({ user_id: user.id, spreadsheet_id: id, spreadsheet_url: url, updated_at: new Date().toISOString() });
    if (saveError) throw saveError;
    return NextResponse.redirect(new URL(`/laporan/export-sukses?url=${encodeURIComponent(url)}`, req.url));
  } catch (error) {
    return NextResponse.json({ error: `Export data import gagal: ${message(error)}` }, { status: 500 });
  }
}
