# guides/sources.md — 시세·캘린더 출처 + fallback 체인

routine이 **데이터 수집 단계**에서 정독.
관련 체크리스트: `meta/context.md` "📊 데이터 수집" 섹션.

---

## §1. 환경 검증 결과 (2026-05-24 routine 실행 기준)

| 출처 | 일반 Claude Code | **claude.ai routine** | 비고 |
|---|---|---|---|
| Stooq | ✅ 동작 | ❌ **403 차단** | 핵심 출처지만 routine 환경 차단 |
| finviz | ✅ 동작 | ❌ **403 차단** | 동일 |
| Yahoo Finance | ✅ 동작 | 🟡 routine 첫 발화에서 미시도 | **韓 개별 종목 1순위 + 美 지수 fallback 1순위** |
| Google Finance | ✅ 동작 | 🟡 미검증 | 韓 개별 종목 2순위 + 美 fallback 2순위 |
| Investing.com (kr/영문) | ✅ 동작 | ✅ 동작 (실적 캘린더) | 실적 캘린더 + 韓 개별 종목 3순위 |
| Trading Economics | ✅ 동작 | 🟡 미검증 | 경제 캘린더 |
| WebSearch (도구) | ✅ 동작 | ✅ 동작 | 최후 fallback, 항상 가능 |
| MarketWatch | ❌ 차단 | ❌ 추정 차단 | 사용 금지 |
| 네이버 증권, 매경, 연합뉴스 | ❌ 차단 | ❌ 차단 | WebSearch 일반 검색으로 우회 |

**routine 운영 원칙**: 1차 출처가 차단되면 즉시 fallback 체인 따라 시도. WebSearch는 항상 동작하므로 최후 안전망.

---

## §2. Stooq + 美 지수 표시 룰

`https://stooq.com/q/?s={ticker}` 로 WebFetch.

| 항목 | Ticker |
|---|---|
| S&P 500 | `^spx` |
| 나스닥 100 | `^ndx` |
| 다우 | `^dji` |
| 필라델피아 반도체 | `^sox` |
| VIX | `^vix` |
| 美 10년물 금리 | `10us.b` |
| 달러 인덱스 | `dxy` |
| WTI 유가 | `cl.f` |
| 금 | `gc.f` |
| 비트코인 | `btcusd` |
| 코스피 | `^kospi` |
| 코스닥 | `^kosdaq` |
| 원/달러 | `usdkrw` |
| 美 섹터 ETF | `xlk.us` (IT), `xle.us` (에너지), `xlf.us` (금융), `xli.us` (산업재), `xlc.us` (커뮤니케이션), `xly.us` (임의소비재), `xlu.us` (유틸리티), `xlp.us` (필수소비재), `xlv.us` (헬스케어), `xlb.us` (소재), `xlre.us` (부동산) |

**섹터 TOP 5 산출**: 11개 ETF 등락률 → 정렬 → 상위 5 / 하위 5.

### 🔴 美 지수 표시 룰 (중요)

- `us.indices`의 S&P 500, 나스닥 종합, 다우 산업은 **반드시 진짜 지수 값** 사용
  - 예: S&P 500 = `7,473.47` (NOT SPY ETF 가격 `745.64`)
  - 예: 나스닥 종합 = `26,343.97` (NOT QQQ ETF 가격 `717.54`)
  - 예: 다우 = `50,579.70` (NOT DIA ETF 가격 `506.12`)
- **절대 ETF 가격을 지수 값처럼 표기하지 말 것**. ETF는 등락률(`change`)·방향(`dir`)을 검증할 보조 용도로만 사용
- **예외**: 필라델피아 반도체(SOX)만 `SOXX ETF 대용` 허용 — Stooq 캐럿 티커(`^sox`)가 잡히지 않기 때문. `tip`에 "SOXX ETF 대용" 명시
- `tip` 필드는 "정규장 종가" 또는 "SOXX ETF 대용" 같은 정직한 출처 표기. **"SPY/QQQ/DIA ETF 대용"으로 적지 말 것** (지수 값 자체를 가져왔어야 함)

**🔴 Stooq/finviz 전체 차단 (403 응답)** — claude.ai routine 환경에서 발생 확인됨 (2026-05-24 실행 보고). 아래 fallback 체인 따라 시도.

---

## §3. 美 지수 fallback 체인 (Stooq 실패 시)

| 우선순위 | 출처 | URL 패턴 |
|---|---|---|
| **1** | **Yahoo Finance** ✅ | `https://finance.yahoo.com/quote/{ticker}/` |
| 2 | **Google Finance** ✅ | `https://www.google.com/finance/quote/{ticker}:INDEXSP` |
| 3 | Investing.com 영문 | `https://www.investing.com/indices/{slug}` |
| 4 | WebSearch | `"{지수명} close YYYY-MM-DD"` 검색 |
| 5 | 그래도 실패 시 | `guides/data-quality.md §5` 룰 적용 (항목 제거 또는 그날 skip) |

### 美 지수 티커 매핑 (Yahoo Finance)

| 지수 | Yahoo 티커 | Google Finance |
|---|---|---|
| S&P 500 | `^GSPC` | `.INX:INDEXSP` |
| 나스닥 종합 | `^IXIC` | `.IXIC:INDEXNASDAQ` |
| 다우 산업 | `^DJI` | `.DJI:INDEXDJX` |
| 필라델피아 반도체 | `^SOX` | (or SOXX ETF) |
| VIX | `^VIX` | `VIX:CBOE` |
| 美 10년물 금리 | `^TNX` | `^TNX` |
| 달러 인덱스 | `DX-Y.NYB` | (or UUP) |
| WTI 유가 | `CL=F` | `CL=F` |
| 금 | `GC=F` | `GC=F` |
| 비트코인 | `BTC-USD` | `BTC-USD` |

---

## §4. 韓 지수 fallback 체인

| 우선순위 | 출처 |
|---|---|
| 1 | Stooq (`^kospi`, `^kosdaq`) |
| **2** | **Yahoo Finance** (`^KS11` 코스피, `^KQ11` 코스닥) ✅ |
| 3 | Investing.com 한국 (`kr.investing.com/indices/kospi`) ✅ |
| 4 | WebSearch (한경/이데일리 마감 기사) |
| 5 | 그래도 실패 시 그날 skip (`guides/data-quality.md §5`) |

---

## §5. 美 섹터 ETF 11종 fallback 체인

| 우선순위 | 출처 |
|---|---|
| 1 | Stooq (`xlk.us` 등) |
| 2 | finviz (`quote.ashx?t=XLK`) |
| **3** | **Yahoo Finance** (`finance.yahoo.com/quote/XLK/`) |
| 4 | Google Finance |
| 5 | WebSearch |

---

## §6. 美 섹터 요약 (groups 형태) fallback

| 우선순위 | 출처 |
|---|---|
| 1 | finviz groups (`groups.ashx?g=sector&v=110&o=-perf1w`) |
| **2** | **개별 ETF 11종을 fetch 후 정렬** (§5 fallback 체인 사용) |
| 3 | WebSearch ("S&P sectors performance today") |

→ **원칙**: 항상 fallback 체인 끝까지 시도. 모두 실패해도 **마스킹 절대 금지** — 항목 자체를 제거하거나 그날 skip (`guides/data-quality.md §3 §5`). 추측·기억으로 값 채우지 말 것.

---

## §7. 원/달러 종가 정확 추출 룰 (중요 — routine 발견 사례)

`kr.flow[0]` "원/달러 환율"의 `value`는 **주간거래 마감(15:30) 종가**를 사용. **장중 고가/저가를 종가로 오용하지 말 것**.

### 확인 절차

1. edaily / 머니투데이 / 파이낸셜뉴스 등의 "환율 마감" 기사 검색
2. 기사 본문에서 "15:30 마감" 또는 "주간거래 종가"라는 명시 확인
3. 그 종가 수치를 `value`에 입력
4. 만약 기사가 "장중 1,520원 돌파"라 했더라도 종가가 1,517.20이면 종가 사용

### 예시 (2026-05-22 사례)

- ❌ 잘못: `value="1,520.35원 ▲"` (장중 고가를 종가로 오용)
- ✅ 정확: `value="1,517.20원 ▲"` (주간거래 종가)

`world.domestic`의 환율 뉴스도 동일 — "1,520원 돌파"가 아니라 "장중 1,520원 위협 후 1,517원 마감" 같이 표현.

---

## §8. finviz (美 시장 보조 출처 — Stooq 실패 시 우선 fallback)

- **섹터 등락**: `https://finviz.com/groups.ashx?g=sector&v=110&o=-perf1w` — S&P 11개 섹터 1주 등락률 표 전체 추출 가능 (Real Estate, Healthcare, Technology 등 정확)
- **개별 ETF/종목 quote**: `https://finviz.com/quote.ashx?t={티커}` — 일간 종가·등락률·달러변화 추출 가능
  - 예: `?t=XLRE`, `?t=SOXX`, `?t=SPY`, `?t=QQQ`, `?t=EWY`
- **활용 룰**: Stooq에서 `xlk.us`~`xlre.us` 11개 ETF 중 빈 응답이 있으면 finviz quote로 우회. 또는 처음부터 finviz `groups.ashx`로 일괄 수집 가능

---

## §9. Investing.com (한국 야간선물 — `kr.flow[1]`)

- **URL**: `https://kr.investing.com/indices/korea-200-futures`
- **추출 가능**: 코스피200 선물 현재가, 등락률, 시고저
- **활용 룰**: 한국 시각 새벽 (野間 마감 직후) 시점에서 표시되는 시세가 사실상 야간선물 마감값에 가까움. `kr.flow[1]` (야간 선물)에 사용
- **한계**: 명시적 "야간선물" 라벨은 없음 — 시점 해석 필요

---

## §10. 韓 개별 종목 시세 fallback 체인 (`kr.sectorsUp/Down`의 stockChange 핵심 출처)

### 활용 룰 (테마+종목 형식에서 stockChange 채울 때)

1. 마감 시황 기사에서 강세/약세 테마와 대표 종목명 추출 (예: "반도체 강세에 SK하이닉스 부각")
2. 종목명 → 6자리 종목코드 매핑 (모르면 WebSearch로 `"{종목명} 종목코드"` 1회 조회)
3. 아래 fallback 체인 순서로 fetch → `stockChange` 필드에 정확한 % 입력
4. 1·2순위 결과가 0.5%p 이상 어긋나면 3순위로 cross-check (정확도 안전망)

### fallback 체인

| 우선순위 | 출처 | URL 패턴 (삼성전자 예시) | 비고 |
|---|---|---|---|
| **1** | **Yahoo Finance** | `https://finance.yahoo.com/quote/005930.KS` | 코스피 `.KS`, 코스닥 `.KQ`. 종가·등락률·거래량 모두 추출. 약관·robots 모두 안전 |
| 2 | Google Finance | `https://www.google.com/finance/quote/005930:KRX` | 동일 데이터, 티커 규칙 단순 |
| 3 | Investing.com (영문) | `https://www.investing.com/equities/{영문-slug}` | 아래 slug 매핑 표 참조 |
| (안전망) | WebSearch | `"{종목명} 종가 YYYY-MM-DD"` | 위 3개 모두 실패 시 |

### 주요 종목 코드 + Investing.com slug 매핑 (14종)

| 종목명 | 6자리 코드 | Yahoo 티커 | Investing.com slug |
|---|---|---|---|
| 삼성전자 | 005930 | `005930.KS` | `samsung-electronics-co-ltd` |
| SK하이닉스 | 000660 | `000660.KS` | `sk-hynix-inc` |
| 에코프로 | 086520 | `086520.KQ` | `ecopro-co-ltd` |
| LG에너지솔루션 | 373220 | `373220.KS` | `lg-energy-solution-ltd` |
| 삼성바이오로직스 | 207940 | `207940.KS` | `samsung-biologics` |
| HD현대중공업 | 329180 | `329180.KS` | `hd-hyundai-heavy-industries-co-ltd` |
| 한화오션 | 042660 | `042660.KS` | `hanwha-ocean` |
| 두산로보틱스 | 454910 | `454910.KS` | `doosan-robotics` |
| 현대차 | 005380 | `005380.KS` | `hyundai-motor-co` |
| 기아 | 000270 | `000270.KS` | `kia-corp` |
| POSCO홀딩스 | 005490 | `005490.KS` | `posco-holdings` |
| KT | 030200 | `030200.KS` | `kt-corp` |
| 이마트 | 139480 | `139480.KS` | `e-mart-inc` |
| 삼성생명 | 032830 | `032830.KS` | `samsung-life-insurance` |

> **slug 검증 룰**: 매핑 표에 없는 종목은 WebSearch로 `"{종목명} investing.com"` 1회 조회해서 slug 확인 후 사용. 자신 없는 slug로 fetch했다가 동음이의·다른 종목이 잡히는 사고 방지. Yahoo·Google은 6자리 코드 + 접미사라 검증 불필요.

### fallback 룰

1순위 실패 → 2순위 → 3순위 → WebSearch → 그래도 안 되면 **해당 sectorsUp/Down 항목 자체를 배열에서 제거** (마스킹 금지. `guides/data-quality.md §3`).

---

## §11. 야간선물·ADR (`kr.flow`)

- **KOSPI 200 야간선물 (`kr.flow[1]`)**: **1순위** Investing.com 코스피200 선물 페이지 (`https://kr.investing.com/indices/korea-200-futures`) — 검증 완료. **2순위** 한국경제·이데일리 마감 기사에서 `"야간선물"` / `"코스피200 야간"` 단어 검색해 시세 추출. Stooq에서는 한국 야간선물 직접 티커 없음
- **ADR(미국 상장 한국물, `kr.flow[2]`)**: `ewy.us` (iShares MSCI Korea ETF) — EWY 등락이 한국물 ADR 방향 대용. finviz `quote.ashx?t=EWY`도 가능

---

## §12. Trading Economics (경제 캘린더)

`https://tradingeconomics.com/calendar` WebFetch.
- 시간은 UTC/현지시간 → **KST로 환산**해서 저장
- 중요도 ⭐⭐⭐만 우선, ⭐⭐도 선택적 포함
- 미국 + 한국 + 유로존/중국/일본 핵심만

---

## §13. Investing.com 실적 캘린더

`https://kr.investing.com/earnings-calendar/` WebFetch.
- 한국 + 미국 기업 실적 일정
- 기업명 + 발표 시점 ("장 마감 후" / "장 시작 전" / 구체 시각)
- 한국 기업 잠정실적은 시점 미정인 경우 많음 → "예상 16:30" 같은 추정 허용

### calendarWeek/Month 실적(earnings) push 룰 — 화이트리스트 기반 (★v1.6.0★)
- **韓 실적**: `whitelist-kr-marketcap.json` hit만 (§15) → `region: "domestic"`
- **美 빅테크 실적**: `./data/whitelist-us-bigtech.json` hit만 (M7 + 韓 직결 반도체 11종) → `region: "global"`, `category: "earnings"`
  - Investing earnings에서 종목 매칭 → 화이트리스트 lookup → hit 시에만 실적일을 `calendarWeek/Month.items[]` push
  - 화이트리스트 밖 美 기업 실적은 제외 (韓 증시 영향 큰 종목만)

---

## §14. 수급·업종·시장체력 (뉴스 추출)

`stooq`나 직접 fetch는 한계 → **국내 마감 시황 기사**에서 추출:

- **검색**: `"코스피 마감" 외국인 기관 개인 순매수 OR 순매도` + 당일 날짜
- **수급 (`kr.supply`)**: 기사에서 "외국인 +X,XXX억" 같은 수치 추출 → `supply.amount` 채움. 외국인/기관/개인 3주체. 프로그램 매매는 v1에서 제외
- **업종 등락 TOP 5 (`kr.sectorsUp/Down`)**: 한경/연합 마감 기사에서 "전기·전자 +X.X%" 패턴 추출 + 대표 종목 stockChange는 §10 fallback 체인으로 확보
- **시장체력 (`kr.health`)**: 주간 기사("예탁금 XX조 돌파") 활용 — 시점 1~2일 지연 가능

**추출 실패 시**: **마스킹 절대 금지**. 해당 항목을 데이터 배열에서 제거 (배열 길이 줄임). 자세한 룰은 `guides/data-quality.md §3 §5`.

---

## §15. 시총 2000억+ 韓 종목 화이트리스트 (★v1.5.0 신설★)

`calendarWeek`·`calendarMonth` 안에 韓 기업 실적 일정을 넣을 때 **이 화이트리스트에 있는 종목만** 포함. 화이트리스트 없는 종목 실적은 표시 제외 (사용자에게 의미 있는 일정만).

### 화이트리스트 파일

`./data/whitelist-kr-marketcap.json` — KOSPI+KOSDAQ 시총 2000억원+ 종목 (~500 예상).

```json
{
  "version": "2026-05-28",
  "criteria": "KOSPI+KOSDAQ 시총 2000억원+",
  "tickers": [
    { "code": "005930", "name": "삼성전자", "market": "KOSPI", "marketCap": "180조" },
    ...
  ]
}
```

### routine 사용 룰

1. **평일**: 화이트리스트 fetch (`./data/whitelist-kr-marketcap.json`) → 정적 reference
2. **매월 1일 발화**: KRX 시총 페이지 (`https://kind.krx.co.kr/corpgeneral/corpList.do`) 또는 한국거래소 시가총액 상위 페이지 fetch → `tickers[]` 재생성 → 같은 커밋에 commit
3. **실적 매칭**: Investing.com earnings calendar에서 한국 기업명/종목코드 추출 → 화이트리스트 lookup → hit 시에만 `calendarWeek/Month.items[]` push

### 한은 금통위 별도 처리

한국은행 기준금리 결정 일정(연 8회)은 화이트리스트와 별개. 한국은행 공식 페이지 또는 WebSearch (`"한은 금통위 2026 일정"`)로 확보 → `category: "policy"`, `region: "domestic"` 으로 push.

---

## §16. 학회·컨퍼런스 화이트리스트 (★v1.5.0 신설★)

해외 일정 중 **주식 영향력 큰 학회·컨퍼런스만** 포함. 일반 모든 컨퍼런스 X.

### 화이트리스트 파일

`./data/whitelist-conferences.json` — **17개 글로벌 행사 (SSOT)**. 행사 목록·시기(`expectedMonth`)·영향은 이 JSON이 단일 출처. **md에 표 중복 금지** (행사 추가·수정 시 JSON만 변경).

포함 범위 (v1.6.0):
- **반도체·AI 학회**: ISSCC · GTC · Computex · HotChips · NeurIPS
- **빅테크 제품·개발자 이벤트**: CES · MWC · 삼성 언팩 · Google I/O · MS Build · WWDC · Apple 가을 · Meta Connect · MS Ignite · AWS re:Invent
- **바이오**: JPM Healthcare · ASCO

### routine 사용 룰

1. **평일·매번**: 화이트리스트 fetch (`./data/whitelist-conferences.json`)
2. **7일·30일 future window 매칭**:
   - 각 행사의 `expectedMonth` 가 현재 월 또는 다음 월에 해당하면 **WebSearch 1회** 로 정확한 날짜 확인
     예: `"NVIDIA GTC 2026 keynote date"`
   - 검색 결과로부터 행사 시작·종료일 추출 → 7일·30일 future window 안이면 `calendarWeek/Month.items[]` push
   - **`category` 는 반드시 `"conference"` 고정** — 학회·제품발표를 `industry`/`tech` 등으로 넣지 말 것 (schema enum 일관성). `region: "global"`, `important: true`(weight=high) / `false`(weight=mid)
3. **이름·URL 표기**: 화이트리스트 `name` 필드 그대로 사용. 같은 행사가 여러 날 진행 시 keynote/메인 발표일 1개만 우선

### 갱신 주기

행사 일정 자체는 매년 비슷 (CES=1월 첫째 주 등). 화이트리스트 갱신은 **연 1회** 정도면 충분. routine 부담 없음.

---
