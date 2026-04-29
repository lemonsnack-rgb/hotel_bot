function json(body, status = 200) {
  return Response.json(body, { status });
}

function checkAdmin(request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return request.headers.get('x-admin-password') === expected;
}

function statusOf(name) {
  const value = process.env[name];
  return {
    exists: Boolean(value),
    length: value ? value.length : 0,
    startsWith: value ? value.slice(0, 12) : '',
  };
}

export async function GET(request) {
  if (!checkAdmin(request)) {
    return json({ error: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
  }

  return json({
    nodeEnv: process.env.NODE_ENV || '',
    vercelEnv: process.env.VERCEL_ENV || '',
    dataUrl: statusOf('DATA_URL'),
    dataKey: statusOf('DATA_KEY'),
    adminPassword: statusOf('ADMIN_PASSWORD'),
    githubOwner: statusOf('GITHUB_OWNER'),
    githubRepo: statusOf('GITHUB_REPO'),
  });
}
