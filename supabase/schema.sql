-- Supabase SQL Editor에서 이 파일 내용을 실행하세요.
-- 지인 공유용 호텔 알림 서비스에 필요한 테이블입니다.

create extension if not exists pgcrypto;

create table if not exists public.hotel_alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  location text not null,
  check_in_date date not null,
  check_out_date date not null,
  adults integer not null default 2,
  children integer not null default 0,
  children_ages text not null default '',
  currency text not null default 'KRW',
  top_n integer not null default 5,
  min_rating numeric not null default 0,
  send_only_when_price_drops boolean not null default false,
  is_active boolean not null default true,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hotel_price_history (
  id bigserial primary key,
  alert_id uuid references public.hotel_alerts(id) on delete cascade,
  hotel_name text not null,
  location text not null,
  check_in_date date not null,
  check_out_date date not null,
  price integer not null,
  rating numeric,
  link text,
  checked_at timestamptz not null default now()
);

create index if not exists idx_hotel_alerts_active on public.hotel_alerts(is_active);
create index if not exists idx_hotel_price_history_alert_dates on public.hotel_price_history(alert_id, check_in_date, check_out_date);

-- 간단 MVP에서는 서버의 Service Role Key만 사용하므로 RLS를 켜되 공개 접근 정책은 만들지 않습니다.
alter table public.hotel_alerts enable row level security;
alter table public.hotel_price_history enable row level security;
