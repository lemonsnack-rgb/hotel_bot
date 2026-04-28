const OWNER = process.env.GITHUB_OWNER || 'lemonsnack-rgb';
const REPO = process.env.GITHUB_REPO || 'hotel_bot';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const CONFIG_PATH = 'config.json';

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

function requireGitHubToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('Vercel 환경변수 GITHUB_TOKEN이 설정되지 않았습니다.');
  }
  return token;
}

function decodeBase64(content) {
  return Buffer.from(content, 'base64').toString('utf8');
}

function encodeBase64(content) {
  return Buffer.from(content, 'utf8').toString('base64');
}

async function fetchConfigFile() {
  const token = requireGitHubToken();
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${CONFIG_PATH}?ref=${BRANCH}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`config.json을 읽지 못했습니다. ${response.status} ${text}`);
  }

  const file = await response.json();
  const config = JSON.parse(decodeBase64(file.content));
  return { config, sha: file.sha };
}

export async function GET(request) {
  if (!checkAdminPassword(request)) {
    return jsonResponse({ error: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
  }

  try {
    const { config } = await fetchConfigFile();
    return jsonResponse({ config });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: '요청 본문을 읽지 못했습니다.' }, 400);
  }

  if (!checkAdminPassword(request, body.adminPassword)) {
    return jsonResponse({ error: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
  }

  const nextConfig = body.config;
  if (!nextConfig || typeof nextConfig !== 'object') {
    return jsonResponse({ error: '저장할 설정이 없습니다.' }, 400);
  }

  const requiredFields = ['location', 'check_in_date', 'check_out_date', 'adults', 'children', 'children_ages', 'currency', 'top_n'];
  for (const field of requiredFields) {
    if (nextConfig[field] === undefined || nextConfig[field] === null || nextConfig[field] === '') {
      return jsonResponse({ error: `${field} 값이 비어 있습니다.` }, 400);
    }
  }

  try {
    const token = requireGitHubToken();
    const { sha } = await fetchConfigFile();
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${CONFIG_PATH}`;
    const content = `${JSON.stringify(nextConfig, null, 2)}\n`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update hotel bot settings from admin page',
        content: encodeBase64(content),
        sha,
        branch: BRANCH,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`config.json 저장 실패: ${response.status} ${text}`);
    }

    return jsonResponse({ ok: true, config: nextConfig });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}
