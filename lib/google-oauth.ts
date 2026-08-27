import { google } from 'googleapis';
export const GOOGLE_SCOPES=['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/spreadsheets'];
export function getGoogleOAuth(){const id=process.env.GOOGLE_OAUTH_CLIENT_ID,secret=process.env.GOOGLE_OAUTH_CLIENT_SECRET,redirect=process.env.GOOGLE_OAUTH_REDIRECT_URI;if(!id||!secret||!redirect)throw new Error('Konfigurasi OAuth Google belum lengkap.');return new google.auth.OAuth2(id,secret,redirect);}
