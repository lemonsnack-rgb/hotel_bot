# 비개발자용 호텔 최저가 이메일 봇 따라하기

이 문서는 코딩 경험이 많지 않은 분도 따라 할 수 있도록 작성한 안내서입니다.

## 목표

매일 오전 9시에 아래와 같은 이메일을 자동으로 받는 것이 목표입니다.

- 특정 지역 호텔 목록
- 최저가 순위
- 가격
- 평점
- 예약 확인 링크

## 전체 흐름

```text
1. SerpAPI 가입
2. Gmail 앱 비밀번호 만들기
3. GitHub 가입
4. 파일을 GitHub에 올리기
5. 비밀값 등록하기
6. 실행 버튼 누르기
7. 이메일 확인하기
```

---

# 1단계. SerpAPI 가입하기

SerpAPI는 Google Hotels 검색 결과를 프로그램에서 가져올 수 있게 해주는 서비스입니다.

1. SerpAPI 사이트에 가입합니다.
2. 로그인합니다.
3. 대시보드에서 API Key를 찾습니다.
4. API Key를 복사해 둡니다.

나중에 GitHub에 `SERPAPI_API_KEY`라는 이름으로 등록합니다.

주의: 무료 한도가 있으므로 처음에는 하루 1회, 지역 1곳만 조회하세요.

---

# 2단계. Gmail 앱 비밀번호 만들기

일반 Gmail 비밀번호를 직접 쓰면 안 됩니다.  
Google 계정에서 “앱 비밀번호”를 만들어 사용해야 합니다.

## 준비 조건

Google 계정에 2단계 인증이 켜져 있어야 합니다.

## 해야 할 일

1. Google 계정 관리로 이동합니다.
2. 보안 메뉴로 이동합니다.
3. 2단계 인증을 켭니다.
4. 앱 비밀번호를 생성합니다.
5. 생성된 16자리 비밀번호를 복사합니다.

이 값은 나중에 GitHub에 `GMAIL_APP_PASSWORD`라는 이름으로 등록합니다.

예시:

```text
abcd efgh ijkl mnop
```

실제로 입력할 때는 공백이 있어도 대부분 동작하지만, 문제가 생기면 공백 없이 입력하세요.

---

# 3단계. GitHub 가입하기

GitHub는 이 봇을 매일 자동 실행해주는 역할을 합니다.

1. GitHub에 가입합니다.
2. 새 저장소를 만듭니다.
3. 저장소 이름 예시:

```text
hotel-price-bot
```

4. 공개 저장소로 만들어도 되고, 비공개 저장소로 만들어도 됩니다.

개인용이면 비공개 저장소를 추천합니다.

---

# 4단계. 파일 올리기

압축 파일을 풀면 다음 파일들이 있습니다.

```text
main.py
config.json
requirements.txt
README.md
.github/workflows/daily.yml
```

GitHub 저장소 화면에서 다음 순서로 올립니다.

1. `Add file` 클릭
2. `Upload files` 클릭
3. 압축을 푼 파일 전체를 끌어다 놓기
4. `Commit changes` 클릭

주의: `.github` 폴더가 빠지면 자동 실행이 되지 않습니다.  
반드시 `.github/workflows/daily.yml` 파일이 올라가야 합니다.

---

# 5단계. GitHub 비밀값 등록하기

GitHub 저장소에서 다음 메뉴로 이동합니다.

```text
Settings
→ Secrets and variables
→ Actions
→ New repository secret
```

아래 4개를 하나씩 등록합니다.

## 1. SERPAPI_API_KEY

```text
Name: SERPAPI_API_KEY
Secret: SerpAPI에서 복사한 API Key
```

## 2. GMAIL_USER

```text
Name: GMAIL_USER
Secret: 보내는 Gmail 주소
```

예시:

```text
myname@gmail.com
```

## 3. GMAIL_APP_PASSWORD

```text
Name: GMAIL_APP_PASSWORD
Secret: Google에서 만든 앱 비밀번호
```

## 4. TO_EMAIL

```text
Name: TO_EMAIL
Secret: 이메일을 받을 주소
```

보내는 주소와 받는 주소가 같아도 됩니다.

---

# 6단계. 검색 조건 바꾸기

`config.json` 파일을 열면 아래와 같은 내용이 있습니다.

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

## 자주 바꾸는 항목

### 지역

```json
"location": "Seoul Myeongdong"
```

또는

```json
"location": "Jeju City"
```

처음에는 영어 지명을 추천합니다.

### 인원

```json
"adults": 2
```

### 며칠 뒤 숙박할지

```json
"days_after": 14
```

오늘부터 14일 뒤 체크인이라는 뜻입니다.

### 몇 박인지

```json
"nights": 1
```

1박이면 1, 2박이면 2입니다.

### 몇 개 호텔을 받을지

```json
"top_n": 5
```

### 평점 필터

```json
"min_rating": 4.0
```

4.0점 이상만 보고 싶을 때 사용합니다.  
처음에는 0으로 두는 것을 추천합니다.

### 가격이 내려갔을 때만 이메일 받기

```json
"send_only_when_price_drops": true
```

처음 테스트할 때는 반드시 `false`로 두세요.  
그래야 이메일이 잘 오는지 확인할 수 있습니다.

---

# 7단계. 수동 실행하기

GitHub 저장소에서:

```text
Actions
→ Hotel Price Bot
→ Run workflow
→ 초록색 Run workflow 버튼 클릭
```

잠시 후 실행 결과가 표시됩니다.

성공하면 이메일이 도착합니다.

---

# 8단계. 자동 실행 시간

현재 설정은 매일 한국시간 오전 9시입니다.

파일 위치:

```text
.github/workflows/daily.yml
```

아래 부분이 실행 시간입니다.

```yaml
- cron: "0 0 * * *"
```

GitHub는 UTC 기준을 사용합니다.  
한국시간 오전 9시는 UTC 0시입니다.

---

# 9단계. 자주 발생하는 문제

## 이메일이 오지 않음

확인할 것:

1. 스팸함 확인
2. `GMAIL_USER`가 정확한지 확인
3. `GMAIL_APP_PASSWORD`가 일반 비밀번호가 아닌지 확인
4. Google 계정 2단계 인증이 켜져 있는지 확인
5. `TO_EMAIL`이 정확한지 확인

## GitHub Actions가 실패함

GitHub 저장소에서:

```text
Actions
→ 실패한 실행 항목 클릭
→ 빨간색으로 표시된 단계 클릭
```

에러 메시지를 확인합니다.

## SerpAPI 에러

가능한 원인:

1. API Key가 틀림
2. 무료 한도 초과
3. 검색 지역명이 너무 모호함
4. 호텔 결과가 없는 날짜 조건

## 가격이 이상하게 표시됨

호텔 가격은 다음 조건에 따라 바뀔 수 있습니다.

- 세금 포함 여부
- 봉사료 포함 여부
- 환율
- 취소 가능 여부
- 객실 타입
- 조식 포함 여부

따라서 이메일 가격은 “참고용 최저가”로 보는 것이 안전합니다.

---

# 10단계. 추천 운영 방식

처음 1주일은 아래 설정으로 테스트하세요.

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

이메일이 안정적으로 오면 그다음에 아래처럼 바꾸세요.

```json
"send_only_when_price_drops": true
```

그러면 매일 이메일이 오는 대신, 가격이 내려간 경우에만 이메일을 받게 됩니다.

---

# 11단계. 비개발자에게 더 쉬운 방식

GitHub Actions 방식도 처음에는 어렵게 느껴질 수 있습니다.  
더 쉽게 만들려면 다음 중 하나로 개선할 수 있습니다.

## 개선안 A. 설정 파일만 수정하게 만들기

사용자는 `config.json`만 수정합니다.  
나머지 코드는 건드리지 않습니다.

## 개선안 B. Google Sheets로 조건 입력하기

사용자가 구글시트에 아래처럼 입력합니다.

| 지역 | 인원 | 며칠 뒤 | 숙박일수 | 최저가 개수 |
|---|---:|---:|---:|---:|
| Busan Haeundae | 2 | 14 | 1 | 5 |

봇은 Google Sheets를 읽어서 실행합니다.

## 개선안 C. 웹 화면 만들기

간단한 관리자 화면에서 지역, 날짜, 이메일을 입력하게 합니다.  
다만 이 경우 서버나 배포가 필요해서 비용과 난이도가 올라갑니다.

개인 프로젝트 최소비용 기준에서는 먼저 GitHub Actions 방식이 가장 적합합니다.
