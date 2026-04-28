# Hotel Price Bot MVP

특정 지역의 호텔 가격을 매일 조회하고, 최저가 호텔 목록을 이메일로 보내는 개인용 봇입니다.

## 구성

- Python
- SerpAPI Google Hotels
- Gmail SMTP
- SQLite
- GitHub Actions

## 빠른 시작

처음 사용하는 분은 `START_HERE.txt`를 먼저 읽고, 자세한 단계는 `BEGINNER_GUIDE.md`를 따라 진행하세요.

## 필요한 GitHub Secrets

GitHub 저장소의 `Settings > Secrets and variables > Actions`에서 아래 4개를 등록해야 합니다.

- `SERPAPI_API_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `TO_EMAIL`

## 검색 조건 수정

검색 지역, 인원, 숙박일수 등은 `config.json`에서 수정합니다.

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

## 수동 실행

GitHub 저장소에서:

```text
Actions → Hotel Price Bot → Run workflow
```

## 자동 실행

기본 설정은 매일 한국시간 오전 9시입니다.

## 주의

- 실제 API Key와 Gmail 앱 비밀번호를 코드에 넣지 마세요.
- 비밀값은 반드시 GitHub Secrets에 등록하세요.
- 호텔 가격은 조회 시점 기준이며 실제 예약 단계에서 달라질 수 있습니다.
