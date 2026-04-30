import { createClient } from '@supabase/supabase-js';

function cleanSupabaseUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '');
}

export function getDataClient() {
  const rawUrl = process.env.DATA_URL;
  const key = process.env.DATA_KEY;
  const url = cleanSupabaseUrl(rawUrl);

  if (!url || !key) {
    throw new Error('Supabase 연결 값이 없습니다. Vercel Environment Variables에 DATA_URL과 DATA_KEY를 등록한 뒤 Redeploy해 주세요.');
  }

  if (!url.startsWith('https://') || !url.includes('supabase.co')) {
    throw new Error('DATA_URL 형식이 올바르지 않습니다. 예: https://프로젝트ID.supabase.co');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
