# Hotel Price Bot MVP

특정 지역의 호텔 가격을 매일 조회하고, 최저가 호텔 목록을 이메일로 보내는 개인용 봇입니다.

## 구성

- Python
- SerpAPI Google Hotels
- Gmail SMTP
- SQLite
- GitHub Actions

## 1. 파일 구성

```text
hotel_price_bot/
├─ main.py
├─ config.json
├─ requirements.txt
└─ .github/
   └─ workflows/
      └─ daily.yml
```

## 2. 로컬 실행

```bash
pip install -r requirements.txt
```

환경변수 설정:

```bash
export SERPAPI_API_KEY="your_serpapi_key"
export GMAIL_USER="your_gmail@gmail.com"
export GMAIL_APP_PASSWORD="your_google_app_password"
export TO_EMAIL="receiver@example.com"
```

실행:

```bash
python main.py
```

Windows PowerShell에서는 다음처럼 설정합니다.

```powershell
$env:SERPAPI_API_KEY="your_serpapi_key"
$env:GMAIL_USER="your_gmail@gmail.com"
$env:GMAIL_APP_PASSWORD="your_google_app_password"
$env:TO_EMAIL="receiver@example.com"
python main.py
```

## 3. config.json 설정

```json
{
  "location": "Busan Haeundae",
  "adults": 2,
  "currency": "KRW",
  "days_after": 14,
  "nights": 1,
  "top_n": 5,
  "min_rating": 0,
  "send_only_when_price_drops": false
}
```

- `location`: 검색 지역
- `days_after`: 오늘 기준 며칠 뒤 체크인할지
- `nights`: 숙박 일수
- `top_n`: 이메일에 보낼 최저가 호텔 수
- `min_rating`: 최소 평점
- `send_only_when_price_drops`: true이면 이전 기록보다 최저가가 낮아졌을 때만 이메일 발송

## 4. GitHub Actions 설정

GitHub 저장소의 Settings > Secrets and variables > Actions에서 아래 Secrets를 등록합니다.

- `SERPAPI_API_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `TO_EMAIL`

등록 후 Actions 탭에서 `Hotel Price Bot` 워크플로를 수동 실행할 수 있습니다.

## 5. 주의사항

- 가격은 조회 시점 기준이며 실제 예약 단계에서 달라질 수 있습니다.
- 무료 API 한도를 넘지 않도록 처음에는 하루 1회, 지역 1곳만 조회하는 것이 좋습니다.
- Gmail 앱 비밀번호는 2단계 인증이 켜진 계정에서 생성할 수 있습니다.
