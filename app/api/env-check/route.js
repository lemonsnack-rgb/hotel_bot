function json(body, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || body.adminPassword !== expected) {
    return json({ error: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
  }

  const dataUrl = process.env.DATA_URL || '';
  const dataKey = process.env.DATA_KEY || '';

  return json({
    vercelEnv: process.env.VERCEL_ENV || '',
    dataUrlExists: Boolean(dataUrl),
    dataUrlPrefix: dataUrl ? dataUrl.slice(0, 8) : '',
    dataUrlLooksLikeSupabase: dataUrl.includes('supabase.co'),
    dataKeyExists: Boolean(dataKey),
    dataKeyPrefix: dataKey ? dataKey.slice(0, 10) : '',
    adminPasswordExists: Boolean(expected),
  });
}
