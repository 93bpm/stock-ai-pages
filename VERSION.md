# Version History

`stock-ai-pages` 버전 이력.

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
| **v1.4.3** | 2026-05-27 | SSOT 중복 정리 — `meta/context.md` 재설계 (133→101줄, 안전 원칙 11→4개 + 본문 중복 8개 제거) + 시각·차단 도메인·카운트·버전 master 일원화 (`schema.json`·`VERSION.md`·`guides/news.md`로 위임). routine prompt 정리는 v1.4.4 후보 (RemoteTrigger API v1→v2 마이그레이션 이슈) |
| v1.4.2 | 2026-05-27 | `duration_seconds` wall-clock 측정 룰 신설 (Step 0에서 UTC epoch 캡처 → usage.json append 직전 차감). 기존 회고적 추정값이 실제의 1/3~1/5로 과소 계상되던 문제 해소. **커밋 메시지 형식 고정**: `routine: YYYY-MM-DD HH:MM` (KST) |
| v1.4.1 | 2026-05-26 | KST 날짜 사고 차단 — Sanity Check에 UTC→KST 변환 검증 5룰 추가 |
| v1.4.0 | 2026-05-25 | 가이드 구조 분리 (`meta/guides/` 5개 파일) + 뉴스 sourceUrl 일체화 (24/24 클릭 가능, 차단 도메인 금지, source-URL 일관성) |
| v1.3.0 | 2026-05-25 | 韓 개별 종목 출처 마이그레이션 (Yahoo/Google/Investing 3단 체인) + slug 매핑 표 14종 신설 |
| v1.2.0 | 2026-05-25 | meta/ 폴더 통합, 토큰 사용량 페이지(`usage.html`), 마스킹 금지 정책 |
| v1.1.0 | 2026-05-24 | GitHub Actions auto-merge workflow + routine 환경 가이드 보강 |
| v1.0.2 | 2026-05-22 | 美 지수 ETF 가격 → 진짜 지수 값 정정 |
| v1.0.1 | 2026-05-22 | `NewsItem.sourceUrl` 추가 (헤드라인·출처 클릭 가능 링크) |
| v1.0.0 | 2026-05 | 첫 출시 (시나리오 B: claude.ai routine + 키 없음) |
