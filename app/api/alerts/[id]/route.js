import { getDataClient } from '../../../lib/dataClient';

function json(body, status = 200) {
  return Response.json(body, { status });
}

function checkAdmin(request, bodyPassword) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return request.headers.get('x-admin-password') === expected || bodyPassword === expected;
}

export async function PATCH(request, context) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: '요청 내용을 읽지 못했습니다.' }, 400);
  }

  if (!checkAdmin(request, body.adminPassword)) {
    return json({ error: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
  }

  try {
    const params = await context.params;
    const db = getDataClient();
    const { data, error } = await db
      .from('hotel_alerts')
      .update({
        is_active: Boolean(body.is_active),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select('*')
      .single();

    if (error) throw error;
    return json({ alert: data });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function DELETE(request, context) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!checkAdmin(request, body.adminPassword)) {
    return json({ error: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
  }

  try {
    const params = await context.params;
    const db = getDataClient();
    const { error } = await db
      .from('hotel_alerts')
      .delete()
      .eq('id', params.id);

    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
