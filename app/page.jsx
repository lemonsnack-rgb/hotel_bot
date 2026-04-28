'use client';

import { useState } from 'react';

const DEFAULT_CONFIG = {
  to_email: '',
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
};

export default function Home() {
  const [adminPassword, setAdminPassword] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('관리자 비밀번호를 입력한 뒤 “현재 설정 불러오기”를 누르세요.');
  const [error, setError] = useState(false);

  function updateConfig(key, value) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function loadConfig() {
    setLoading(true);
    setError(false);
    setMessage('현재 설정을 불러오는 중입니다.');

    try {
      const response = await fetch('/api/config', {
        headers: {
          'x-admin-password': adminPassword,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '설정을 불러오지 못했습니다.');
      }

      setConfig({ ...DEFAULT_CONFIG, ...data.config });
      setMessage('현재 설정을 불러왔습니다. 수정 후 저장하세요.');
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setLoading(true);
    setError(false);
    setMessage('설정을 저장하는 중입니다.');

    const nextConfig = {
      ...config,
      adults: Number(config.adults),
      children: Number(config.children),
      top_n: Number(config.top_n),
      min_rating: Number(config.min_rating),
      send_only_when_price_drops: Boolean(config.send_only_when_price_drops),
    };

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminPassword, config: nextConfig }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '설정을 저장하지 못했습니다.');
      }

      setConfig({ ...DEFAULT_CONFIG, ...data.config });
      setMessage('설정을 저장했습니다. 저장 후 “지금 실행하기”를 누르면 바로 이메일 발송을 테스트할 수 있습니다.');
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '실행 요청에 실패했습니다.');
      }

      setMessage('실행 요청을 보냈습니다. GitHub 저장소의 Actions 탭에서 진행 상태를 확인하세요.');
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
        <h1>호텔 최저가 봇 관리자</h1>
        <p className="description">
          이메일 수신자, 도시, 숙박 날짜, 성인·어린이 수를 수정하고 GitHub Actions를 즉시 실행할 수 있습니다.
        </p>

        <div className="grid">
          <div className="field full">
            <label htmlFor="adminPassword">관리자 비밀번호</label>
            <input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Vercel ADMIN_PASSWORD"
            />
          </div>

          <div className="field full">
            <label htmlFor="to_email">이메일 수신자</label>
            <input
              id="to_email"
              type="email"
              value={config.to_email || ''}
              onChange={(event) => updateConfig('to_email', event.target.value)}
              placeholder="hotel-alert@example.com"
            />
          </div>

          <div className="field full">
            <label htmlFor="location">도시 / 지역</label>
            <input
              id="location"
              value={config.location || ''}
              onChange={(event) => updateConfig('location', event.target.value)}
              placeholder="Kumamoto"
            />
          </div>

          <div className="field">
            <label htmlFor="check_in_date">체크인</label>
            <input
              id="check_in_date"
              type="date"
              value={config.check_in_date || ''}
              onChange={(event) => updateConfig('check_in_date', event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="check_out_date">체크아웃</label>
            <input
              id="check_out_date"
              type="date"
              value={config.check_out_date || ''}
              onChange={(event) => updateConfig('check_out_date', event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="adults">성인 수</label>
            <input
              id="adults"
              type="number"
              min="1"
              value={config.adults}
              onChange={(event) => updateConfig('adults', event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="children">어린이 수</label>
            <input
              id="children"
              type="number"
              min="0"
              value={config.children}
              onChange={(event) => updateConfig('children', event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="children_ages">어린이 나이</label>
            <input
              id="children_ages"
              value={config.children_ages || ''}
              onChange={(event) => updateConfig('children_ages', event.target.value)}
              placeholder="예: 7 또는 7,10"
            />
          </div>

          <div className="field">
            <label htmlFor="currency">통화</label>
            <select
              id="currency"
              value={config.currency || 'KRW'}
              onChange={(event) => updateConfig('currency', event.target.value)}
            >
              <option value="KRW">KRW</option>
              <option value="JPY">JPY</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="top_n">이메일에 보낼 호텔 개수</label>
            <input
              id="top_n"
              type="number"
              min="1"
              max="20"
              value={config.top_n}
              onChange={(event) => updateConfig('top_n', event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="min_rating">최소 평점</label>
            <input
              id="min_rating"
              type="number"
              min="0"
              step="0.1"
              value={config.min_rating}
              onChange={(event) => updateConfig('min_rating', event.target.value)}
            />
          </div>

          <div className="field full">
            <label htmlFor="send_only_when_price_drops">발송 조건</label>
            <select
              id="send_only_when_price_drops"
              value={String(config.send_only_when_price_drops)}
              onChange={(event) => updateConfig('send_only_when_price_drops', event.target.value === 'true')}
            >
              <option value="false">매번 실행할 때 이메일 발송</option>
              <option value="true">가격이 내려간 경우에만 이메일 발송</option>
            </select>
          </div>
        </div>

        <div className="actions">
          <button className="secondary" type="button" onClick={loadConfig} disabled={loading || !adminPassword}>
            현재 설정 불러오기
          </button>
          <button className="primary" type="button" onClick={saveConfig} disabled={loading || !adminPassword}>
            설정 저장하기
          </button>
          <button className="secondary" type="button" onClick={runNow} disabled={loading || !adminPassword}>
            지금 실행하기
          </button>
        </div>

        {message && <div className={`notice ${error ? 'error' : ''}`}>{message}</div>}

        <div className="help">
          <p>
            어린이가 2명 이상이면 나이를 쉼표로 입력하세요. 예: <b>7,10</b>
          </p>
          <p>
            저장하면 GitHub 저장소의 <b>config.json</b>이 수정됩니다. “지금 실행하기”는 GitHub Actions를 수동 실행합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
