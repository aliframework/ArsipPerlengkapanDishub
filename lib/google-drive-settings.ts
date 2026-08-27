import {createAdminClient} from '@/lib/supabase/admin';
export async function getDriveParent(userId:string){const admin=createAdminClient();const {data}=await admin.from('google_drive_settings').select('folder_id').eq('user_id',userId).maybeSingle();return data?.folder_id||process.env.GOOGLE_DRIVE_FOLDER_ID||'root';}
