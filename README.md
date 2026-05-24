# stock-ai-pages

매일 아침 자동 생성되는 **한국·미국 증시 브리핑** 페이지.

**[페이지 열기 →](https://93bpm.github.io/stock-ai-pages/)**

---

## 개요

매일 KST 08:00, Claude routine이 클라우드에서 자동 실행되어:

1. **데이터 수집** — Stooq · finviz · Trading Economics · Investing.com · Alphasquare · WebSearch
2. **JSON 생성** — 4개 섹션(美 증시 / 세계 뉴스 / 韓 증시 예상 / 오늘 일정)
3. **자동 푸시** — GitHub Pages에 즉시 반영

사용자는 페이지를 열면 그날 최신 브리핑을 보고, 상단 날짜 칩을 눌러 과거 날짜로 이동할 수 있습니다 (데이터가 있는 날만 활성).

---

## 구조

```
stock-ai-pages/
├── index.html              # 정적 페이지 (껍데기 + 렌더링 JS)
├── usage.html              # 사용량 history 페이지
├── meta/                   # 메타 (스키마·가이드·인덱스)
│   ├── schema.json         # 데이터 형식 규약 (JSON Schema)
│   ├── context.md          # 매일 routine이 따르는 운영 가이드
│   ├── manifest.json       # 가용 날짜 목록 (단일 진실 소스)
│   └── usage.json          # 사용량 history 누적
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
| 韓 개별 종목 | [Alphasquare](https://alphasquare.co.kr) |
| 야간선물 (코스피200) | Investing.com 코스피200 선물 |
| 경제 캘린더 | [Trading Economics](https://tradingeconomics.com) |
| 기업 실적 일정 | Investing.com 실적 캘린더 |
| 뉴스 (글로벌 12 + 국내 12) | WebSearch (CNBC, Bloomberg, Nikkei, 한경, 이데일리, MT 등) |

자세한 룰과 fallback은 [`meta/context.md`](./meta/context.md) 참조.

---

## 면책 (Disclaimer)

- 美 지수·환율·VIX/금리/유가/금/BTC·경제일정·기업 실적 일정은 **실값** (위 출처 기준)
- 韓 업종 일부 항목·공매도 잔고 종목명 등은 출처 한계로 **마스킹**될 수 있음 (`+3,2xx`, `5x.x조`, `○○○`)
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

- **v1.0.0** (2026-05) — 첫 출시. 시나리오 B (claude.ai 클라우드 routine, 키 없음, 마스킹 fallback)

향후 v2 계획: 한국투자증권 OpenAPI(키 사용) + GitHub Actions 부분 도입으로 마스킹 0건 달성

---

## 라이선스

코드는 자유 사용 가능. 데이터·뉴스는 각 출처의 라이선스를 따릅니다.
