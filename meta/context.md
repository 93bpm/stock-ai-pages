# Daily Briefing Context

`stock-ai-pages` 일일 데이터 생성 routine이 매 발화 시 따르는 **메인 체크리스트**.
디테일은 항목 옆 `→ guides/xxx.md §N` 링크. routine이 해당 작업 단계에서 그 파일을 추가 fetch.

스키마: [`schema.json`](./schema.json) | 버전: [`../VERSION.md`](../VERSION.md)

---

## 발화 일정·산출물

매일 **KST 07:00** (cron `0 22 * * *` UTC) 자동 실행. 다음 3개 파일을 같은 커밋·푸시로 갱신:

| 파일 | 역할 |
|---|---|
| `briefing/YYYY-MM-DD.json` | 그날의 브리핑 데이터 (immutable) |
| `meta/manifest.json` | 가용 날짜 목록 (dates·latest·updatedAt) |
| `meta/usage.json` | 발화별 사용량 history (14필드) |

푸시 경로: `claude/<random>` 브랜치 → auto-merge → main.
커밋 메시지 형식: `routine: YYYY-MM-DD HH:MM` (KST 24h).
manifest·usage 갱신 절차: [`guides/outputs.md §1·§2`](./guides/outputs.md)

---

## guides 단계별 fetch

진입 시 `context.md` + `schema.json`만 fetch. 작업 단계에서 필요한 guides 추가 fetch:

| 단계 | 추가 fetch |
|---|---|
| 데이터 수집 | [`guides/sources.md`](./guides/sources.md) |
| 뉴스 큐레이션 | [`guides/news.md`](./guides/news.md) ★필수★ |
| Sanity Check + 마스킹 + 카운트 | [`guides/data-quality.md`](./guides/data-quality.md) |
| manifest·usage 갱신 + HTML 검증 | [`guides/outputs.md`](./guides/outputs.md) |
| 휴장일·톤 | [`guides/operations.md`](./guides/operations.md) |

---

## ⚡ 병렬 도구 호출 (시간 단축 룰) ★v1.4.3 신설★

★ 같은 종류 도구 호출이 여러 개 필요한 단계는 **한 응답(turn)에 묶어 동시 실행**.
순차 실행 대비 25~30% 시간 단축.

### 병렬 권장 단계

| 단계 | 호출 묶음 |
|---|---|
| 📊 데이터 수집 (WebFetch) | 美 지수·지표·섹터 ETF 약 21개 Stooq CSV를 한 응답에 묶기 |
| 📊 데이터 수집 (WebFetch 韓) | 韓 지수 2개 + 환율 + 야간선물 동시 |
| 📰 뉴스 큐레이션 (WebSearch) | 글로벌·국내 쿼리 그룹별 묶기 (글로벌 6~12개 / 국내 6~12개) |
| ✅ Sanity Check (재확인 WebFetch) | 의심값 재확인 호출 동시 |

### 순차 필수 (병렬 불가)

- Step 0 START_TS → 1단계 fetch → 2단계 KST 결정 (순서 의존)
- JSON 생성 (수집 완료 후)
- Sanity Check (생성 후)
- 산출물 갱신 → 푸시 (순서 의존)

**핵심**: 수집·검색은 병렬, 결정·생성·검증·푸시는 순차.

---

## 매 발화 체크리스트

### ⏱️ Step 0 — 발화 시작 시각 ★v1.4.2★
- [ ] UTC epoch 초 측정 → `START_TS` 보관. **첫 fetch보다 먼저**
→ [`guides/outputs.md §2`](./guides/outputs.md) "duration_seconds 측정 절차"

### 🔴 데이터 정확도
- [ ] ★**마스킹 0건**★ — 실값 사용. 못 찾으면 항목 제거 (`+3,2xx`·`5x.x조`·`○○○`·`X.x%` 등) → [`guides/data-quality.md §3`](./guides/data-quality.md)
- [ ] 美 지수는 진짜 지수 값 (ETF 가격 X. SOX만 SOXX 대용) → [`guides/sources.md §2`](./guides/sources.md)
- [ ] 원/달러 15:30 마감 종가 (장중 고가 X) → [`guides/sources.md §7`](./guides/sources.md)
- [ ] 추측·기억 금지 — 가이드 출처에서만

### 📊 데이터 수집
- [ ] 출처별 fallback 체인 끝까지 시도 (Stooq → Yahoo → Google → Investing → WebSearch)
- [ ] 韓 수급·업종·시장체력은 마감 시황 기사 추출 (LLM)
→ [`guides/sources.md §3~§14`](./guides/sources.md)

### 📰 뉴스 큐레이션
- [ ] 카운트는 `schema.json` 기준 (글로벌·국내)
- [ ] ★**sourceUrl 100% 채움**★ + 빈 값·중복·차단 도메인 0건 + source↔URL 도메인 일관성
- [ ] 카테고리 분포 (한 카테고리 4건 초과 금지)
→ [`guides/news.md §2~§5`](./guides/news.md) ★필수 정독★

### ✅ Sanity Check (저장 전)
- [ ] 지수값 범위 / |등락률| < 20%
- [ ] ★**KST 날짜 검증 5룰**★ (UTC + 9h = KST. data.date·weekday·generatedAt·파일명 모두 KST 일치) ★v1.4.1★
- [ ] subNoteEm ⊂ subNote (4섹션)
- [ ] **뉴스 sourceUrl 5룰** (빈 값·차단·중복·도메인 일관성·valid URL)
- [ ] 마스킹 grep 0건 / 출처 신선도
→ [`guides/data-quality.md §4`](./guides/data-quality.md)

### 🎨 카운트 (HTML 디자인 제약)
- [ ] 모든 배열 카운트는 `schema.json`의 `minItems`/`maxItems` 기준
→ [`guides/data-quality.md §6`](./guides/data-quality.md)

### 📅 휴장일·주말
- [ ] 美·韓 휴장·주말 정확히 적용
→ [`guides/operations.md §2`](./guides/operations.md)

### 💾 산출물 갱신
- [ ] usage.json append 직전: `END_TS` 측정 → `duration_seconds = END_TS - START_TS`
- [ ] 3개 파일 (briefing·manifest·usage) 같은 커밋
→ [`guides/outputs.md §1·§2`](./guides/outputs.md)

### 🚀 푸시
- [ ] 커밋 메시지 `routine: YYYY-MM-DD HH:MM` (KST 발화 시각)
- [ ] `claude/<random>` 브랜치 → auto-merge

### 📝 결과 보고
- [ ] 상태·날짜·핵심 값 / 사용량 / sourceUrl 검증 / 출처별 시도 / 푸시 결과
→ [`guides/outputs.md §2`](./guides/outputs.md)

---

## 안전 원칙 (시스템 메타 룰 — 본문 ★ 외)

1. ★**meta/ 경로 사용**★ — 옛 `briefing/manifest.json`·`briefing.schema.json`·`briefing-context.md` 폐기
2. ★**1발화 = 1커밋 = 1 push**★ — 사후 갱신 push 금지
3. ★**동일 날짜 파일 덮어쓰기 허용**★ + manifest.dates 중복·정렬 사고 방지
4. ★**UTC 날짜 그대로 사용 금지**★ — 항상 KST(+9h) 변환 (★v1.4.1 사고 사례)

본문 체크리스트의 ★ 표시 룰이 핵심 안전 룰. 위는 시스템 메타 룰만 강조.
