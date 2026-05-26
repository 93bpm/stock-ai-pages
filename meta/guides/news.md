# guides/news.md — 뉴스 큐레이션 + sourceUrl 일체화

routine이 **뉴스 큐레이션 단계**에서 ★필수★ 정독.
관련 체크리스트: `meta/context.md` "📰 뉴스 큐레이션" 섹션.

**v1.4.0 핵심 변경**: 옛 "sourceUrl 권장(optional)" 룰 폐기 → **sourceUrl 24/24 필수** + 차단 도메인 금지 + source-URL 도메인 일관성.

---

## §1. 핵심 원칙 — sourceUrl 일체화

뉴스 1건 = `{rank, category, categoryStyle, sentiment, title, summary, source, sourceUrl, note}` **5+개 필드 한 묶음**.
URL과 헤드라인을 따로 다루지 않음. 후보 수집 단계부터 끝까지 **1:1 매핑 유지**.

**금지**: "헤드라인 먼저 작성하고 URL은 나중에 채우기" 모델 ❌ — 이게 옛 사고의 원인 (sourceUrl 누락, source-URL 불일치).

---

## §2. 절차 (7+1단계)

### 1️⃣ 후보 30~50건 수집 (URL 포함된 것만)

- 여러 검색 쿼리로 다각도 수집 (단일 쿼리·단일 도메인 금지)
- 각 후보를 `{title, snippet, url, source 도메인, publishedDate}` 객체로 보관
- **URL 없는 검색 결과는 이 시점에 즉시 후보에서 제외** (뒷단계로 끌고 가지 말 것)

### 2️⃣ 차단 도메인 필터링 (§3 차단 도메인 표 참조)

후보의 `url` 도메인이 다음 중 하나면 **즉시 제외**:
- `bloomberg.com`
- `wsj.com`
- `ft.com`
- `reuters.com`
- `mk.co.kr`
- `yna.co.kr`

단, 그 사건 자체는 가치 있을 수 있으니 **다른 공개 매체에서 동일 사건 보도 검색**해서 대체 후보 확보:
- 예: `"엔비디아 실적 보도" -site:bloomberg.com -site:wsj.com`
- 또는: `site:cnbc.com 엔비디아 실적`
- 또는: 일반 검색 후 결과에서 공개 매체(CNBC, MarketWatch, Yahoo Finance, Investing.com 등) 골라 사용

### 3️⃣ 중복 제거

- URL 도메인+슬러그 기준 + 같은 사건 여러 매체는 가장 신뢰 가능 1건만
- **sourceUrl 중복 0건이어야 함** (Sanity Check에서 검증)

### 4️⃣ 중요도 평가

- 시장 영향력
- 신선도 (최근 24시간 우선, 큰 사건은 1주 이내까지)
- 출처 신뢰도 (§3·§4 출처 분류 참조)

### 5️⃣ 카테고리 분포 고려

- 통화정책·지정학·기술·기업·거시·원자재·정책·수급 등 골고루
- **한 카테고리 4건 초과 금지** (다양성 유지)

### 6️⃣ TOP 12 선별

- rank 01~12 부여 (중요도 순)
- 선별 시 5+개 필드 **묶음 단위**로. title만 뽑고 URL 나중에 매핑 X
- title·summary·source는 **선택된 후보의 url과 매칭되는 그 검색 결과로부터만** 작성
- 다른 매체 검색 결과의 정보를 끌어와 합성 금지 (source-content 일관성)

### 7️⃣ source ↔ sourceUrl 도메인 일관성 검증

- `source: "CNBC"` 면 `sourceUrl` 도메인은 `cnbc.com`이어야 함
- §5 도메인 매핑 표 참조
- 불일치 발견 시:
  - 옵션 A: source명을 URL 도메인에 맞춰 정정 (예: source="Bloomberg" + URL=cnbc.com → source="CNBC"로 변경)
  - 옵션 B: 그 후보 제외 + 다른 후보로 교체

### 🔁 최종 검증 (Sanity Check 일부)

`guides/data-quality.md §4`의 sourceUrl 5룰 적용:
- sourceUrl 24/24 채움 (빈 값 0건)
- 차단 도메인 sourceUrl 0건
- sourceUrl 중복 0건
- source ↔ sourceUrl 도메인 일관성
- 모든 sourceUrl 형식 valid URL

---

## §3. 글로벌 12건 출처 분류

| 분류 | 도메인 | sourceUrl 사용 |
|---|---|---|
| 1순위 (안정·공개) | `cnbc.com`, `nikkei.com` (`asia.nikkei.com` 포함), `caixinglobal.com` (`caixin.com`) | ✅ 직접 사용 |
| 2순위 (공개 매체) | `investing.com`, `forbes.com`, `marketwatch.com`, `finance.yahoo.com`, `politico.com`, `scmp.com`, `npr.org` | ✅ 직접 사용 |
| ⚠️ **차단/paywall** | `bloomberg.com`, `wsj.com`, `ft.com`, `reuters.com` | ❌ **sourceUrl 사용 금지**. 검색 결과 참고만 하고 **동일 사건의 공개 매체 보도로 교체** |

---

## §4. 국내 12건 출처 분류

| 분류 | 도메인 | sourceUrl 사용 |
|---|---|---|
| 1순위 (안정·공개) | `hankyung.com`, `edaily.co.kr`, `mt.co.kr`, `fnnews.com` | ✅ 직접 사용 |
| 2순위 (공개 매체) | `newspim.com`, `etoday.co.kr`, `asiae.co.kr`, `sedaily.com`, `heraldcorp.com`, `news1.kr`, `kbs.co.kr`, `imbc.com`, `jtbc.co.kr`, `einfomax.co.kr` | ✅ 직접 사용 |
| ⚠️ **차단/paywall** | `mk.co.kr` (매경), `yna.co.kr` (연합뉴스) | ❌ **sourceUrl 사용 금지**. 동일 사건의 공개 매체로 교체 |

---

## §5. source ↔ sourceUrl 도메인 매핑 표 (★일관성 검증용★)

| source 표기 | 허용 도메인 |
|---|---|
| CNBC | `cnbc.com` |
| Bloomberg | `bloomberg.com` ❌ (차단 — 사용 금지) |
| Nikkei | `nikkei.com`, `asia.nikkei.com` |
| Caixin | `caixinglobal.com`, `caixin.com` |
| Investing.com | `investing.com`, `kr.investing.com` |
| Yahoo Finance | `finance.yahoo.com` |
| MarketWatch | `marketwatch.com` |
| Forbes | `forbes.com` |
| NPR | `npr.org` |
| Politico | `politico.com` |
| SCMP | `scmp.com` |
| Reuters | `reuters.com` ❌ (차단) |
| WSJ | `wsj.com` ❌ (차단) |
| FT | `ft.com` ❌ (차단) |
| 한국경제 | `hankyung.com` |
| 이데일리 | `edaily.co.kr` |
| 머니투데이 | `mt.co.kr` |
| 파이낸셜뉴스 | `fnnews.com` |
| 뉴스핌 | `newspim.com` |
| 이투데이 | `etoday.co.kr` |
| 아시아경제 | `asiae.co.kr` |
| 서울경제 | `sedaily.com` |
| 헤럴드경제 | `heraldcorp.com` |
| 뉴스1 | `news1.kr` |
| 연합인포맥스 | `einfomax.co.kr` |
| KBS | `kbs.co.kr` |
| MBC | `imbc.com` |
| JTBC | `jtbc.co.kr` |
| 매경 | `mk.co.kr` ❌ (차단) |
| 연합뉴스 | `yna.co.kr` ❌ (차단) |

> 매핑 표에 없는 매체는 WebSearch로 `"{매체명} 공식 도메인"` 1회 조회해서 확인 후 사용.

---

## §6. 검색 쿼리 예시

### 글로벌 (10+개 권장)

```
"미국 증시 마감"
"FOMC 통화정책"
"AI 반도체 실적"
"지정학 유가"
"PCE 인플레이션"
"중국 부양책"
"엔비디아 실적"
"BOJ 정책"
"ECB 금리"
"메모리얼데이 휴장"
"미시간 소비심리"
"비트코인 ETF"
```

### 국내 (10+개 권장)

```
"코스피 마감"
"외국인 수급"
"코스닥 사이드카"
"한은 금통위"
"반도체 HBM"
"2차전지 수주"
"바이오 CDMO"
"조선 방산"
"국민성장펀드"
"환율 1500원"
"MSCI 리밸런싱"
"공매도 잔고"
```

### 차단 도메인 회피 쿼리 예시

```
"{사건명}" -site:bloomberg.com -site:wsj.com -site:ft.com -site:reuters.com
site:cnbc.com {사건명}
site:hankyung.com OR site:edaily.co.kr OR site:mt.co.kr {사건명}
```

---

## §7. 금지 사항 (Sanity Check fail 트리거)

| 위반 | 처리 |
|---|---|
| ❌ sourceUrl 비우기 | 후보 단계에서 URL 없는 결과를 통과시켰기 때문. 그 헤드라인 폐기 + 다른 후보로 교체 |
| ❌ sourceUrl 도메인이 차단 리스트 | bloomberg/wsj/ft/reuters/mk/yna 발견 시 동일 사건 공개 매체로 교체 |
| ❌ 같은 sourceUrl이 두 뉴스에 사용 | 한쪽을 다른 후보로 교체 |
| ❌ source명과 sourceUrl 도메인 불일치 | §5 매핑 표 기준. source 정정 또는 후보 교체 |
| ❌ sourceUrl 형식 오류 (URL 아님) | 형식 검증 — 후보 단계에서 url validation 통과한 것만 |

→ **금지 사항 발견 시 그 뉴스만 후보 교체 후 재선별**. 24건 못 채우면 Sanity Check fail (`guides/data-quality.md §4·§5`).
