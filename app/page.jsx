'use client';

import { useState } from 'react';

const DEFAULT_ALERT = {
  email: '',
  location: 'Kumamoto',
  check_in_date: '2026-06-08',
  check_out_date: '2026-06-12',
  adults: 2,
  children: 1,
  children_ages: '7',
  currency: 'KRW',
  top_n: 5,
  min_rating: 0,
  send_only_when_price_drops: false,
  memo: '',
};

export default function Home() {
  const [adminPassword, setAdminPassword] = useState('');
  const [alert, setAlert] = useState(DEFAULT_ALERT);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('호텔 가격 알림을 받을 조건을 등록해 주세요.');
  const [error, setError] = useState(false);

  function updateAlert(key, value) {
    setAlert((prev) => ({ ...prev, [key]: value }));
  }

  async function loadAlerts() {
    setLoading(true);
    setError(false);
    setMessage('관리자 알림 목록을 불러오는 중입니다.');

    try {
      const response = await fetch('/api/alerts', {
        headers: { 'x-admin-password': adminPassword },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '알림 목록을 불러오지 못했습니다.');
      setAlerts(data.alerts || []);
      setMessage(`등록된 알림 ${data.alerts?.length || 0}개를 불러왔습니다.`);
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createAlert() {
    setLoading(true);
    setError(false);
    setMessage('알림을 등록하는 중입니다.');

    const nextAlert = {
      ...alert,
      adults: Number(alert.adults),
      children: Number(alert.children),
      top_n: Number(alert.top_n),
      min_rating: Number(alert.min_rating),
      send_only_when_price_drops: Boolean(alert.send_only_when_price_drops),
    };

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert: nextAlert }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '알림 등록에 실패했습니다.');
      setAlert(DEFAULT_ALERT);
      setMessage('알림을 등록했습니다. 다음 자동 실행부터 입력한 이메일로 호텔 가격 알림이 발송됩니다.');
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAlert(item) {
    setLoading(true);
    setError(false);
    setMessage('알림 상태를 변경하는 중입니다.');

    try {
      const response = await fetch(`/api/alerts/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, is_active: !item.is_active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '알림 상태 변경에 실패했습니다.');
      setMessage('알림 상태를 변경했습니다.');
      await loadAlerts();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAlert(item) {
    if (!confirm(`${item.email} 알림을 삭제할까요?`)) return;
    setLoading(true);
    setError(false);
    setMessage('알림을 삭제하는 중입니다.');

    try {
      const response = await fetch(`/api/alerts/${item.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '알림 삭제에 실패했습니다.');
      setMessage('알림을 삭제했습니다.');
      await loadAlerts();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runNow() {
    setLoading(true);
    setError(false);
    setMessage('GitHub Actions 실행을 요청하는 중입니다.');

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '실행 요청에 실패했습니다.');
      setMessage('실행 요청을 보냈습니다. GitHub Actions 탭에서 진행 상태를 확인해 주세요.');
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="card">
        <p className="eyebrow">공유 링크용 호텔 알림</p>
        <h1>원하는 조건을 등록하면 호텔 가격 알림을 보내드립니다</h1>
        <p className="description">
          이메일, 지역, 날짜, 인원 조건을 입력해 주세요. 등록 후 관리자가 설정한 자동 실행 시간에 맞춰 알림이 발송됩니다.
        </p>

        <div className="grid">
          <div className="field full">
            <label htmlFor="email">받을 이메일</label>
            <input id="email" type="email" value={alert.email} onChange={(event) => updateAlert('email', event.target.value)} placeholder="friend@example.com" autoComplete="email" />
          </div>

          <div className="field full">
            <label htmlFor="location">도시 또는 지역</label>
            <input id="location" value={alert.location} onChange={(event) => updateAlert('location', event.target.value)} placeholder="Kumamoto" />
          </div>

          <div className="field">
            <label htmlFor="check_in_date">체크인</label>
            <input id="check_in_date" type="date" value={alert.check_in_date} onChange={(event) => updateAlert('check_in_date', event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="check_out_date">체크아웃</label>
            <input id="check_out_date" type="date" value={alert.check_out_date} onChange={(event) => updateAlert('check_out_date', event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="adults">성인 수</label>
            <input id="adults" type="number" min="1" value={alert.adults} onChange={(event) => updateAlert('adults', event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="children">어린이 수</label>
            <input id="children" type="number" min="0" value={alert.children} onChange={(event) => updateAlert('children', event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="children_ages">어린이 나이</label>
            <input id="children_ages" value={alert.children_ages} onChange={(event) => updateAlert('children_ages', event.target.value)} placeholder="예: 7 또는 7,10" />
          </div>

          <div className="field">
            <label htmlFor="currency">통화</label>
            <select id="currency" value={alert.currency} onChange={(event) => updateAlert('currency', event.target.value)}>
              <option value="KRW">KRW</option>
              <option value="JPY">JPY</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="top_n">메일에 담을 호텔 수</label>
            <input id="top_n" type="number" min="1" max="20" value={alert.top_n} onChange={(event) => updateAlert('top_n', event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="min_rating">최소 평점</label>
            <input id="min_rating" type="number" min="0" step="0.1" value={alert.min_rating} onChange={(event) => updateAlert('min_rating', event.target.value)} />
          </div>

          <div className="field full">
            <label htmlFor="send_only_when_price_drops">발송 조건</label>
            <select id="send_only_when_price_drops" value={String(alert.send_only_when_price_drops)} onChange={(event) => updateAlert('send_only_when_price_drops', event.target.value === 'true')}>
              <option value="false">실행될 때마다 이메일 받기</option>
              <option value="true">가격이 내려갔을 때만 이메일 받기</option>
            </select>
          </div>

          <div className="field full">
            <label htmlFor="memo">메모</label>
            <input id="memo" value={alert.memo} onChange={(event) => updateAlert('memo', event.target.value)} placeholder="예: 가족 여행, 친구 A 요청" />
          </div>
        </div>

        <div className="actions">
          <button className="primary" type="button" onClick={createAlert} disabled={loading}>알림 등록</button>
        </div>

        {message && <div className={`notice ${error ? 'error' : ''}`}>{message}</div>}
      </section>

      <section className="card admin-card">
        <h2>관리자 도구</h2>
        <p className="description">등록된 알림 확인, 중지, 삭제, 즉시 실행은 관리자만 사용할 수 있습니다.</p>

        <div className="field full">
          <label htmlFor="adminPassword">관리자 비밀번호</label>
          <input id="adminPassword" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Vercel ADMIN_PASSWORD" autoComplete="current-password" />
        </div>

        <div className="actions">
          <button className="secondary" type="button" onClick={loadAlerts} disabled={loading || !adminPassword}>알림 목록 불러오기</button>
          <button className="secondary" type="button" onClick={runNow} disabled={loading || !adminPassword}>지금 전체 실행</button>
        </div>

        {alerts.length > 0 && (
          <div className="alert-list">
            {alerts.map((item) => (
              <div className="alert-item" key={item.id}>
                <div>
                  <b>{item.email}</b>
                  <p>{item.location} / {item.check_in_date} ~ {item.check_out_date}</p>
                  <p>성인 {item.adults}명, 어린이 {item.children}명 / {item.currency} / {item.is_active ? '활성' : '중지'}</p>
                  {item.memo && <p>메모: {item.memo}</p>}
                </div>
                <div className="item-actions">
                  <button className="secondary" type="button" onClick={() => toggleAlert(item)} disabled={loading}>{item.is_active ? '중지' : '활성화'}</button>
                  <button className="secondary danger" type="button" onClick={() => deleteAlert(item)} disabled={loading}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
