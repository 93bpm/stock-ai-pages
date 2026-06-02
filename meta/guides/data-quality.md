# guides/data-quality.md — 데이터 등급 + Sanity Check + 마스킹 금지

routine이 **JSON 생성 후 저장 전 검증 단계**에서 정독.
관련 체크리스트: `meta/context.md` "✅ Sanity Check", "🎨 카운트" 섹션.

---

## §1. 데이터 등급

### 🟢 등급 A (실값, 정확성 최우선)

- Stooq/Trading Economics/Investing.com 응답 **그대로** 사용
- 직접 추론·해석 추가 금지
- Sanity Check 후 저장 (§4)

### 🟡 등급 B+ (Claude 추론·추출)

- 호악재 판단: 일반 시장 상식 기반 합리적 판단
- 수치 추출은 **원문에 명시된 값만** 사용. 추측·계산 금지
- 정보 불충분 → **마스킹 금지** (§3). 해당 항목 자체를 배열에서 제거 또는 빈 값으로
- 정확도 100% 보장 아님 → 사용자 면책 전제

### 🟠 등급 B (외부 캘린더 일정 — v1.5.0 신설)

- 7일·30일 future window 일정 (`calendarWeek`, `calendarMonth`)
- 출처: Investing.com earnings 캘린더 + Trading Economics + WebSearch (학회 일정 정확 날짜 확인)
- **공지된 일정만** 포함 (추측·기억 금지). 발표일 미공지면 그 항목 자체 제외
- 학회·빅테크 이벤트는 **화이트리스트 매칭** 필수 (`data/whitelist-conferences.json` 17종) — 매칭 없으면 추가 X
- 韓 실적은 **시총 화이트리스트 hit만** (`data/whitelist-kr-marketcap.json`) — 시총 2000억+
- 美 빅테크 실적은 **화이트리스트 hit만** (`data/whitelist-us-bigtech.json`) — M7+반도체 11종 ★v1.6.0★
- 정확도 100% 보장 아님 (일정 변경·연기 가능). 매일 갱신으로 보정

---

## §2. categoryStyle 매핑 룰 (뉴스 아이템)

| categoryStyle | 색상 | 해당 카테고리 (`category` 라벨 예시) |
|---|---|---|
| `default` | 파랑 | 통화정책, 거시, 정책, 환율, 수급, 기업(일반 실적·M&A·지배구조), 코스닥, 증시제도, 금융, 거래소제도, 부동산정책 |
| `geo` | 빨강 | 지정학, 갈등, 관세, 전쟁, 외교, 원자재(공급차질) |
| `tech` | 초록 | 반도체, 2차전지, 바이오, 조선·방산, 엔터·콘텐츠, AI, IT, 자동차, 게임, 우주항공, 기업(산업·테마 맥락) |

### 판단 우선순위

1. 산업/테마 관련 → `tech`
2. 지정학·리스크 관련 → `geo`
3. 그 외 → `default`

### 모호 케이스 처리 (HTML index의 실제 사용 예 기반)

- "기업"이 일반 실적·M&A·지배구조 → `default`
- "기업"이 특정 산업(반도체/IT/AI/2차전지/조선 등) 맥락 → `tech`
- 결정 어려우면 `category` 라벨 자체를 더 구체화. 예: "기업" → "반도체" 또는 "IT" 같은 산업명으로 변경 후 `tech` 부여
- "원자재" 카테고리 중 가격(거시) 맥락이면 `default`, 공급차질·자원무기화면 `geo`

---

## §3. 🔴 마스킹 절대 금지 — 정확값 또는 항목 제거

**원칙: 마스킹값(`+3,2xx`, `5x.x조`, `○○○ · △△△ · □□□`, `X.x%` 등)을 데이터에 절대 넣지 말 것.** 실값을 못 찾으면 해당 항목 자체를 제거하거나 빈 값으로.

전체 skip은 **필수 필드 누락** 같은 불가피한 경우에만. 부분 누락은 §5 룰로 처리.

### Sanity Check 마스킹 grep 패턴

```
+\d+,\dxx      # 수급 마스킹 (+3,2xx)
\dx\.x조       # 시장체력 마스킹 (5x.x조)
○○○            # 종목명 마스킹
[+-]?X\.x%    # 종목 등락률 마스킹 (+X.x%, -X.x%)
```

→ 발견 시 그 항목 제거 또는 fallback 재시도.

---

## §4. Sanity Check (생성 후 검증)

저장 전 다음을 확인. **실패 시 그날 데이터 skip + manifest 갱신 안 함**:

```
[지수값 범위]
  S&P 500: 1,000 < value < 100,000
  나스닥: 1,000 < value < 100,000
  코스피: 100 < value < 100,000
  VIX: 0 < value < 200

[등락률 범위]
  |change| < 20% (그 이상은 의심)

[필드 일관성]
  date 필드 == 파일명 날짜
  weekday == date의 실제 요일
  모든 required 필드 충족

[KST 날짜 검증 — ★v1.4.1 신설★ — UTC↔KST 사고 차단]
  ① 현재 UTC 시각 획득 → +9h → KST 시각 계산
  ② data.date == 그 KST 시각의 날짜 부분 (YYYY-MM-DD)
  ③ data.weekday == 그 KST 시각의 실제 요일 (일/월/화/수/목/금/토)
  ④ generatedAt == 현재 KST ISO 시각 (예: "2026-05-26T08:17:00+09:00")
  ⑤ briefing 파일명 == data.date (예: "briefing/2026-05-26.json")
  → 위반 시 sanity fail (그날 skip)

  ★사고 사례 (2026-05-25 발화)★:
    UTC 5/25 23:17 발화 시 KST = 5/26인데
    옛 routine이 UTC 그대로 사용 → data.date="2026-05-25"로 저장 (5/25.json 파일명)
    → 모든 briefing이 1일씩 어긋난 채로 누적
  ★재발 방지 룰★:
    routine은 발화 시작 시 반드시 "현재 UTC + 9h" 계산을 명시적으로 수행
    UTC 날짜를 그대로 data.date에 사용 절대 금지

[뉴스 카운트]
  world.global.length == 12
  world.domestic.length == 12

[뉴스 sourceUrl 검증 — ★v1.4.0 신설★]
  ① 모든 뉴스(24건)에 sourceUrl 필드 존재 + 빈 문자열·null 0건
  ② sourceUrl 도메인이 차단 리스트에 속하지 않음
     (bloomberg.com, wsj.com, ft.com, reuters.com, mk.co.kr, yna.co.kr)
  ③ sourceUrl 중복 0건 (24건 모두 unique)
  ④ source 표기 ↔ sourceUrl 도메인 일관성 (guides/news.md §5 매핑 표 참조)
  ⑤ sourceUrl 형식 valid URL (http/https로 시작)
  → 위반 발견 시: 그 뉴스만 후보 교체 후 재선별 (guides/news.md §2). 24건 못 채우면 fail

[데이터 출처 신선도]
  Stooq 응답 날짜가 date에서 5일 이상 떨어지면 의심 (주말·휴장일 감안)

[필드 관계 검증]
  subNoteEm: 섹션 핵심 헤드라인 (v1.6.0 — subNote의 부분문자열일 필요 없음).
    UI(emWrap)가 부분문자열이면 inline 강조, 아니면 별도 헤드라인(.em-lead)+보조(.aux)로 분리 표시 → 유실 0.
    검증은 "존재 여부"만 (빈 값 SOFT 경고). 부분문자열 강제 룰 폐지.

[캘린더 확장 일관성 — ★v1.5.0 신설★]
  todayIdx 정의: calendarWeek.days 배열에서 data.date 와 일치하는 day 의 index (0=일요일 ~ 6=토요일).
                예: data.date="2026-05-28"(목) → calendarWeek.days[4]
  ① calendarWeek 존재 시 days.length === 7 (빈 날도 items:[] 포함)
  ② calendarWeek.start 의 요일 === 일요일 (0), end 의 요일 === 토요일 (6)
  ③ calendarWeek.start ~ end 가 정확히 7일 (start + 6일 === end)
  ④ data.date 가 calendarWeek.start ~ end 범위 안
  ⑤ 오늘 일정 일관성: calendar.domestic/global 의 일정이 calendarWeek.days[todayIdx].items 에도 모두 존재
     (옛 데이터 호환: calendarWeek 없으면 검증 skip)
  ⑥ calendarMonth.year/month === KST 의 year/month (data.date 의 연·월)
  ⑦ calendarMonth.days[*].date 가 모두 그 달 범위 안 (year-month-01 ~ year-month-말일)
  ⑧ 실적(earnings) 종목이 화이트리스트 안에 있어야 함 (region별):
     · region="domestic" → data/whitelist-kr-marketcap.json (시총 2000억+ 韓)
     · region="global"   → data/whitelist-us-bigtech.json (M7 + 韓 직결 반도체 11종) ★v1.6.0
  ⑨ 학회/컨퍼런스(category="conference") 가 data/whitelist-conferences.json 의 행사 키와 매칭

[마스킹값 grep]
  §3의 4개 패턴 (+3,2xx / 5x.x조 / ○○○ / X.x%) 0건이어야 함

[페르소나 위반 grep — ★v1.5.1 신설★]
  LLM 의견 필드(115건)에 대해 다음 패턴 0건이어야 함:
  ① 단정 표현: 확실히|반드시|틀림없이|분명히|당연히
  ② 추천성: 매수 추천|매도 추천|매수해야|매도해야|사야 합니다|팔아야 합니다
  ③ 격식체: ~하다\.|~된다\.|~한다\.  (의견 필드만, 명사형 제외)
  ④ 길이 위반 ★v1.5.1 보강★:
     - title 30자 초과 (글로벌 12 + 국내 12 = 24건 검사)
     - summary 60자 초과 (24건)
     - note 25자 초과 (24건)
     - kr.expectedRange / calendar.theme 등도 형식 확인
     - 문자 수 기준 (한글·영문·숫자 모두 1자=1자, byte 수 아님)
  → 위반 시 그 필드 재작성. guides/operations.md §1.1 길이 룰 + §1.2·§1.3 페르소나 본문 참고

[미세 차이 허용 범위]
  여러 출처에서 값을 가져올 때 1-2 단위 차이(예: VIX 16.70 vs 16.64)는 허용
  - 출처별로 timestamp가 다를 수 있음 (4:00 PM vs 4:15 PM close)
  - 1차 출처 우선, 차이가 5% 이상이면 의심하고 재확인
```

---

## §5. 부분 누락 fallback 룰

| 누락 항목 | 처리 |
|---|---|
| Stooq 지수 1-2개 (예: `^kosdaq` 응답 실패) | `guides/sources.md §3·§4` fallback 체인 끝까지 시도 (Yahoo→Google→Investing→WebSearch). **그래도 못 찾으면 그날 skip** (manifest 미갱신) |
| 美 섹터 ETF 일부 (11개 중 일부) | 가져온 ETF만으로 정렬해 TOP 5 산출 (집합이 작아져도 5개 유지). 5개 미만이면 가져온 만큼만 (배열 길이 줄임) |
| 뉴스 12건 미만 또는 sourceUrl 누락 | **반드시 12건 채움 + sourceUrl 24/24**. 차단 도메인 후보는 동일 사건의 공개 매체로 교체. 그래도 안 되면 ① 검색 쿼리 추가 확대 ② 시점 ±2일까지 확장 ③ 그래도 안 되면 **그날 skip** |
| 수급 추출 실패 (외인/기관/개인 중 하나라도) | 한경/이데일리/MT/파이낸셜뉴스 1차 시도. 그래도 못 찾으면 **해당 주체 항목을 supply 배열에서 제거** (스키마 minItems 일시적 위반 가능 — 그건 sanity check 실패로 처리). 프로그램 매매는 v1에서 제외 (3주체만) |
| 업종 등락 (`kr.sectorsUp/Down`) | 테마 + 대표 종목 형식. `guides/sources.md §10` 순서로 stockChange 정확값 확보 우선. 못 찾으면 **해당 항목을 sectorsUp/Down 배열에서 제거** |
| 시장체력 — 예탁금/신용잔고 (필수) | 실값 우선 (한경/이데일리/MT 기사). 못 찾으면 health 배열에서 제거 |
| 시장체력 — 공매도 잔고 상위 (선택) | 종목명 못 찾으면 health 배열에서 제거 (배열 2개로 줄어듦) |
| 경제일정 없음 (주말 등) | `timed: []`, `untimed: []` 빈 배열 + `subNote`에 "주말·공휴일로 주요 일정 없음" |
| 야간선물/ADR 못 찾을 때 | flow 배열에서 해당 항목 제거 (배열 길이 줄임) |

---

## §6. HTML 디자인 제약 — 반드시 카운트 채우기

> **카운트 SSOT = [`meta/schema.json`](../schema.json)** — 모든 배열에 `minItems`/`maxItems`로 명시. 아래 표는 schema에서 인용한 사용자-가시 영향.

인덱스 HTML이 일부 영역은 **고정 카운트**를 가정하고 정적 라벨·CSS Grid로 구현되어 있어요. 항목이 부족하면 디자인이 어색해집니다 (마스킹 금지라 빈 자리/숫자 안 맞는 라벨이 그대로 노출):

| 영역 | 가정 카운트 | 부족 시 영향 |
|---|---|---|
| `us.indices` (2x2 grid) | 4개 | 3개 이하 → grid 깨짐 |
| `us.indicators` (wrap) | 6개 | 5개 이하 → 자연스럽게 줄어듦 |
| `us.sectorsUp/Down` | 5+5개 | 4개 이하 → 정적 라벨 `상승 섹터 TOP 5`가 어색 |
| `kr.indices` (pair) | 2개 | 1개 → grid 깨짐 |
| `kr.flow` | 3개 | 2개 이하 → 자연스럽게 줄어듦 |
| `kr.supply` (3열 grid) | 3개 | 2개 이하 → 빈 칸 발생 |
| `kr.sectorsUp/Down` | 5+5개 | 4개 이하 → 정적 라벨 `강세 업종 TOP 5`가 어색 |
| `world.global` / `world.domestic` | 12+12개 | 미만이면 어색 (카운트 라벨도 동적) |
| `calendarWeek.days` ★v1.5.0★ | **7개 (고정)** | 7개 미만이면 일~토 그리드 깨짐. 빈 날도 `items: []` 로 포함 |
| `calendarMonth.days` ★v1.5.0★ | hit only (가변) | 빈 날 생략. 1~말일 범위 안의 hit 날만 포함 |

→ **fallback 체인 끝까지 적극 시도해서 반드시 카운트 채울 것**. 다양한 출처·검색 쿼리·종목 후보로 노력. 정말 못 채우면 그건 운영 측 신호 (출처 측 큰 변화나 환경 차단). 그날 발화 후 사용자가 알아챌 수 있음.
