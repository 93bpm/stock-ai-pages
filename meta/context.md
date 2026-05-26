# Daily Briefing Context

`stock-ai-pages` 일일 데이터 생성 routine이 매 발화 시 따르는 **메인 체크리스트**.
디테일은 항목 옆 `→ guides/xxx.md §N` 링크로 분리. routine이 해당 작업 단계에서 그 파일을 추가 fetch.

스키마: [`schema.json`](./schema.json)

---

## 산출물 (3개 파일)

매일 **KST 07:40** (cron `40 22 * * *` UTC) 자동 실행되어 다음 세 파일을 생성·갱신:

| 파일 | 역할 | 갱신 방식 |
|---|---|---|
| `briefing/YYYY-MM-DD.json` | 그날의 브리핑 데이터 (스키마 준수) | 신규 생성 (immutable) |
| `meta/manifest.json` | 가용 날짜 목록 (`{"dates":[...], "latest":"YYYY-MM-DD"}`) | dates 배열에 append + 정렬 |
| `meta/usage.json` | 발화별 사용량 history (토큰·도구·출처 등) | history 배열에 entry 1개 append |

세 파일은 **같은 커밋**으로 푸시 (원자성).

---

## guides/ 단계별 fetch 매핑

routine은 시작에 `context.md` + `schema.json`만 fetch. 각 작업 단계에서 필요한 guides를 그 시점에 추가 fetch:

| 작업 단계 | 추가 fetch |
|---|---|
| 데이터 수집 (출처별 fallback) | [`guides/sources.md`](./guides/sources.md) |
| 뉴스 큐레이션 (sourceUrl 일체화) | [`guides/news.md`](./guides/news.md) ★필수★ |
| Sanity Check + 마스킹 검증 + 카운트 | [`guides/data-quality.md`](./guides/data-quality.md) |
| manifest·usage.json 갱신 + HTML 렌더링 | [`guides/outputs.md`](./guides/outputs.md) |
| 휴장일·주말 처리 + 톤·문체 | [`guides/operations.md`](./guides/operations.md) |

---

## 매 발화 체크리스트

### 🔴 데이터 정확도 (최우선)
- [ ] 마스킹값 0건 (`+3,2xx`, `5x.x조`, `○○○`, `X.x%`) → [`guides/data-quality.md §3`](./guides/data-quality.md)
- [ ] 美 지수는 진짜 지수 값 (ETF 가격 금지. SOX만 SOXX 대용) → [`guides/sources.md §2`](./guides/sources.md)
- [ ] 원/달러 15:30 마감 종가 (장중 고가 X) → [`guides/sources.md §7`](./guides/sources.md)
- [ ] 추측·기억 금지 — 가이드 출처에서만

### 📊 데이터 수집 (출처별 fallback 체인)
- [ ] 美 지수·지표·섹터 ETF: Stooq → Yahoo → Google → Investing → WebSearch
- [ ] 韓 지수·환율: Stooq → Yahoo (`^KS11`/`^KQ11`) → Investing → 마감 기사
- [ ] 韓 개별 종목 (sectorsUp/Down): Yahoo (`{6자리}.KS`/`.KQ`) → Google (`:KRX`) → Investing (slug)
- [ ] 美 섹터 ETF: Stooq → finviz quote → Yahoo → Google
- [ ] 경제·실적 캘린더: Trading Economics + Investing.com
- [ ] 수급·업종·시장체력: 마감 시황 기사 추출
→ 디테일: [`guides/sources.md`](./guides/sources.md)

### 📰 뉴스 큐레이션 (sourceUrl 일체화)
- [ ] 글로벌 12 + 국내 12 = 24건 (카운트 필수)
- [ ] **sourceUrl 24/24 채움** (빈 값·중복 0건)
- [ ] **차단 도메인 sourceUrl 사용 금지** (bloomberg/wsj/ft/reuters/mk/yna) — 공개 매체로 교체
- [ ] **source ↔ sourceUrl 도메인 일관성** (예: source=CNBC → URL=cnbc.com)
- [ ] 카테고리 분포 (한 카테고리 4건 초과 금지)
→ 디테일: [`guides/news.md`](./guides/news.md) ★필수 정독★

### ✅ Sanity Check (저장 전)
- [ ] 지수값 범위, |등락률| < 20%
- [ ] **KST 날짜 검증** (현재 UTC + 9h = KST. data.date·weekday·generatedAt·파일명 모두 KST 일치) ★v1.4.1 신설★
- [ ] date == 파일명 == weekday 일치
- [ ] subNoteEm ⊂ subNote (4섹션 모두)
- [ ] 마스킹값 grep 0건
- [ ] 뉴스 sourceUrl 5룰 검증 (빈 값·차단 도메인·중복·도메인 일관성·valid URL)
- [ ] Stooq 응답 신선도
→ 디테일: [`guides/data-quality.md §4`](./guides/data-quality.md)

### 🎨 카운트 (HTML 디자인 제약 — 반드시 채움)
- [ ] us.indices=4, indicators=6, sectorsUp/Down=5+5
- [ ] kr.indices=2, flow=3, supply=3, sectorsUp/Down=5+5
- [ ] world.global=12, world.domestic=12
→ 디테일: [`guides/data-quality.md §6`](./guides/data-quality.md)

### 📅 휴장일 처리
- [ ] 오늘 KST 날짜가 美 휴장이면 전 거래일 값 + `us.subNote` 명시
- [ ] 韓 공휴일이면 `kr.expectedRange = "휴장"`
- [ ] 주말은 美·韓 동시 휴장 처리
→ 디테일: [`guides/operations.md §2`](./guides/operations.md)

### 💾 산출물 갱신
- [ ] `briefing/YYYY-MM-DD.json` 생성 (스키마 준수)
- [ ] `meta/manifest.json` 갱신 (dates append + 정렬 + latest + updatedAt)
- [ ] `meta/usage.json` 갱신 (history entry 1개 append, 14개 필드)
→ 디테일: [`guides/outputs.md §1 §2`](./guides/outputs.md)

### 🚀 푸시
- [ ] `claude/<random-name>` 브랜치로 push (main 직접 X)
- [ ] auto-merge 워크플로우가 main 머지 + 브랜치 자동 삭제

### 📝 결과 보고 (대화창 출력)
- [ ] 상태 / 처리 날짜 / 핵심 값 (S&P/코스피/환율/VIX 실값)
- [ ] 사용량 (모델·시간·토큰·도구 호출)
- [ ] **sourceUrl 검증 결과** (확보율 24/24, 차단 도메인 교체 N건, 중복 교체 N건, source-URL 불일치 정정 N건)
- [ ] 출처별 시도 (sources_attempted)
- [ ] 마스킹 사용 항목 (★빈 배열 [] 이어야 함★)
- [ ] 푸시 결과 (브랜치명 — SHA·머지 결과는 git log에서 확인)
→ 디테일: [`guides/outputs.md §2`](./guides/outputs.md)

---

## 안전 원칙 (최우선)

1. ★**마스킹 절대 금지**★ (+3,2xx, 5x.x조, ○○○, X.x% 등 모두) — 실값 또는 항목 제거
2. ★**美 지수는 ETF 가격이 아닌 진짜 지수 값**★ (S&P 500 = 7,xxx 형식)
3. ★**meta/ 경로 사용**★ (옛 `briefing/manifest.json`, `briefing.schema.json`, `briefing-context.md` 모두 폐기됨)
4. ★**meta/usage.json append 잊지 말 것**★ ([`guides/outputs.md §2`](./guides/outputs.md))
5. ★**뉴스 sourceUrl 24/24**★ — 차단 도메인 후보는 공개 매체로 교체 ([`guides/news.md`](./guides/news.md))
6. ★**source ↔ sourceUrl 도메인 일관성**★ — source=CNBC면 URL=cnbc.com
7. ★**모든 카운트 채우기**★ (HTML 디자인 제약, [`guides/data-quality.md §6`](./guides/data-quality.md))
8. 추측·기억 금지 — 가이드 §2 출처에서만
9. 휴장일 정확히 ([`guides/operations.md §2`](./guides/operations.md))
10. 동일 날짜 기존 파일 있으면 덮어쓰기 허용
11. manifest.dates 중복·정렬 사고 방지

---

## 버전

v1.4.0 (2026-05-25) — 가이드 구조 분리 (5개 `guides/*.md`) + 뉴스 sourceUrl 일체화 (24/24 클릭 가능, 차단 도메인 금지, source-URL 일관성).

전체 변경 이력은 [`VERSION.md`](../VERSION.md) 참고.
