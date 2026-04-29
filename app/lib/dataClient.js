import { createClient } from '@supabase/supabase-js';

export function getDataClient() {
  const url = process.env.DATA_URL;
  const key = process.env.DATA_KEY;

  if (!url || !key) {
    throw new Error('DATA_URL 또는 DATA_KEY가 설정되지 않았습니다.');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
