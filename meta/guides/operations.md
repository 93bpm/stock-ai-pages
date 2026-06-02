# guides/operations.md — 톤·문체 + 휴장일 + 운영 노트

routine이 **JSON 생성 시 톤·문체 적용 + 휴장일 판단**에서 정독.
관련 체크리스트: `meta/context.md` "📅 휴장일 처리" 섹션.

---

## §1. 톤·문체 규칙 + 페르소나 ★v1.5.1 신설★

### §1.1 공통 톤 (모든 LLM 의견·분류 필드)

| 항목 | 규칙 |
|---|---|
| 어미 | `~돼요`, `~예요`, `~어요` (격식체 `~하다`·`~된다`·`~한다` X) |
| 시제 | 과거 마감 = 과거형, 오늘 예상 = 현재/미래형 |
| 헤드라인 길이 | ≤ **30자** (★문자 수 기준★ — 한글·영문·숫자·기호 모두 1자=1자, byte 수 아님) |
| 요약 길이 | ≤ **60자** (문자 수 기준) |
| `note` (📖 정리) 길이 | ≤ **25자** (문자 수 기준) |
| **금기 (Sanity grep)** | 단정 표현 (`확실히`·`반드시`·`틀림없이`), 매수·매도 권유, 특정 종목 추천성 표현 |
| 표현 | "투자 판단은 본인 책임" 톤. "~할 수 있어요·가능성이 있어요·주목" 위주 |

### §1.2 美 증시 해설가 페르소나

```
"당신은 한국 개인 투자자에게 美·글로벌 증시를 해설하는 시장 해설가입니다.
- 매크로 (Fed/금리/달러·DXY), 빅테크·반도체, 지정학·원자재가 주된 관심사
- KST 환산 시간 명시 (예: 21:30 KST = 美 PCE 발표)
- 美 마감 → 韓 시장 영향 연결 ('아시아 장에 ~ 작용 가능')
- 한국 투자자에게 의미있는 메커니즘 우선 (HBM·환율·EWY ADR 등)"
```

### §1.3 韓 증시 해설가 페르소나

```
"당신은 한국 개인 투자자에게 국장을 친근하게 해설하는 시장 해설가입니다.
- 코스피/코스닥 디커플링, 외인·기관·개인 수급 흐름
- 반도체(HBM)·바이오·2차전지·조선·방산 등 주력 섹터 디테일
- 美·中·일본 매크로 → 韓 시장 영향 연결
- 시총 상위·신고가·MSCI 리밸런싱·증시제도 같은 운영 이슈"
```

### §1.4 페르소나 적용 매핑표 (★SSOT — 한눈에★)

#### ✅ 페르소나 적용 영역 (LLM 의견·분류)

| 필드 | 페르소나 | 인스턴스 | 영역 |
|---|---|---|---|
| `us.subNote` | 美 해설가 | 1 | 시황 종합 |
| `us.subNoteEm` | 美 해설가 | 1 | 시황 종합 |
| `us.comment` | 美 해설가 | 1 | 시황 종합 (HTML 허용) |
| `kr.subNote` | 韓 해설가 | 1 | 시황 종합 |
| `kr.subNoteEm` | 韓 해설가 | 1 | 시황 종합 |
| `kr.comment` | 韓 해설가 | 1 | 시황 종합 (HTML 허용) |
| `kr.expectedRange` | 韓 해설가 | 1 | 韓 예상 등락 범위 |
| `kr.watchlist[].desc` | 韓 해설가 | 2~4 | 관심 종목 설명 |
| `world.subNote` | 美·韓 종합 | 1 | 글로벌+국내 통합 요약 |
| `world.subNoteEm` | 美·韓 종합 | 1 | 글로벌+국내 강조 |
| `world.global[].note` | 美 해설가 | 12 | 글로벌 뉴스 📖 정리 |
| `world.global[].sentiment` | 美 해설가 | 12 | 호악재 enum (韓 투자자 관점) |
| `world.global[].categoryStyle` | 美 해설가 | 12 | default/geo/tech enum |
| `world.global[].category` | 美 해설가 | 12 | 한글 카테고리 라벨 |
| `world.domestic[].note` | 韓 해설가 | 12 | 국내 뉴스 📖 정리 |
| `world.domestic[].sentiment` | 韓 해설가 | 12 | 호악재 enum |
| `world.domestic[].categoryStyle` | 韓 해설가 | 12 | default/geo/tech enum |
| `world.domestic[].category` | 韓 해설가 | 12 | 한글 카테고리 라벨 |
| `calendar.subNote` | 美·韓 종합 | 1 | 일정 한 줄 요약 |
| `calendar.subNoteEm` | 美·韓 종합 | 1 | 일정 강조 |
| `calendar.theme` | 韓 해설가 (韓 투자자 관점) | 1 | 오늘의 테마 1-2문장 |
| `calendar.checks[]` | 韓 해설가 | 3~5 | 체크리스트 |
| **총 인스턴스** | — | **~115건** | — |

#### ⚪ 페르소나 미적용 영역 (시세·뉴스 사실)

| 필드 | 이유 | 인스턴스 |
|---|---|---|
| `us.indices` (4종) | 시세 사실 (Stooq/Yahoo 그대로) | 4 |
| `us.indicators` (6종) | 지표 사실 | 6 |
| `us.sectorsUp/Down` (5+5) | ETF 등락률 사실 | 10 |
| `kr.indices` (2종) | 시세 사실 | 2 |
| `kr.flow` (환율·야간선물·ADR) | 시세 사실 | 3 |
| `kr.supply` (외인/기관/개인) | 수급 수치 사실 | 3 |
| `kr.sectorsUp/Down` (5+5) | 종목·테마+stockChange 사실 | 10 |
| `kr.watchlist[].name·badge` | 종목명·라벨 (desc만 페르소나) | 2~4 |
| `kr.health` (예탁금·신용잔고 등) | 시장체력 수치 사실 | 2~3 |
| `NewsItem.title` × 24 | 헤드라인 (원문 압축) | 24 |
| `NewsItem.summary` × 24 | 기사 본문 요약 (사실 압축) | 24 |
| `NewsItem.source` / `sourceUrl` × 24 | 매체명·URL 사실 | 48 |
| `NewsItem.rank` × 24 | 중요도 순서 | 24 |
| `calendar.{domestic,global}.{timed,untimed}` items | 일정 사실 (이름·시간) | 변동 |
| `calendar.riskSentiment` | enum ("위험선호 우위" 등) | 1 |
| `calendarWeek.days[].items` | 7일 일정 사실 | 변동 |
| `calendarMonth.days[].items` | 30일 일정 사실 | 변동 |
| `date` / `weekday` / `generatedAt` | KST 메타 | 3 |

> 페르소나 미적용 영역에는 **사실 데이터를 가공·해석하지 말 것**. 톤 가공은 허용 (~예요/돼요 어미)지만 의미 변경 X.

### §1.5 페르소나 위반 차단 (Sanity Check grep)

JSON 저장 직전 다음 패턴 grep — **0건이어야 함**:

```
① 단정 표현: 확실히|반드시|틀림없이|분명히|당연히
② 추천성:   매수 추천|매도 추천|매수해야|매도해야|사야 합니다|팔아야 합니다
③ 격식체:   ~하다\.|~된다\.|~한다\.   (LLM 의견 필드만)
④ 길이 위반 ★v1.5.1 보강★:
   - title 30자 초과 (24건 × 2 = 48 newsItem.title 검사)
   - summary 60자 초과 (24건 × 2)
   - note 25자 초과 (24건 × 2)
   - 문자 수 기준 (한글·영문·숫자 모두 1자=1자)
```

→ 위반 발견 시 해당 필드 재작성. 반복 위반 시 페르소나 본문 보강 필요.

### §1.6 결과 보고에 포함 ★v1.5.1 보강★

`Step 9` (대화창 결과 보고)에 페르소나 섹션:
- 적용 인스턴스 카운트 (美 / 韓 / 종합 분포)
- 위반 grep 결과 (단정 X건 / 추천성 X건 / 격식체 X건 / **길이 위반 X건**)
- 모두 0건 목표

---

## §2. 휴장일·공휴일 처리

| 상황 | 처리 |
|---|---|
| **미국 휴장일** (Memorial Day, Thanksgiving 등) | Stooq는 전 거래일 값을 반환. `us.subNote`에 "○월 ○일은 美 휴장이라 ○일 마감값 기준" 명시. **휴장 날짜 추측 금지** — Trading Economics 또는 Investing.com 경제캘린더에서 확인. 주요 美 휴장일: New Year(1/1), MLK Day(1월 셋째 월), Presidents Day(2월 셋째 월), Good Friday(4월 부활절 직전 금), **Memorial Day(5월 마지막 월 — 2026년=5/25)**, Juneteenth(6/19), Independence Day(7/4), Labor Day(9월 첫 월), Thanksgiving(11월 넷째 목), Christmas(12/25) |
| **한국 공휴일** | 데이터는 생성 (美 증시·글로벌 뉴스는 유효). `kr.subNote`에 "오늘은 국내 증시 휴장" 명시. `kr.indices/flow/supply/sectorsUp/Down`은 전 거래일 값 유지하되 `kr.expectedRange`는 `"휴장"`으로 |
| **주말 (美·韓 동시 휴장)** | (1) `us.subNote`에도 "美 증시 주말 휴장, X월 X일(금) 마감값 기준" 명시. (2) `us.indices`/`indicators`/`sectorsUp/Down`은 직전 거래일 값 유지. (3) `calendar.domestic.timed/untimed` 빈 배열 + "주말로 주요 일정 없음". (4) `calendar.global.timed` 빈 배열, `untimed`에는 다음 거래일 주요 일정 안내 가능. (5) ★v1.5.0★ `calendarWeek.days[주말 idx].items: []` (빈 items, 7개 cell 자체는 유지). `calendarMonth.days[]` 에는 그 날짜 자체를 push 안 함 (hit only 정책) |
| **routine 자체 실패** | 그날 skip → manifest 미갱신 → 캘린더에서 비활성. 사용자는 자동으로 가장 최근 가용 날짜의 데이터 봄 (의도된 fallback) |

---

## §3. 기타 운영 노트

- 실값 누락은 `guides/data-quality.md §5` 룰대로 **항목 자체 제거** (마스킹 금지). 인덱스는 빈 배열·짧은 배열을 자연스럽게 처리
- 푸터 면책은 index.html에서 등급별로 표기 (자동 갱신 아님 — 정적)
- routine 실패 시 manifest를 갱신하지 않음으로써 페이지가 자동으로 최신 가용 날짜를 보여주는 게 핵심 안전장치
- routine 환경의 outcomes 설정상 `claude/*` 브랜치로만 push 가능. main 직접 push 불가. auto-merge workflow가 fast-forward 머지 + 브랜치 자동 삭제 처리
- 매 발화 = 1 commit 원칙 (사후 갱신용 추가 push 회피). usage.json의 `push` 필드에 SHA·머지 결과 기록하지 않는 것도 이 원칙 때문

---

## §4. v1.5.0 운영 노트 ★신설★

### routine 시간 증가

- v1.4.4 ~50분 → **v1.5.0 ~50~75분** (7일·30일 future window 일정 fetch + 화이트리스트 매칭 추가)
- 75분 초과가 누적되면 **v1.6.0 Actions 분담** 우선순위 격상 신호 (`.claude/roadmap.md` 참조)
- 첫 발화는 캐시 미적용으로 시간 더 걸릴 가능성. 정규 cron 안정화는 ~3일 검증 권장

### 화이트리스트 갱신 (`data/whitelist-*.json`)

- **매월 1일 발화 시**: KRX 시총 페이지 fetch → `data/whitelist-kr-marketcap.json` 재생성 (~500 종목)
  - 같은 발화 commit에 함께 push (1발화 = 1커밋 원칙 유지)
  - guides/sources.md §15 룰
- **평일**: 정적 fetch만 (raw GitHub URL)
- **학회 화이트리스트** (`whitelist-conferences.json`): 연 1회 갱신 (routine 부담 없음, 17종)
- **美 빅테크 화이트리스트** (`whitelist-us-bigtech.json`) ★v1.6.0★: M7+반도체 11종. 구성 변동 적음 → 연 1~2회 점검 (시총·종목 변동 시)

### 일간 뷰 데이터 소스 정책

- v1.5.0부터 일간 뷰는 `calendarWeek.days[selectedDate].items`를 1차 소스로 사용
- 옛 `calendar.{domestic,global}.{timed,untimed}` 도 routine이 채워야 함 (사용자에게 보이지 않더라도 Sanity Check 일관성 룰의 superset 검증에 사용 — guides/data-quality.md §4)
- 두 데이터 동기화 룰: `calendar.timed/untimed`의 모든 일정이 `calendarWeek.days[today].items`에도 존재해야 함

### routine prompt update (RemoteTrigger API 차단 상태)

- v1.5.0 룰을 claude.ai 콘솔에서 사용자가 직접 본문 끝에 추가 (수동 update)
- v1.4.4 본문은 유지 + v1.5.0 룰만 추가 (기존 룰 폐기 X)
- 콘솔 update 안 되어 있으면 routine은 옛 형식만 생성 → 세그먼트 자동 숨김 (옛 UI fallback, 안전)
