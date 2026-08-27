import {NextResponse} from 'next/server';
import {google} from 'googleapis';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {getGoogleOAuth} from '@/lib/google-oauth';
const errorText=(e:unknown)=>{if(e instanceof Error)return e.message;if(typeof e==='object'&&e){const x=e as {message?:unknown;details?:unknown;hint?:unknown;code?:unknown;response?:{data?:{error?:{message?:unknown}|string}}};const remote=typeof x.response?.data?.error==='object'?x.response.data.error.message:x.response?.data?.error;return [x.message||remote,x.details,x.hint,x.code&&`Kode: ${x.code}`].filter(Boolean).join(' — ')||JSON.stringify(e)}return String(e||'Kesalahan tidak diketahui')};
async function context(){const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)throw new Error('UNAUTHORIZED');const admin=createAdminClient();const {data:token,error}=await admin.from('google_oauth_tokens').select('refresh_token,connected_email').eq('user_id',user.id).maybeSingle();if(error)throw error;if(!token)return {user,admin,token:null,drive:null};const auth=getGoogleOAuth();auth.setCredentials({refresh_token:token.refresh_token});return {user,admin,token,drive:google.drive({version:'v3',auth})};}
export async function GET(){try{
  const c=await context();if(!c.token||!c.drive)return NextResponse.json({connected:false});
  const [aboutResult,folderResult,settingResult]=await Promise.all([
    c.drive.about.get({fields:'user(displayName,emailAddress,photoLink)'}),
    c.drive.files.list({q:"mimeType='application/vnd.google-apps.folder' and trashed=false and 'me' in owners",fields:'files(id,name,webViewLink)',orderBy:'name',pageSize:100}),
    c.admin.from('google_drive_settings').select('folder_id,folder_name,folder_url').eq('user_id',c.user.id).maybeSingle()
  ]);
  if(settingResult.error)throw settingResult.error;
  const account=aboutResult.data.user;const email=account?.emailAddress||c.token.connected_email||'';
  if(email&&email!==c.token.connected_email)await c.admin.from('google_oauth_tokens').update({connected_email:email}).eq('user_id',c.user.id);
  return NextResponse.json({connected:true,account:{email,name:account?.displayName||'',photo:account?.photoLink||''},selected:settingResult.data||{folder_id:'root',folder_name:'Drive Saya',folder_url:'https://drive.google.com/drive/my-drive'},folders:[{id:'root',name:'Drive Saya',webViewLink:'https://drive.google.com/drive/my-drive'},...(folderResult.data.files||[]).map(x=>({id:x.id,name:x.name,webViewLink:x.webViewLink}))]});
}catch(e){if(errorText(e)==='UNAUTHORIZED')return NextResponse.json({error:'Tidak terautentikasi'},{status:401});return NextResponse.json({error:'Gagal membaca Google Drive: '+errorText(e)},{status:500});}}
export async function POST(req:Request){try{
  const c=await context();if(!c.token||!c.drive)return NextResponse.json({error:'Google Drive belum terhubung.'},{status:409});const body=await req.json() as {action?:string;folderId?:string;name?:string;parentId?:string};let folder:{id?:string|null;name?:string|null;webViewLink?:string|null};
  if(body.action==='create'){const name=(body.name||'').trim();if(!name||name.length>100)return NextResponse.json({error:'Nama folder tidak valid.'},{status:400});folder=(await c.drive.files.create({requestBody:{name,mimeType:'application/vnd.google-apps.folder',parents:[body.parentId||'root']},fields:'id,name,webViewLink'})).data;}
  else{const id=body.folderId||'root';if(id==='root')folder={id:'root',name:'Drive Saya',webViewLink:'https://drive.google.com/drive/my-drive'};else{const file=(await c.drive.files.get({fileId:id,fields:'id,name,mimeType,webViewLink'})).data;if(file.mimeType!=='application/vnd.google-apps.folder')return NextResponse.json({error:'Pilihan bukan folder Google Drive.'},{status:400});folder=file;}}
  const {error:saveError}=await c.admin.from('google_drive_settings').upsert({user_id:c.user.id,folder_id:folder.id!,folder_name:folder.name||'Folder Drive',folder_url:folder.webViewLink||null,updated_at:new Date().toISOString()});if(saveError)throw saveError;return NextResponse.json({ok:true,folder});
}catch(e){return NextResponse.json({error:'Gagal menyimpan pengaturan: '+errorText(e)},{status:500});}}
export async function DELETE(){try{const s=createClient();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:'Tidak terautentikasi'},{status:401});const admin=createAdminClient();await Promise.all([admin.from('google_oauth_tokens').delete().eq('user_id',user.id),admin.from('google_drive_settings').delete().eq('user_id',user.id)]);return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:errorText(e)},{status:500});}}
