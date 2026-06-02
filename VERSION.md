# Version History

`stock-ai-pages` 버전 이력.

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
| **v1.6.0** | 2026-06-01 | **콘텐츠 품질 4종** — ① **subNoteEm 유실 수정**: routine이 헤드라인으로 쓰던 subNoteEm이 subNote 부분문자열이 아닐 때 화면에서 사라지던 문제를 `emWrap` B안(부분문자열이면 inline 강조, 아니면 헤드라인 `.em-lead`+보조 `.aux` 분리 표시)으로 해결. "부분문자열 강제" 룰 폐지 (`schema`·`validate-briefing.mjs`·`data-quality.md`·`outputs.md`·`context.md` 동기화). ② **월간 종합**: `calendarMonth`가 매일 재생성(누적 X)이라 그날 검색 누락분이 영구 손실되던 문제를, 렌더 시 같은 달 모든 briefing의 `calendarMonth.days`+`calendarWeek.days`를 `(date,event)` dedup 머지(`aggregateMonth`, lazy 캐시)로 해결 — routine 무수정·과거분 즉시 종합. ③ **category enum 4→7종** (holiday/market/industry 추가, `CAT_LABEL` 동기화). ④ **빅테크 보강**: `whitelist-us-bigtech.json` 신설(M7+韓직결 반도체 11종, earnings·global) + 학회 화이트리스트 10→17종(Google I/O·MS Build·MS Ignite·Meta Connect·AWS re:Invent·삼성 언팩·Apple 가을) + `sources.md §16` 중복표 JSON 위임(SSOT, md −2줄) + 검증룰 ⑧ region별 화이트리스트 확장 |
| **v1.5.1** | 2026-05-29 | **LLM 의견 필드 페르소나 분리** — 美 증시 해설가 + 韓 증시 해설가 + 美·韓 종합 페르소나 신설. 22개 필드 / 약 115 인스턴스에 페르소나 적용 (`us.comment·subNote/Em`, `kr.comment·subNote/Em·expectedRange·watchlist[].desc`, `world.global[].{note,sentiment,categoryStyle,category}` × 12, `world.domestic[].{...}` × 12, `world.subNote/Em`, `calendar.subNote/Em·theme·checks[]`). 시세·뉴스 사실 데이터(`indices`·`indicators`·`sectors`·`flow`·`supply`·`health`·`title`·`summary`·`source(Url)`·일정 items 등 17개 영역)는 페르소나 영향 X (원문 그대로). Sanity Check에 페르소나 위반 grep 4종 추가 (①단정 표현·②추천성·③격식체·④길이 위반 — title ≤30자 / summary ≤60자 / note ≤25자, **문자 수 기준**). Step 9 결과 보고에 4종 위반 건수 명시. `meta/guides/operations.md §1.1~§1.6`가 SSOT, `meta/context.md`·`meta/guides/data-quality.md §4`에 체크리스트·grep 동기화 |
| **v1.5.0** | 2026-05-29~ | 일정 탭 3뷰 확장 — [오늘/주간/월간] 세그먼트 컨트롤 + `calendarWeek`(일~토 7일 좌우 스크롤)·`calendarMonth`(6×7 달력) 신규 필드 + 시총 2000억+ 韓 종목 화이트리스트(`data/whitelist-kr-marketcap.json` ~500 종목, 매월 1일 routine 갱신) + 학회 화이트리스트(`data/whitelist-conferences.json` 10개: GTC/WWDC/CES/NeurIPS/ASCO 등) + 호버 툴팁(모바일 tap). **UI 분기 정책**: 일간 뷰는 항상 동일. `data.calendarWeek` 존재 시에만 세그먼트 컨트롤 [오늘/주간/월간] 자동 노출. 옛 데이터(5/28 이전·prompt 미적용)는 옛 UI 그대로 유지. 옛 v1.5.0 후보(Actions 분담+extras) → v1.6.0 으로 이동 |
| **v1.4.4** | 2026-05-27 | `response_size_kb` 정확도 강제 보장 — (1) routine 자체 측정 룰 (`wc -c` 후 KB 환산) 가이드 추가, (2) **CI에서 최종 검증·보정** (`auto-merge-routine.yml`이 briefing 파일을 실측해 routine 보고값과 다르면 자동 덮어쓰기 커밋). 5/25~5/27 실측 결과 기존 자체 추산이 실제보다 19~24% 과소 계상되던 문제 해소. 1발화 = 1커밋 원칙은 보정 커밋 +1로 깨질 수 있음 (정확도 우선) |
| v1.4.3 | 2026-05-27 | SSOT 중복 정리 — `meta/context.md` 재설계 (133→101줄, 안전 원칙 11→4개 + 본문 중복 8개 제거) + 시각·차단 도메인·카운트·버전 master 일원화 (`schema.json`·`VERSION.md`·`guides/news.md`로 위임) + ⚡ 병렬 도구 호출 룰 신설 (context.md에서 직접 명시 → RemoteTrigger API 차단 우회, 5/28 발화부터 25~30% 시간 단축 기대) |
| v1.4.2 | 2026-05-27 | `duration_seconds` wall-clock 측정 룰 신설 (Step 0에서 UTC epoch 캡처 → usage.json append 직전 차감). 기존 회고적 추정값이 실제의 1/3~1/5로 과소 계상되던 문제 해소. **커밋 메시지 형식 고정**: `routine: YYYY-MM-DD HH:MM` (KST) |
| v1.4.1 | 2026-05-26 | KST 날짜 사고 차단 — Sanity Check에 UTC→KST 변환 검증 5룰 추가 |
| v1.4.0 | 2026-05-25 | 가이드 구조 분리 (`meta/guides/` 5개 파일) + 뉴스 sourceUrl 일체화 (24/24 클릭 가능, 차단 도메인 금지, source-URL 일관성) |
| v1.3.0 | 2026-05-25 | 韓 개별 종목 출처 마이그레이션 (Yahoo/Google/Investing 3단 체인) + slug 매핑 표 14종 신설 |
| v1.2.0 | 2026-05-25 | meta/ 폴더 통합, 토큰 사용량 페이지(`usage.html`), 마스킹 금지 정책 |
| v1.1.0 | 2026-05-24 | GitHub Actions auto-merge workflow + routine 환경 가이드 보강 |
| v1.0.2 | 2026-05-22 | 美 지수 ETF 가격 → 진짜 지수 값 정정 |
| v1.0.1 | 2026-05-22 | `NewsItem.sourceUrl` 추가 (헤드라인·출처 클릭 가능 링크) |
| v1.0.0 | 2026-05 | 첫 출시 (시나리오 B: claude.ai routine + 키 없음) |
