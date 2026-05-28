# guides/operations.md — 톤·문체 + 휴장일 + 운영 노트

routine이 **JSON 생성 시 톤·문체 적용 + 휴장일 판단**에서 정독.
관련 체크리스트: `meta/context.md` "📅 휴장일 처리" 섹션.

---

## §1. 톤·문체 규칙

| 항목 | 규칙 |
|---|---|
| 어미 | `~돼요`, `~예요`, `~어요` (격식체 X) |
| 시제 | 과거 마감 = 과거형, 오늘 예상 = 현재/미래형 |
| 헤드라인 길이 | ≤ 30자 |
| 요약 길이 | ≤ 60자 |
| `note` (📖 정리) 길이 | ≤ 25자 |
| 금기 | 단정적 가격 예측 ("확실히 오를 것"), 매수 권유, 특정 종목 추천성 표현 |
| 표현 | "투자 판단은 본인 책임" 톤 유지. "~할 수 있어요", "~가능성이 있어요" 위주 |

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
- **학회 화이트리스트** (`whitelist-conferences.json`): 연 1회 갱신 (routine 부담 없음)

### 일간 뷰 데이터 소스 정책

- v1.5.0부터 일간 뷰는 `calendarWeek.days[selectedDate].items`를 1차 소스로 사용
- 옛 `calendar.{domestic,global}.{timed,untimed}` 도 routine이 채워야 함 (사용자에게 보이지 않더라도 Sanity Check 일관성 룰의 superset 검증에 사용 — guides/data-quality.md §4)
- 두 데이터 동기화 룰: `calendar.timed/untimed`의 모든 일정이 `calendarWeek.days[today].items`에도 존재해야 함

### routine prompt update (RemoteTrigger API 차단 상태)

- v1.5.0 룰을 claude.ai 콘솔에서 사용자가 직접 본문 끝에 추가 (수동 update)
- v1.4.4 본문은 유지 + v1.5.0 룰만 추가 (기존 룰 폐기 X)
- 콘솔 update 안 되어 있으면 routine은 옛 형식만 생성 → 세그먼트 자동 숨김 (옛 UI fallback, 안전)
