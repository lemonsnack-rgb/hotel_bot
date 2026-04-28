# Vercel 배포 안내서

이 문서는 호텔 최저가 봇의 웹 관리자 화면을 Vercel에 배포하는 방법입니다.

## 1. 현재 구조

```text
Vercel 웹 관리자 화면
→ Vercel 서버 API
→ GitHub config.json 수정
→ GitHub Actions 수동 실행
→ Python 봇 실행
→ 호텔 최저가 이메일 발송
```

관리자 화면에서 수정할 수 있는 항목:

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

---

# 2. GitHub Personal Access Token 만들기

Vercel 관리자 화면이 GitHub 저장소의 `config.json`을 수정하고 GitHub Actions를 실행하려면 GitHub 토큰이 필요합니다.

## 추천: Fine-grained token

GitHub에서 다음 순서로 이동합니다.

```text
오른쪽 위 프로필 사진
→ Settings
→ Developer settings
→ Personal access tokens
→ Fine-grained tokens
→ Generate new token
```

설정 예시:

```text
Token name: hotel-bot-vercel-admin
Repository access: Only select repositories
선택할 저장소: lemonsnack-rgb/hotel_bot
```

Repository permissions는 최소한 아래 권한이 필요합니다.

```text
Contents: Read and write
Actions: Read and write
Metadata: Read-only
```

토큰을 만든 뒤 복사해 둡니다. 이 값은 한 번만 표시됩니다.

---

# 3. Vercel에 프로젝트 연결하기

1. Vercel에 로그인합니다.
2. Add New Project를 클릭합니다.
3. GitHub 계정을 연결합니다.
4. `lemonsnack-rgb/hotel_bot` 저장소를 선택합니다.
5. Framework Preset이 `Next.js`인지 확인합니다.
6. Deploy를 누르기 전에 환경변수를 등록합니다.

---

# 4. Vercel 환경변수 등록

Vercel 프로젝트 설정에서:

```text
Settings
→ Environment Variables
```

아래 값을 등록합니다.

## 필수 환경변수

### ADMIN_PASSWORD

관리자 화면 접속 후 설정 저장/실행에 사용할 비밀번호입니다.

```text
Name: ADMIN_PASSWORD
Value: 직접 정한 관리자 비밀번호
```

예시:

```text
hotel-admin-1234
```

너무 쉬운 비밀번호는 피하세요.

### GITHUB_TOKEN

GitHub에서 만든 Personal Access Token입니다.

```text
Name: GITHUB_TOKEN
Value: GitHub에서 복사한 토큰
```

## 선택 환경변수

기본값을 그대로 쓰면 등록하지 않아도 됩니다.

```text
GITHUB_OWNER=lemonsnack-rgb
GITHUB_REPO=hotel_bot
GITHUB_BRANCH=main
GITHUB_WORKFLOW_FILE=daily.yml
```

---

# 5. 배포하기

환경변수를 등록한 뒤 Deploy를 실행합니다.

배포가 끝나면 Vercel이 웹 주소를 줍니다.

예시:

```text
https://hotel-bot-admin.vercel.app
```

이 주소에 접속하면 관리자 화면이 열립니다.

---

# 6. 관리자 화면 사용법

1. 관리자 비밀번호를 입력합니다.
2. `현재 설정 불러오기`를 누릅니다.
3. 이메일 수신자, 도시, 날짜, 숙박객 수를 수정합니다.
4. `설정 저장하기`를 누릅니다.
5. 바로 테스트하려면 `지금 실행하기`를 누릅니다.
6. GitHub 저장소의 Actions 탭에서 실행 상태를 확인합니다.

---

# 7. GitHub Actions Secrets는 계속 필요합니다

Vercel 관리자 화면은 설정을 바꾸고 실행을 요청하는 역할입니다.
호텔 검색과 이메일 발송은 GitHub Actions에서 실행되는 Python 봇이 담당합니다.

따라서 GitHub 저장소에는 아래 Secrets가 계속 필요합니다.

```text
SERPAPI_API_KEY
GMAIL_USER
GMAIL_APP_PASSWORD
```

`TO_EMAIL`은 이제 관리자 화면의 이메일 수신자 값으로 대체할 수 있습니다.
단, 비상용으로 GitHub Secrets에 `TO_EMAIL`을 남겨두어도 됩니다.

---

# 8. 주의사항

현재 저장소가 Public이면 `config.json`의 이메일 수신자 주소가 외부에 보일 수 있습니다.
개인 프로젝트라면 GitHub 저장소를 Private으로 바꾸는 것을 추천합니다.

관리자 비밀번호와 GitHub 토큰은 절대 코드에 넣지 마세요.
반드시 Vercel Environment Variables에만 저장하세요.
