# stock-ai-pages

매일 아침 자동 생성되는 **한국·미국 증시 브리핑** 페이지.

**[페이지 열기 →](https://93bpm.github.io/stock-ai-pages/)**

---

## 개요

매일 KST 08:00, Claude routine이 클라우드에서 자동 실행되어:

1. **데이터 수집** — Stooq · finviz · Trading Economics · Investing.com · Yahoo Finance · Google Finance · WebSearch
2. **JSON 생성** — 4개 섹션(美 증시 / 세계 뉴스 / 韓 증시 예상 / 오늘 일정)
3. **자동 푸시** — GitHub Pages에 즉시 반영

사용자는 페이지를 열면 그날 최신 브리핑을 보고, 상단 날짜 칩을 눌러 과거 날짜로 이동할 수 있습니다 (데이터가 있는 날만 활성).

---

## 구조

```
stock-ai-pages/
├── index.html              # 정적 페이지 (껍데기 + 렌더링 JS)
├── usage.html              # 사용량 history 페이지
├── README.md               # 프로젝트 개요
├── VERSION.md              # 버전 이력
├── meta/                   # 메타 (스키마·가이드·인덱스)
│   ├── context.md          # 매 발화 메인 체크리스트
│   ├── schema.json         # 데이터 형식 규약 (JSON Schema)
│   ├── manifest.json       # 가용 날짜 목록 (단일 진실 소스)
│   ├── usage.json          # 사용량 history 누적
│   └── guides/             # 분야별 상세 가이드 (단계별 fetch)
│       ├── sources.md      # 시세·캘린더 출처 + fallback 체인
│       ├── news.md         # 뉴스 큐레이션 + sourceUrl 일체화
│       ├── data-quality.md # 데이터 등급 + Sanity Check + 마스킹 금지
│       ├── outputs.md      # 출력 규약 + manifest + usage + HTML 렌더링
│       └── operations.md   # 톤·문체 + 휴장일 + 운영 노트
├── briefing/               # 일일 데이터 (immutable)
│   └── YYYY-MM-DD.json     # 그날의 브리핑 데이터
└── .github/workflows/
    └── auto-merge-routine.yml  # claude/* 브랜치 자동 머지
```

---

## 데이터 출처

| 카테고리 | 출처 |
|---|---|
| 美 지수·지표·섹터 ETF | [Stooq](https://stooq.com), [finviz](https://finviz.com) |
| 韓 지수·환율 | Stooq, [Investing.com](https://kr.investing.com) |
| 韓 개별 종목 | [Yahoo Finance](https://finance.yahoo.com) → [Google Finance](https://www.google.com/finance) → [Investing.com](https://www.investing.com) |
| 야간선물 (코스피200) | Investing.com 코스피200 선물 |
| 경제 캘린더 | [Trading Economics](https://tradingeconomics.com) |
| 기업 실적 일정 | Investing.com 실적 캘린더 |
| 뉴스 (글로벌 12 + 국내 12) | WebSearch (CNBC, Bloomberg, Nikkei, 한경, 이데일리, MT 등) |

자세한 룰과 fallback은 [`meta/context.md`](./meta/context.md) 참조.

---

## 면책 (Disclaimer)

- 美 지수·환율·VIX/금리/유가/금/BTC·경제일정·기업 실적 일정은 **실값** (위 출처 기준)
- 모든 수치는 실값을 사용하며, 출처 한계로 값을 못 찾으면 해당 항목을 데이터에서 **제거**합니다 (v1.2.0부터 마스킹 금지 정책)
- 한줄평·테마·예상 범위는 **LLM 종합 의견** — 참고용이며 **투자 조언 아닙니다**
- 모든 데이터는 발행 시점 기준이며 정확성·완전성을 보장하지 않습니다
- 투자 판단과 책임은 본인에게 있습니다

---

## 로컬 실행

```bash
# 정적 서버 띄우기
npx http-server . -p 5173 -c-1

# http://localhost:5173 접속
```

URL 해시로 특정 날짜 바로 보기: `http://localhost:5173/#date=2026-05-22`

---

## 스키마 검증

```bash
npx --yes --package=ajv-cli@5 --package=ajv-formats@3 \
  ajv validate -s meta/schema.json -d "briefing/YYYY-MM-DD.json" -c ajv-formats
```

---

## 버전

현재 **v1.4.0** (2026-05-25) — 가이드 구조 분리 (5개 `guides/*.md`) + 뉴스 sourceUrl 일체화 (24/24 클릭 가능, 차단 도메인 금지).

전체 변경 이력은 [`VERSION.md`](./VERSION.md) 참고.

---

## 라이선스

코드는 자유 사용 가능. 데이터·뉴스는 각 출처의 라이선스를 따릅니다.
