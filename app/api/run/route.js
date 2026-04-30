const OWNER = process.env.GITHUB_OWNER || 'lemonsnack-rgb';
const REPO = process.env.GITHUB_REPO || 'hotel_bot';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const WORKFLOW_FILE = process.env.GITHUB_WORKFLOW_FILE || 'daily.yml';

function jsonResponse(body, status = 200) {
  return Response.json(body, { status });
}

function checkAdminPassword(request, bodyPassword) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return false;
  }

  const headerPassword = request.headers.get('x-admin-password');
  return headerPassword === expected || bodyPassword === expected;
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!checkAdminPassword(request, body.adminPassword)) {
    return jsonResponse({ error: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return jsonResponse({ error: 'Vercel 환경 변수 GITHUB_TOKEN이 설정되지 않았습니다.' }, 500);
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: BRANCH }),
  });

  if (!response.ok) {
    const text = await response.text();
    return jsonResponse({ error: `GitHub Actions 실행 실패: ${response.status} ${text}` }, 500);
  }

  return jsonResponse({ ok: true, message: 'GitHub Actions 실행을 요청했습니다.' });
}
