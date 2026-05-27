# Version History

`stock-ai-pages` 버전 이력.

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
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
