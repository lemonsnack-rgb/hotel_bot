import { getDataClient } from '../../lib/dataClient';

function json(body, status = 200) {
  return Response.json(body, { status });
}

function checkAdmin(request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return request.headers.get('x-admin-password') === expected;
}

function normalizeAlert(input) {
  return {
    email: String(input.email || '').trim(),
    location: String(input.location || '').trim(),
    check_in_date: input.check_in_date,
    check_out_date: input.check_out_date,
    adults: Number(input.adults || 2),
    children: Number(input.children || 0),
    children_ages: String(input.children_ages || ''),
    currency: String(input.currency || 'KRW'),
    top_n: Number(input.top_n || 5),
    min_rating: Number(input.min_rating || 0),
    send_only_when_price_drops: Boolean(input.send_only_when_price_drops),
    is_active: true,
    memo: String(input.memo || '').trim(),
  };
}

function validateAlert(alert) {
  if (!alert.email) return '이메일을 입력해 주세요.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alert.email)) return '이메일 형식을 확인해 주세요.';
  if (!alert.location) return '도시 또는 지역을 입력해 주세요.';
  if (!alert.check_in_date) return '체크인 날짜를 입력해 주세요.';
  if (!alert.check_out_date) return '체크아웃 날짜를 입력해 주세요.';
  if (alert.check_in_date >= alert.check_out_date) return '체크아웃 날짜는 체크인 날짜보다 뒤여야 합니다.';
  if (!Number.isFinite(alert.adults) || alert.adults < 1) return '성인 수는 1명 이상이어야 합니다.';
  if (!Number.isFinite(alert.children) || alert.children < 0) return '어린이 수는 0명 이상이어야 합니다.';
  if (!Number.isFinite(alert.top_n) || alert.top_n < 1 || alert.top_n > 20) return '호텔 수는 1개 이상 20개 이하로 입력해 주세요.';
  if (!Number.isFinite(alert.min_rating) || alert.min_rating < 0) return '최소 평점은 0 이상으로 입력해 주세요.';
  return null;
}

export async function GET(request) {
  if (!checkAdmin(request)) {
    return json({ error: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
  }

  try {
    const db = getDataClient();
    const { data, error } = await db
      .from('hotel_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return json({ alerts: data || [] });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: '요청 내용을 읽지 못했습니다.' }, 400);
  }

  const alert = normalizeAlert(body.alert || {});
  const validationError = validateAlert(alert);
  if (validationError) return json({ error: validationError }, 400);

  try {
    const db = getDataClient();
    const { data, error } = await db
      .from('hotel_alerts')
      .insert(alert)
      .select('*')
      .single();

    if (error) throw error;
    return json({ alert: data }, 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
