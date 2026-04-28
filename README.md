# Hotel Price Bot

특정 지역의 호텔 가격을 매일 조회하고, 최저가 호텔 목록을 이메일로 보내는 개인용 봇입니다.

이 저장소에는 두 가지가 함께 들어 있습니다.

```text
1. Python 호텔 최저가 이메일 봇
2. Vercel에 배포할 수 있는 웹 관리자 화면
```

## 현재 기능

- SerpAPI Google Hotels 조회
- Gmail SMTP 이메일 발송
- GitHub Actions 매일 자동 실행
- Vercel 웹 관리자 화면
- 웹에서 이메일 수신자, 도시, 날짜, 숙박객 수 수정
- 웹에서 GitHub Actions 즉시 실행

## 주요 파일

```text
main.py                         호텔 검색 및 이메일 발송 코드
config.json                     호텔 검색 조건
.github/workflows/daily.yml     매일 자동 실행 설정
app/page.jsx                    웹 관리자 화면
app/api/config/route.js          config.json 조회/저장 API
app/api/run/route.js             GitHub Actions 실행 API
VERCEL_DEPLOY_GUIDE.md           Vercel 배포 안내서
BEGINNER_GUIDE.md                비개발자용 기본 안내서
```

## GitHub Actions에 필요한 Secrets

GitHub 저장소의 `Settings > Secrets and variables > Actions`에서 아래 값을 등록합니다.

```text
SERPAPI_API_KEY
GMAIL_USER
GMAIL_APP_PASSWORD
```

`TO_EMAIL`은 이제 관리자 화면에서 설정할 수 있습니다. 다만 비상용 fallback 값으로 GitHub Secrets에 남겨두어도 됩니다.

## Vercel에 필요한 Environment Variables

Vercel 프로젝트의 `Settings > Environment Variables`에서 아래 값을 등록합니다.

```text
ADMIN_PASSWORD
GITHUB_TOKEN
```

선택값:

```text
GITHUB_OWNER=lemonsnack-rgb
GITHUB_REPO=hotel_bot
GITHUB_BRANCH=main
GITHUB_WORKFLOW_FILE=daily.yml
```

자세한 배포 방법은 `VERCEL_DEPLOY_GUIDE.md`를 보세요.

## 관리자 화면에서 수정할 수 있는 항목

- 이메일 수신자
- 도시 / 지역
- 체크인 날짜
- 체크아웃 날짜
- 성인 수
- 어린이 수
- 어린이 나이
- 통화
- 이메일에 보낼 호텔 개수
- 최소 평점
- 가격 하락 시에만 발송 여부

## 수동 실행

GitHub에서 직접 실행하려면:

```text
Actions → Hotel Price Bot → Run workflow
```

Vercel 관리자 화면 배포 후에는 웹 화면에서 `지금 실행하기` 버튼을 누르면 됩니다.

## 자동 실행

기본 설정은 매일 한국시간 오전 9시입니다.

## 주의

- 실제 API Key, Gmail 앱 비밀번호, GitHub Token은 코드에 넣지 마세요.
- 비밀값은 반드시 GitHub Secrets 또는 Vercel Environment Variables에 넣으세요.
- 저장소가 Public이면 `config.json`의 이메일 수신자 주소가 외부에 보일 수 있습니다.
- 개인 프로젝트라면 저장소를 Private으로 바꾸는 것을 추천합니다.
- 호텔 가격은 조회 시점 기준이며 실제 예약 단계에서 달라질 수 있습니다.
