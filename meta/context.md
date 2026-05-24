# Daily Briefing Context

`stock-ai-pages` 일일 데이터 생성 루틴이 매일 참조할 운영 가이드.
스키마: [schema.json](./schema.json)

---

## 1. 목적과 산출물

매일 **KST 08:00** (cron `0 23 * * *` UTC) 자동 실행되어 다음 세 파일을 생성·갱신:

| 파일 | 역할 | 갱신 방식 |
|---|---|---|
| `briefing/YYYY-MM-DD.json` | 그날의 브리핑 데이터 (스키마 준수) | 신규 생성 (immutable) |
| `meta/manifest.json` | 가용 날짜 목록 (`{"dates":[...], "latest":"YYYY-MM-DD"}`) | dates 배열에 append + 정렬 |
| `meta/usage.json` | 발화별 사용량 history (토큰·도구·출처 등) | history 배열에 entry 1개 append |

두 파일은 **같은 커밋**으로 푸시 (원자성).

---

## 2. 출처별 접근 가이드

### 🌐 환경 검증 결과 (2026-05-24 routine 실행 기준)

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

**routine 운영 시 원칙**: 1차 출처가 차단되면 즉시 fallback 체인 따라 시도. WebSearch는 항상 동작하므로 최후 안전망.

### 🟢 Stooq (지수·지표·환율)

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

**🔴 美 지수 표시 룰 (중요)**:
- `us.indices`의 S&P 500, 나스닥 종합, 다우 산업은 **반드시 진짜 지수 값** 사용
  - 예: S&P 500 = `7,473.47` (NOT SPY ETF 가격 `745.64`)
  - 예: 나스닥 종합 = `26,343.97` (NOT QQQ ETF 가격 `717.54`)
  - 예: 다우 = `50,579.70` (NOT DIA ETF 가격 `506.12`)
- **절대 ETF 가격을 지수 값처럼 표기하지 말 것**. ETF는 등락률(`change`)·방향(`dir`)을 검증할 보조 용도로만 사용
- **예외**: 필라델피아 반도체(SOX)만 `SOXX ETF 대용` 허용 — Stooq 캐럿 티커(`^sox`)가 잡히지 않기 때문. `tip`에 "SOXX ETF 대용" 명시
- `tip` 필드는 "정규장 종가" 또는 "SOXX ETF 대용" 같은 정직한 출처 표기. **"SPY/QQQ/DIA ETF 대용"으로 적지 말 것** (지수 값 자체를 가져왔어야 함)

**🔴 Stooq/finviz 전체 차단 (403 응답)** — claude.ai routine 환경에서 발생 확인됨 (2026-05-24 실행 보고). 이 경우 아래 **fallback 체인** 순서대로 시도:

### 美 지수 fallback 체인 (Stooq 실패 시)

| 우선순위 | 출처 | URL 패턴 |
|---|---|---|
| **1** | **Yahoo Finance** ✅ | `https://finance.yahoo.com/quote/{ticker}/` |
| 2 | **Google Finance** ✅ | `https://www.google.com/finance/quote/{ticker}:INDEXSP` |
| 3 | Investing.com 영문 | `https://www.investing.com/indices/{slug}` |
| 4 | WebSearch | `"{지수명} close YYYY-MM-DD"` 검색 |
| 5 | 그래도 실패 시 | §6 룰 적용 (항목 제거 또는 그날 skip) |

**美 지수 티커 매핑** (Yahoo Finance):

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

### 韓 지수 fallback 체인

| 우선순위 | 출처 |
|---|---|
| 1 | Stooq (`^kospi`) |
| **2** | **Yahoo Finance** (`^KS11` 코스피, `^KQ11` 코스닥) ✅ |
| 3 | Investing.com 한국 (`kr.investing.com/indices/kospi`) ✅ |
| 4 | WebSearch (한경/이데일리 마감 기사) |
| 5 | 그래도 실패 시 그날 skip (§6) |

### 美 섹터 ETF 11종 fallback 체인

| 우선순위 | 출처 |
|---|---|
| 1 | Stooq (`xlk.us` 등) |
| 2 | finviz (`quote.ashx?t=XLK`) |
| **3** | **Yahoo Finance** (`finance.yahoo.com/quote/XLK/`) |
| 4 | Google Finance |
| 5 | WebSearch |

### 美 섹터 요약 (groups 형태) fallback

| 우선순위 | 출처 |
|---|---|
| 1 | finviz groups (`groups.ashx?g=sector&v=110&o=-perf1w`) |
| **2** | **개별 ETF 11종을 fetch 후 정렬** (위 fallback 체인 사용) |
| 3 | WebSearch ("S&P sectors performance today") |

→ **원칙**: 항상 fallback 체인 끝까지 시도. 모두 실패해도 **마스킹 절대 금지** — 항목 자체를 제거하거나 그날 skip (§6 룰). 추측·기억으로 값 채우지 말 것.

### 🔴 원/달러 종가 정확 추출 룰 (중요 — routine 발견 사례)

`kr.flow[0]` "원/달러 환율"의 `value`는 **주간거래 마감(15:30) 종가**를 사용. **장중 고가/저가를 종가로 오용하지 말 것**.

**확인 절차**:
1. edaily / 머니투데이 / 파이낸셜뉴스 등의 "환율 마감" 기사 검색
2. 기사 본문에서 "15:30 마감" 또는 "주간거래 종가"라는 명시 확인
3. 그 종가 수치를 `value`에 입력
4. 만약 기사가 "장중 1,520원 돌파"라 했더라도 종가가 1,517.20이면 종가 사용

**예시 (2026-05-22 사례)**:
- ❌ 잘못: `value="1,520.35원 ▲"` (장중 고가를 종가로 오용)
- ✅ 정확: `value="1,517.20원 ▲"` (주간거래 종가)

`world.domestic`의 환율 뉴스도 동일 — "1,520원 돌파"가 아니라 "장중 1,520원 위협 후 1,517원 마감" 같이 표현.

### 🟢 finviz (美 시장 보조 출처 — Stooq 실패 시 우선 fallback)

- **섹터 등락**: `https://finviz.com/groups.ashx?g=sector&v=110&o=-perf1w` — S&P 11개 섹터 1주 등락률 표 전체 추출 가능 (Real Estate, Healthcare, Technology 등 정확)
- **개별 ETF/종목 quote**: `https://finviz.com/quote.ashx?t={티커}` — 일간 종가·등락률·달러변화 추출 가능
  - 예: `?t=XLRE`, `?t=SOXX`, `?t=SPY`, `?t=QQQ`, `?t=EWY`
- **활용 룰**: Stooq에서 `xlk.us`~`xlre.us` 11개 ETF 중 빈 응답이 있으면 finviz quote로 우회. 또는 처음부터 finviz `groups.ashx`로 일괄 수집 가능

### 🟢 Investing.com (한국 야간선물 — `kr.flow[1]`)

- **URL**: `https://kr.investing.com/indices/korea-200-futures`
- **추출 가능**: 코스피200 선물 현재가, 등락률, 시고저
- **활용 룰**: 한국 시각 새벽 (野間 마감 직후) 시점에서 표시되는 시세가 사실상 야간선물 마감값에 가까움. `kr.flow[1]` (야간 선물)에 사용
- **한계**: 명시적 "야간선물" 라벨은 없음 — 시점 해석 필요

### 🟢 韓 개별 종목 시세 fallback 체인 (`kr.sectorsUp/Down`의 stockChange 핵심 출처)

- **활용 룰** (테마+종목 형식에서 stockChange 채울 때):
  1. 마감 시황 기사에서 강세/약세 테마와 대표 종목명 추출 (예: "반도체 강세에 SK하이닉스 부각")
  2. 종목명 → 6자리 종목코드 매핑 (모르면 WebSearch로 `"{종목명} 종목코드"` 1회 조회)
  3. 아래 fallback 체인 순서로 fetch → `stockChange` 필드에 정확한 % 입력
  4. 1·2순위 결과가 0.5%p 이상 어긋나면 3순위로 cross-check (정확도 안전망)

- **fallback 체인**:

| 우선순위 | 출처 | URL 패턴 (삼성전자 예시) | 비고 |
|---|---|---|---|
| **1** | **Yahoo Finance** | `https://finance.yahoo.com/quote/005930.KS` | 코스피 `.KS`, 코스닥 `.KQ`. 종가·등락률·거래량 모두 추출. 약관·robots 모두 안전 |
| 2 | Google Finance | `https://www.google.com/finance/quote/005930:KRX` | 동일 데이터, 티커 규칙 단순 |
| 3 | Investing.com (영문) | `https://www.investing.com/equities/{영문-slug}` | 아래 slug 매핑 표 참조 |
| (안전망) | WebSearch | `"{종목명} 종가 YYYY-MM-DD"` | 위 3개 모두 실패 시 |

- **주요 종목 코드 + Investing.com slug 매핑**:

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

- **fallback 룰**: 1순위 실패 → 2순위 → 3순위 → WebSearch → 그래도 안 되면 **해당 sectorsUp/Down 항목 자체를 배열에서 제거** (마스킹 금지)

### 🟢 야간선물·ADR (`kr.flow`)

- **KOSPI 200 야간선물 (`kr.flow[1]`)**: **1순위** Investing.com 코스피200 선물 페이지 (`https://kr.investing.com/indices/korea-200-futures`) — 검증 완료. **2순위** 한국경제·이데일리 마감 기사에서 `"야간선물"` / `"코스피200 야간"` 단어 검색해 시세 추출. Stooq에서는 한국 야간선물 직접 티커 없음
- **ADR(미국 상장 한국물, `kr.flow[2]`)**: `ewy.us` (iShares MSCI Korea ETF) — EWY 등락이 한국물 ADR 방향 대용. finviz `quote.ashx?t=EWY`도 가능

### 🟢 Trading Economics (경제 캘린더)

`https://tradingeconomics.com/calendar` WebFetch.
- 시간은 UTC/현지시간 → **KST로 환산**해서 저장
- 중요도 ⭐⭐⭐만 우선, ⭐⭐도 선택적 포함
- 미국 + 한국 + 유로존/중국/일본 핵심만

### 🟢 Investing.com 실적 캘린더

`https://kr.investing.com/earnings-calendar/` WebFetch.
- 한국 + 미국 기업 실적 일정
- 기업명 + 발표 시점 ("장 마감 후" / "장 시작 전" / 구체 시각)
- 한국 기업 잠정실적은 시점 미정인 경우 많음 → "예상 16:30" 같은 추정 허용

### 🟡 WebSearch (뉴스)

**핵심 절차 — "다양한 후보 수집 → TOP 12 추리기"** (단순히 12건 뽑지 말 것):

1. **여러 검색 쿼리로 후보 30~50건 수집** (도메인 필터 + 일반 검색 혼합)
   - 단일 쿼리·단일 도메인이 아닌, 다각도 수집
2. **중복 제거** (같은 사건 여러 매체 보도 → 가장 신뢰 가능한 1건만)
3. **중요도 평가** (시장 영향력, 신선도, 출처 신뢰도)
4. **카테고리 분포 고려** (통화정책·지정학·기술·기업·거시·원자재·정책·수급 등 골고루 — 한 카테고리 4건 초과 금지 권장)
5. **TOP 12 선별** → rank 01~12 부여 (중요도 순)
6. **URL도 함께 수집** → `sourceUrl` 필드에 원본 기사 URL 입력 (검색 결과의 링크 그대로). 있어야 헤드라인·출처가 클릭 가능 링크로 렌더링됨. 못 찾으면 생략(optional). 다만 가급적 모든 12+12건에 URL 포함 권장

**글로벌 12건**: 도메인 필터 + 일반 검색
- **1순위 (안정 동작 확인됨)**: `["cnbc.com", "bloomberg.com", "nikkei.com", "caixin.com"]`
- **2순위**: 도메인 필터 없이 일반 검색 → 신뢰 가능한 출처(Investing.com·Forbes·Marketwatch·Yahoo Finance·Politico·SCMP 등) 선별
- ⚠️ **알려진 차단**: `reuters.com`, `wsj.com`, `ft.com` — 일반 검색으로 우회
- **다양한 쿼리 예시** (10+개 권장):
  - `"미국 증시 마감"`, `"FOMC 통화정책"`, `"AI 반도체 실적"`
  - `"지정학 유가"`, `"PCE 인플레이션"`, `"중국 부양책"`
  - `"엔비디아 실적"`, `"BOJ 정책"`, `"ECB 금리"`
  - `"메모리얼데이 휴장"`, `"미시간 소비심리"`, `"비트코인 ETF"`

**국내 12건**: 동일 패턴
- **1순위 (안정 동작 확인됨)**: `["hankyung.com", "edaily.co.kr", "mt.co.kr", "fnnews.com"]`
- **2순위**: 일반 검색 + 신뢰 가능 출처(뉴스핌·이투데이·아시아경제·서울경제·헤럴드경제·머투투데이·뉴스1·KBS·MBC·JTBC·연합인포맥스 등)
- ⚠️ **알려진 차단**: `yna.co.kr` (연합뉴스), `mk.co.kr` (매경) — 일반 검색으로 우회
- **다양한 쿼리 예시** (10+개 권장):
  - `"코스피 마감"`, `"외국인 수급"`, `"코스닥 사이드카"`
  - `"한은 금통위"`, `"반도체 HBM"`, `"2차전지 수주"`
  - `"바이오 CDMO"`, `"조선 방산"`, `"국민성장펀드"`
  - `"환율 1500원"`, `"MSCI 리밸런싱"`, `"공매도 잔고"`

### 🟡 수급·업종·시장체력 (뉴스 추출)

`stooq`나 직접 fetch는 한계 → **국내 마감 시황 기사**에서 추출:
- 검색: `"코스피 마감" 외국인 기관 개인 순매수 OR 순매도` + 당일 날짜
- 기사에서 "외국인 +X,XXX억" 같은 수치 추출 → `supply.amount` 채움
- 업종 등락 TOP 5: 한경/연합 마감 기사에서 "전기·전자 +X.X%" 패턴 추출
- 시장체력: 주간 기사("예탁금 XX조 돌파") 활용 — 시점 1~2일 지연 가능

**추출 실패 시**: **마스킹 절대 금지**. 해당 항목을 데이터 배열에서 제거 (배열 길이 줄임). 자세한 룰은 §6 참조.

---

## 3. 데이터 등급별 처리

### 🟢 등급 A (실값, 정확성 최우선)
- Stooq/TE/Investing.com 응답 **그대로** 사용
- 직접 추론·해석 추가 금지
- Sanity check 후 저장 (아래 §6)

### 🟡 등급 B+ (Claude 추론·추출)
- 호악재 판단: 일반 시장 상식 기반 합리적 판단
- 수치 추출은 **원문에 명시된 값만** 사용. 추측·계산 금지
- 정보 불충분 → **마스킹 금지**. 해당 항목 자체를 배열에서 제거하거나 빈 값으로
- 정확도 100% 보장 아님 → 사용자 면책 전제

---

## 4. categoryStyle 매핑 룰 (뉴스 아이템)

| categoryStyle | 색상 | 해당 카테고리 (`category` 라벨 예시) |
|---|---|---|
| `default` | 파랑 | 통화정책, 거시, 정책, 환율, 수급, 기업(일반 실적·M&A·지배구조), 코스닥, 증시제도, 금융, 거래소제도, 부동산정책 |
| `geo` | 빨강 | 지정학, 갈등, 관세, 전쟁, 외교, 원자재(공급차질) |
| `tech` | 초록 | 반도체, 2차전지, 바이오, 조선·방산, 엔터·콘텐츠, AI, IT, 자동차, 게임, 우주항공, 기업(산업·테마 맥락) |

판단 우선순위:
1. 산업/테마 관련 → `tech`
2. 지정학·리스크 관련 → `geo`
3. 그 외 → `default`

**모호 케이스 처리** (HTML index의 실제 사용 예 기반):
- "기업"이 일반 실적·M&A·지배구조 → `default`
- "기업"이 특정 산업(반도체/IT/AI/2차전지/조선 등) 맥락 → `tech`
- 결정 어려우면 `category` 라벨 자체를 더 구체화. 예: "기업" → "반도체" 또는 "IT" 같은 산업명으로 변경 후 `tech` 부여
- "원자재" 카테고리 중 가격(거시) 맥락이면 `default`, 공급차질·자원무기화면 `geo`

---

## 5. 톤·문체 규칙

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

## 6. Sanity Check (생성 후 검증)

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

[뉴스 카운트]
  world.global.length == 12
  world.domestic.length == 12

[데이터 출처 신선도]
  Stooq 응답 날짜가 date에서 5일 이상 떨어지면 의심 (주말·휴장일 감안)

[필드 관계 검증]
  subNoteEm은 subNote의 부분 문자열이어야 함 (각 섹션의 subNote/Em 쌍 모두)

[미세 차이 허용 범위]
  여러 출처에서 값을 가져올 때 1-2 단위 차이(예: VIX 16.70 vs 16.64)는 허용
  - 출처별로 timestamp가 다를 수 있음 (4:00 PM vs 4:15 PM close)
  - 1차 출처 우선, 차이가 5% 이상이면 의심하고 재확인
```

### 🔴 마스킹 절대 금지 — 정확값 또는 항목 제거

**원칙: 마스킹값(`+3,2xx`, `5x.x조`, `○○○ · △△△ · □□□`, `X.x%` 등)을 데이터에 절대 넣지 말 것.** 실값을 못 찾으면 해당 항목 자체를 제거하거나 빈 값으로.

전체 skip은 **필수 필드 누락** 같은 불가피한 경우에만. 부분 누락은 다음 룰로 처리:

| 누락 항목 | 처리 |
|---|---|
| Stooq 지수 1-2개 (예: `^kosdaq` 응답 실패) | §2 fallback 체인 끝까지 시도 (Yahoo→Google→Investing→WebSearch). **그래도 못 찾으면 그날 skip** (manifest 미갱신) |
| 美 섹터 ETF 일부 (11개 중 일부) | 가져온 ETF만으로 정렬해 TOP 5 산출 (집합이 작아져도 5개 유지). 5개 미만이면 가져온 만큼만 (배열 길이 줄임) |
| 뉴스 12건 미만 | **반드시 12건 채움**. 검색 키워드 확대 (가이드 §2 쿼리 예시 적극 활용). 정 안 되면 가능한 만큼만 (배열 길이 줄임) |
| 수급 추출 실패 (외인/기관/개인 중 하나라도) | 한경/이데일리/MT/파이낸셜뉴스 1차 시도. 그래도 못 찾으면 **해당 주체 항목을 supply 배열에서 제거** (스키마 minItems 일시적 위반 가능 — 그건 sanity check 실패로 처리). 프로그램 매매는 v1에서 제외 (3주체만) |
| 업종 등락 (`kr.sectorsUp/Down`) | 테마 + 대표 종목 형식. Yahoo Finance → Google Finance → Investing.com 순서로 stockChange 정확값 확보 우선 (§2 韓 개별 종목 fallback 체인 참조). 못 찾으면 **해당 항목을 sectorsUp/Down 배열에서 제거** (배열 길이 줄임) |
| 시장체력 — 예탁금/신용잔고 (필수) | 실값 우선 (한경/이데일리/MT 기사). 못 찾으면 health 배열에서 제거 |
| 시장체력 — 공매도 잔고 상위 (선택) | 종목명 못 찾으면 health 배열에서 제거 (배열 2개로 줄어듦) |
| 경제일정 없음 (주말 등) | `timed: []`, `untimed: []` 빈 배열 + `subNote`에 "주말·공휴일로 주요 일정 없음" |
| 야간선물/ADR 못 찾을 때 | flow 배열에서 해당 항목 제거 (배열 길이 줄임) |

### ⚠️ HTML 디자인 제약 — 반드시 카운트 채우기

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

→ **fallback 체인 끝까지 적극 시도해서 반드시 카운트 채울 것**. 다양한 출처·검색 쿼리·종목 후보로 노력. 정말 못 채우면 그건 운영 측 신호 (출처 측 큰 변화나 환경 차단). 그날 발화 후 사용자가 알아챌 수 있음.

---

## 7. Manifest 갱신 (`meta/manifest.json`)

브리핑 JSON 저장 후, **같은 커밋에서** manifest를 갱신해야 인덱스가 새 날짜를 인식해요.

```
1. meta/manifest.json 읽기 (없으면 {"dates":[], "latest":null} 초기화)
2. ⚠️  dates 배열에 새 날짜 추가 (이미 있으면 skip — 중복 절대 금지)
3. ⚠️  dates 배열 오름차순 정렬 (필수 — 인덱스 캘린더가 이걸 가정해 활성화 표시함)
4. latest = dates의 마지막 원소 (정렬 후 가장 최근 날짜)
5. updatedAt = 현재 KST ISO 시각 (예: "2026-05-24T08:05:00+09:00")
6. meta/manifest.json 저장 (UTF-8, 2 space indent)
```

**중복·정렬 실수의 영향**:
- 중복 → 캘린더에 같은 날짜 중복 활성화 (시각 이상)
- 정렬 안 됨 → `latest`가 최신이 아닐 수 있음 → 첫 로드 시 잘못된 날짜 표시

---

## 7-2. usage.json 갱신 (`meta/usage.json`)

발화 종료 직전, `meta/usage.json`의 `history` 배열에 **이번 발화 entry 1개를 append**. usage.html 페이지가 이걸 읽어 그래프·표 렌더링.

### 갱신 절차

```
1. meta/usage.json 읽기 (없으면 {"history":[], "updatedAt":""} 초기화)
2. 이번 발화 entry 객체 생성 (아래 필드 명세 참고)
3. history 배열에 append (정렬 불필요 — 자연 append 순서로 시간순 보장)
4. updatedAt = 현재 KST ISO 시각
5. meta/usage.json 저장 (UTF-8, 2 space indent)
```

### Entry 필드 명세

| 필드 | 타입 | 값 | 채움 방식 |
|---|---|---|---|
| `date` | string | `"YYYY-MM-DD"` | KST 날짜 |
| `time` | string | `"HH:MM"` | KST 24h 발화 시각 |
| `model` | string | `"claude-sonnet-4-7"` 등 | 실행 모델명 (자체 보고) |
| `status` | string | `"success" / "skip" / "fail"` | 정상 종료 / sanity skip / 예외 |
| `duration_seconds` | number | 발화 시작~끝 초 | **정확값 ✓** |
| `tokens_estimated` | number | 한국어 ~2자/토큰 환산 | **추산값** (정확값은 claude.ai Usage에서 확인) |
| `tokens_actual` | number? | API 정확 토큰 (가능하면) | optional. 정확값 ✓ |
| `response_size_kb` | number | 응답 본문 KB | **정확값 ✓** |
| `tool_calls` | object | `{"WebFetch":N, "WebSearch":N, "Read":N, "Write":N, "Bash":N}` | 각 도구 호출 횟수 |
| `news_count` | object | `{"global":12, "domestic":12}` | 실제 채운 개수 |
| `source_url_coverage` | string | `"21/24"` 형식 | sourceUrl 채운 뉴스 수 / 전체 뉴스 수 |
| `sources_attempted` | object | `{"Stooq":"fail:403","Yahoo":"8/8",...}` | 출처별 성공/시도 |
| `masking_used` | array | **항상 `[]`** | 마스킹 금지 룰(§6) 적용. 채워졌다면 운영 측 신호 |
| `push` | object | `{"branch":"claude/...","commit":"abc1234","merged":true}` | 푸시 브랜치 / 커밋 sha 7자 / auto-merge 성공 여부 |

### 보고 정확도 등급

- **정확값 ✓**: `duration_seconds`, `response_size_kb`, `tool_calls`, `news_count`, `source_url_coverage`, `sources_attempted`, `push`
- **추산값 [EST]**: `tokens_estimated` — usage.html 다이얼로그에서 `[EST]` 배지로 표시되고 claude.ai Settings → Usage 링크 안내됨
- **선택 ✓**: `tokens_actual` — 자체 보고 가능하면 정확값으로 입력 (있으면 다이얼로그에 ✓ 표시)

### 운영 노트

- `masking_used` 배열에 무언가 채워졌다는 건 §6 룰을 어겼다는 뜻 → 다음 발화 시 가이드 점검 필요
- `sources_attempted`는 fallback 체인 추적용. Stooq 403 / Yahoo 성공률 / Google Finance 0/0 같은 패턴이 누적되면 환경 변화 신호
- `tokens_estimated`가 1M 토큰(Max 20x 5시간 한도)에 근접하면 발화 빈도·범위 재검토

---

## 8. 출력 규약

- 파일 인코딩: UTF-8
- 들여쓰기: 2 spaces
- 키 순서: 스키마 정의 순서 따름
- 모든 값은 string (숫자도 포맷된 string)
- `dir`/`sentiment`/`categoryStyle`/`badgeType` 등 enum은 정확히 일치 (대소문자 포함)
- HTML 태그(예: `<b>`)는 `comment` 필드에서만 허용. 나머지는 plain text

---

## 9. 운영 노트

### 휴장일·공휴일 처리

| 상황 | 처리 |
|---|---|
| **미국 휴장일** (Memorial Day, Thanksgiving 등) | Stooq는 전 거래일 값을 반환. `us.subNote`에 "○월 ○일은 美 휴장이라 ○일 마감값 기준" 명시. **휴장 날짜 추측 금지** — Trading Economics 또는 Investing.com 경제캘린더에서 확인. 주요 美 휴장일: New Year(1/1), MLK Day(1월 셋째 월), Presidents Day(2월 셋째 월), Good Friday(4월 부활절 직전 금), **Memorial Day(5월 마지막 월 — 2026년=5/25)**, Juneteenth(6/19), Independence Day(7/4), Labor Day(9월 첫 월), Thanksgiving(11월 넷째 목), Christmas(12/25) |
| **한국 공휴일** | 데이터는 생성 (美 증시·글로벌 뉴스는 유효). `kr.subNote`에 "오늘은 국내 증시 휴장" 명시. `kr.indices/flow/supply/sectorsUp/Down`은 전 거래일 값 유지하되 `kr.expectedRange`는 `"휴장"`으로 |
| **주말 (美·韓 동시 휴장)** | (1) `us.subNote`에도 "美 증시 주말 휴장, X월 X일(금) 마감값 기준" 명시. (2) `us.indices`/`indicators`/`sectorsUp/Down`은 직전 거래일 값 유지. (3) `calendar.domestic.timed/untimed` 빈 배열 + "주말로 주요 일정 없음". (4) `calendar.global.timed` 빈 배열, `untimed`에는 다음 거래일 주요 일정 안내 가능 |
| **routine 자체 실패** | 그날 skip → manifest 미갱신 → 캘린더에서 비활성. 사용자는 자동으로 가장 최근 가용 날짜의 데이터 봄 (의도된 fallback) |

### 기타

- 실값 누락은 §6 룰대로 **항목 자체 제거** (마스킹 금지). 인덱스는 빈 배열·짧은 배열을 자연스럽게 처리.
- 푸터 면책은 index.html에서 등급별로 표기 (자동 갱신 아님 — 정적).
- routine 실패 시 manifest를 갱신하지 않음으로써 페이지가 자동으로 최신 가용 날짜를 보여주는 게 핵심 안전장치.

---

## 10. HTML 렌더링 룰 (JSON → DOM)

**원칙**: JSON에는 본문 데이터만. prefix·라벨·정적 텍스트는 모두 JS 템플릿에서 박음.

### 10.1 subNote / subNoteEm 패턴

JSON:
```json
{
  "subNote": "기술주 주도로 3대 지수 혼조 속 강세, 반도체가 상승 견인",
  "subNoteEm": "3대 지수 혼조 속 강세"
}
```

JS:
```js
element.innerHTML = subNote.replace(
  subNoteEm,
  `<span class="em">${subNoteEm}</span>`
);
```

**제약**: `subNoteEm`은 반드시 `subNote`의 부분 문자열. Sanity Check에 포함됨.

### 10.2 정적 prefix가 붙는 필드

| 필드 | JSON 값 (본문만) | 렌더링 결과 (HTML) |
|---|---|---|
| `kr.expectedRange` | `"코스피 +0.2% ~ +0.8% 부근"` | `<div class="range">예상 등락 범위 · 코스피 +0.2% ~ +0.8% 부근</div>` |
| `calendar.riskSentiment` | `"위험선호 우위"` | `오늘 리스크 심리 <span class="badge">위험선호 우위</span>` |
| `calendar.theme` | `"AI 반도체 수요 모멘텀이..."` | `<div class="theme"><b>오늘의 테마</b>AI 반도체 ...</div>` |
| `NewsItem.note` | `"위험자산·신흥국 증시에 우호적"` | `<div class="why"><b>📖 정리</b> · 위험자산·신흥국 증시에 우호적</div>` |

### 10.3 HTML 허용 필드

| 필드 | 허용 | 렌더링 방식 |
|---|---|---|
| `us.comment`, `kr.comment` | `<b>` 태그 + 인라인 style 허용 (예: `<b style="color:var(--blue);">...</b>`) | `innerHTML` |
| 그 외 모든 string 필드 | plain text | `textContent` (XSS 방지) |

### 10.4 dir 필드와 value 안의 ▲/▼

| 필드 | value에 ▲/▼ 포함? | dir 역할 |
|---|---|---|
| `Index` | 별도 `change` 필드에 ▲/▼ (예: `"▲ 0.61%"`) | `.up`/`.down` 클래스 매핑 |
| `Indicator` | value에 포함 가능 (`"13.4 ▼"`) | 색상 결정 |
| `FlowItem` | value에 포함 가능 (`"1,3xx원 ▼"`) | 색상 결정 |
| `HealthItem` | `subIcon` 별도 (`"▲"`, `"±"`) | `subDir`로 색상 결정 |

**룰**: value는 표시 텍스트 그대로(▲/▼ 포함). dir는 클래스 매핑용. JS는 둘 다 사용.

### 10.5 enum → 클래스 매핑 (JS 구현 시 참조)

| enum 값 | 클래스 |
|---|---|
| `dir: "up"` | `.up` |
| `dir: "down"` | `.down` |
| `dir: "neutral"` | (클래스 없음) |
| `SupplyItem.dir: "buy"` | `.buy` (빨강) |
| `SupplyItem.dir: "sell"` | `.sell` (파랑) |
| `sentiment: "pos"` | `.tag.pos` |
| `sentiment: "neg"` | `.tag.neg` |
| `sentiment: "neu"` | `.tag.neu` |
| `categoryStyle: "default"` | `.tag` (단독) |
| `categoryStyle: "geo"` | `.tag.geo` |
| `categoryStyle: "tech"` | `.tag.tech` |
| `badgeType: "up"` | `.badge2.up` |
| `badgeType: "default"` | `.badge2` (단독) |

### 10.6 카운트 표시

`world.global.length`, `world.domestic.length`를 하위탭의 `<span class="cnt">` 안에 동적 입력. 항상 12지만 길이 추출이 안전.

### 10.7 TimedEvent.important

`important: true`일 때만 `<span class="imp">중요</span>` 추가. `false`/생략이면 미표시.

### 10.8 동적 영역 ID·class (JS가 알아야 할 hook)

| 영역 | 컨테이너 |
|---|---|
| 날짜 칩 | `#dateText` |
| 캘린더 그리드 | `#calGrid` |
| US 섹션 | `#us .card` 내부 |
| World 글로벌 | `#global` |
| World 국내 | `#domestic` |
| KR 섹션 | `#kr .card` 내부 |
| Calendar 섹션 | `#cal .card` 내부 |

루틴은 이 hook들을 알 필요 없음 (JS가 처리). 컨텍스트엔 참고용으로 기록.
