# guides/outputs.md — 출력 규약 + manifest + usage.json + HTML 렌더링

routine이 **산출물 작성 단계 + HTML 렌더링 검증**에서 정독.
관련 체크리스트: `meta/context.md` "💾 산출물 갱신" 섹션.

---

## §1. Manifest 갱신 (`meta/manifest.json`)

브리핑 JSON 저장 후, **같은 커밋에서** manifest를 갱신해야 인덱스가 새 날짜를 인식해요.

### 갱신 절차

```
1. meta/manifest.json 읽기 (없으면 {"dates":[], "latest":null} 초기화)
2. ⚠️  dates 배열에 새 날짜 추가 (이미 있으면 skip — 중복 절대 금지)
3. ⚠️  dates 배열 오름차순 정렬 (필수 — 인덱스 캘린더가 이걸 가정해 활성화 표시함)
4. latest = dates의 마지막 원소 (정렬 후 가장 최근 날짜)
5. updatedAt = 현재 KST ISO 시각 (예: "2026-05-24T08:05:00+09:00")
6. meta/manifest.json 저장 (UTF-8, 2 space indent)
```

### 중복·정렬 실수의 영향

- 중복 → 캘린더에 같은 날짜 중복 활성화 (시각 이상)
- 정렬 안 됨 → `latest`가 최신이 아닐 수 있음 → 첫 로드 시 잘못된 날짜 표시

---

## §2. usage.json 갱신 (`meta/usage.json`)

발화 종료 직전, `meta/usage.json`의 `history` 배열에 **이번 발화 entry 1개를 append**. usage.html 페이지가 이걸 읽어 그래프·표 렌더링.

### 갱신 절차

```
1. meta/usage.json 읽기 (없으면 {"history":[], "updatedAt":""} 초기화)
2. 이번 발화 entry 객체 생성 (아래 필드 명세 참고)
3. history 배열에 append (정렬 불필요 — 자연 append 순서로 시간순 보장)
4. updatedAt = 현재 KST ISO 시각
5. meta/usage.json 저장 (UTF-8, 2 space indent)
```

### Entry 필드 명세 (14개)

| 필드 | 타입 | 값 | 채움 방식 |
|---|---|---|---|
| `date` | string | `"YYYY-MM-DD"` | KST 날짜 |
| `time` | string | `"HH:MM"` | KST 24h 발화 시각 |
| `model` | string | `"claude-opus-4-7"` 등 (콘솔 설정 값) | **자체 추측 금지** — claude.ai 콘솔의 routine 설정값을 그대로. 모를 시 `"unknown"`. LLM 자체 보고는 부정확 (5/26~5/28 사례) |
| `status` | string | `"success" / "skip" / "fail"` | 정상 종료 / sanity skip / 예외 |
| `duration_seconds` | number | 발화 시작~끝 초 (wall-clock) | **정확값 ✓** — 단, 아래 "duration_seconds 측정 절차" 따라야 함 |
| `tokens_estimated` | number | 한국어 ~2자/토큰 환산 | **추산값** (정확값은 claude.ai Usage에서 확인) |
| `tokens_actual` | number? | API 정확 토큰 (가능하면) | optional. 정확값 ✓ |
| `response_size_kb` | number | 응답 본문 KB (briefing JSON 실제 파일 크기) | **정확값 ✓** — 단, 아래 "response_size_kb 측정 절차" 따라야 함 |
| `tool_calls` | object | `{"WebFetch":N, "WebSearch":N, "Read":N, "Write":N, "Bash":N}` | 각 도구 호출 횟수 |
| `news_count` | object | `{"global":12, "domestic":12}` | 실제 채운 개수 |
| `source_url_coverage` | string | `"24/24"` 형식 | sourceUrl 채운 뉴스 수 / 전체 뉴스 수 (★v1.4.0부터 24/24 목표★) |
| `sources_attempted` | object | `{"Stooq":"fail:403","Yahoo":"8/8",...}` | 출처별 성공/시도 (단순 카운트만. 비고는 보고용으로만) |
| `masking_used` | array | **항상 `[]`** | 마스킹 금지 룰(`guides/data-quality.md §3`) 적용. 채워졌다면 운영 측 신호 |
| `push` | object | `{"branch":"claude/..."}` | 푸시 브랜치명만 기록. **자기 SHA·머지 결과는 기록하지 않음** (사후 갱신용 추가 push 회피 — 1발화 = 1커밋 원칙). 정확한 SHA·머지 결과는 git log·GitHub Actions에서 확인 |

### 보고 정확도 등급

- **정확값 ✓**: `duration_seconds`, `response_size_kb`, `tool_calls`, `news_count`, `source_url_coverage`, `sources_attempted`, `push`
- **추산값 [EST]**: `tokens_estimated` — usage.html 다이얼로그에서 `[EST]` 배지로 표시되고 claude.ai Settings → Usage 링크 안내됨
- **선택 ✓**: `tokens_actual` — 자체 보고 가능하면 정확값으로 입력 (있으면 다이얼로그에 ✓ 표시)

### duration_seconds 측정 절차 ★v1.4.2 신설★

루틴이 회고적으로 "대충 이 정도 걸린 것 같다"고 추정하면 도구 대기·검색 라운드를 빠뜨려 실제 wall-clock의 1/3~1/5로 과소 계상돼요. 다음 절차를 반드시 따라야 합니다.

```
[Step 0 — 루틴 진입 직후, 어떤 fetch보다 먼저]
  1. 현재 UTC epoch 초를 기록 (예: Bash `date +%s` 또는 동등 수단)
  2. 변수 START_TS에 저장 — 이 시점이 "발화 시작"

[Step N — usage.json 갱신 직전, push 직전]
  3. 현재 UTC epoch 초 다시 측정 → END_TS
  4. duration_seconds = END_TS - START_TS (정수)
  5. usage.json entry에 그 값 입력
```

**원칙**

- "발화 시작"은 **컨텍스트 fetch 직전** (= 첫 도구 호출 직전). 자체 사고 시간은 측정 못 해도 모든 외부 작업·검색·재시도·푸시 대기가 포함되어야 wall-clock이 됨
- "발화 끝"은 **usage.json append 직전**. 그 뒤 commit·push는 외부 워크플로우라 측정 어려움. 단 git push까지는 routine 책임이므로 가능하면 push 후 다시 측정해 덮어쓰기보다 push 직전이 안정적
- routine이 wall-clock 측정을 못하는 환경이면 (sandboxed shell 등) `duration_seconds`를 **null로 두고** `status` 직전에 운영 보고로 그 사실 명시 — 임의 추정값 채우기 금지

**과거 기록 보정**

기존 history entry는 자체 추정값이라 신뢰도 낮음. 과거 데이터는 그대로 두되, v1.4.2 적용 시점부터 새 entry는 위 절차로 측정. usage.html 평균 시간 카드는 자연스럽게 새 값 누적되면 보정됨.

### response_size_kb 측정 절차 ★v1.4.4 신설★

routine이 회고적으로 "대충 이 정도 KB"라고 추산하면 실제 파일 크기와 15~25% 벌어져요 (5/25~5/27 실측 검증 결과). briefing JSON 파일은 디스크에 존재하므로 **실측이 가능합니다**. 자체 추산 금지.

```
[Step N — briefing/YYYY-MM-DD.json 저장 직후, usage.json append 전]
  1. Bash로 파일 byte 크기 측정 (예: `wc -c < briefing/YYYY-MM-DD.json` 또는 `stat -c %s`)
  2. KB로 환산: bytes / 1024, 소수점 1자리 반올림
  3. usage.json entry의 response_size_kb에 그 값 입력
```

**원칙**
- 측정 대상은 **briefing JSON 단일 파일** (manifest·usage 제외)
- 단위: KB (1024 bytes). 소수점 1자리까지. 예: 25596 bytes → 25.0 KB
- routine이 파일 크기 측정 못하는 환경이면 (sandbox 등) `null`로 두기 — 임의 추산 금지

**CI 최종 검증·보정 ★강제★**

`.github/workflows/auto-merge-routine.yml`의 "Verify and patch response_size_kb" step이 매 푸시마다 briefing 파일을 `wc -c`로 실측해 routine 보고값과 비교. **다르면 자동으로 덮어쓰기 + 보정 커밋** (`fix: response_size_kb X.X → Y.Y (CI 실측 보정)`). 즉 routine이 측정 룰을 빼먹어도 main에 머지되는 시점엔 100% 정확값으로 정정됨.

이로 인해 1발화 = 1커밋 원칙은 깨질 수 있음 (보정 커밋 +1). 다만 정확도가 더 중요하다는 트레이드오프로 수용.

### 운영 노트

- `masking_used` 배열에 무언가 채워졌다는 건 `guides/data-quality.md §3` 룰을 어겼다는 뜻 → 다음 발화 시 가이드 점검 필요
- `sources_attempted`는 fallback 체인 추적용. Stooq 403 / Yahoo 성공률 / Google Finance 0/0 같은 패턴이 누적되면 환경 변화 신호
- `tokens_estimated`가 1M 토큰(Max 20x 5시간 한도)에 근접하면 발화 빈도·범위 재검토

---

## §3. 출력 규약

- 파일 인코딩: UTF-8
- 들여쓰기: 2 spaces
- 키 순서: 스키마 정의 순서 따름
- 모든 값은 string (숫자도 포맷된 string)
- `dir`/`sentiment`/`categoryStyle`/`badgeType` 등 enum은 정확히 일치 (대소문자 포함)
- HTML 태그(예: `<b>`)는 `comment` 필드에서만 허용. 나머지는 plain text

---

## §4. HTML 렌더링 룰 (JSON → DOM)

**원칙**: JSON에는 본문 데이터만. prefix·라벨·정적 텍스트는 모두 JS 템플릿에서 박음.

### §4.1 subNote / subNoteEm 패턴 (v1.6.0 — 헤드라인 분리)

`subNoteEm` = 섹션 **핵심 헤드라인** 한 줄. `subNote` = 보조 설명. 둘이 달라도 됨.

JSON:
```json
{
  "subNote": "美 증시 주말 휴장, 5/29(금) 마감값 기준",
  "subNoteEm": "S&P 500 신고가·다우 51,000 돌파"
}
```

JS (`emWrap`):
```js
// subNoteEm이 subNote의 부분문자열이면 → 그 부분만 inline 강조 (.em)
// 아니면 → subNoteEm을 헤드라인(.em-lead) + subNote를 보조 줄(.aux)로 분리 표시
```

**제약 없음** (v1.6.0): `subNoteEm`은 `subNote`의 부분 문자열일 필요 **없음**. 어느 경우든 둘 다 화면에 표시되어 유실 0. (옛 "반드시 부분 문자열" 제약 폐지)

### §4.2 정적 prefix가 붙는 필드

| 필드 | JSON 값 (본문만) | 렌더링 결과 (HTML) |
|---|---|---|
| `kr.expectedRange` | `"코스피 +0.2% ~ +0.8% 부근"` | `<div class="range">예상 등락 범위 · 코스피 +0.2% ~ +0.8% 부근</div>` |
| `calendar.riskSentiment` | `"위험선호 우위"` | `오늘 리스크 심리 <span class="badge">위험선호 우위</span>` |
| `calendar.theme` | `"AI 반도체 수요 모멘텀이..."` | `<div class="theme"><b>오늘의 테마</b>AI 반도체 ...</div>` |
| `NewsItem.note` | `"위험자산·신흥국 증시에 우호적"` | `<div class="why"><b>📖 정리</b> · 위험자산·신흥국 증시에 우호적</div>` |

### §4.3 HTML 허용 필드

| 필드 | 허용 | 렌더링 방식 |
|---|---|---|
| `us.comment`, `kr.comment` | `<b>` 태그 + 인라인 style 허용 (예: `<b style="color:var(--blue);">...</b>`) | `innerHTML` |
| 그 외 모든 string 필드 | plain text | `textContent` (XSS 방지) |

### §4.4 dir 필드와 value 안의 ▲/▼

| 필드 | value에 ▲/▼ 포함? | dir 역할 |
|---|---|---|
| `Index` | 별도 `change` 필드에 ▲/▼ (예: `"▲ 0.61%"`) | `.up`/`.down` 클래스 매핑 |
| `Indicator` | value에 포함 가능 (`"13.4 ▼"`) | 색상 결정 |
| `FlowItem` | value에 포함 가능 (`"1,3xx원 ▼"`) | 색상 결정 |
| `HealthItem` | `subIcon` 별도 (`"▲"`, `"±"`) | `subDir`로 색상 결정 |

**룰**: value는 표시 텍스트 그대로(▲/▼ 포함). dir는 클래스 매핑용. JS는 둘 다 사용.

### §4.5 enum → 클래스 매핑 (JS 구현 시 참조)

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

### §4.6 카운트 표시

`world.global.length`, `world.domestic.length`를 하위탭의 `<span class="cnt">` 안에 동적 입력. 항상 12지만 길이 추출이 안전.

### §4.7 TimedEvent.important

`important: true`일 때만 `<span class="imp">중요</span>` 추가. `false`/생략이면 미표시.

### §4.8 동적 영역 ID·class (JS가 알아야 할 hook)

| 영역 | 컨테이너 |
|---|---|
| 날짜 칩 | `#dateText` |
| 캘린더 그리드 (날짜 선택) | `#calGrid` |
| US 섹션 | `#us .card` 내부 |
| World 글로벌 | `#global` |
| World 국내 | `#domestic` |
| KR 섹션 | `#kr .card` 내부 |
| Calendar 섹션 | `#cal .card` 내부 |
| ★ Calendar 세그먼트 컨트롤 (v1.5.0) | `.cal-views` (오늘/주간/월간 버튼 `.cal-view`) |
| ★ Calendar 뷰 pane (v1.5.0) | `.cal-pane` × 3 (`#cal-pane-today`, `#cal-pane-week`, `#cal-pane-month`) |
| ★ 주간 카드 컨테이너 (v1.5.0) | `#cal-week` (`.cal-week-scroll`), 자식 `.wk-day` |
| ★ 주간 하단 detail (v1.5.0) | `#cal-detail-week` |
| ★ 월간 달력 그리드 (v1.5.0) | `#cal-month` (`.cal-month-grid`), 자식 `.mo-cell` |
| ★ 월간 하단 detail (v1.5.0) | `#cal-detail-month` |

루틴은 이 hook들을 알 필요 없음 (JS가 처리). 컨텍스트엔 참고용으로 기록.

### §4.9 일정 탭 3뷰 렌더링 룰 ★v1.5.0 신설★

routine이 만드는 데이터(`calendar`, `calendarWeek`, `calendarMonth`)와 화면 뷰의 대응:

| 뷰 | 1차 데이터 소스 | Fallback | 표시 조건 |
|---|---|---|---|
| **일간 (오늘)** | `calendarWeek.days[selectedDate].items` | `calendar.{domestic,global}.{timed,untimed}` | 항상 표시 |
| **주간** | `calendarWeek.days[]` (7개) | (없음 — 세그먼트 자체 숨김) | `calendarWeek` 존재 시 |
| **월간** | **같은 달 모든 briefing 종합** (`calendarMonth.days[]`+`calendarWeek.days[]` 머지) ★v1.6.0★ | 옛 데이터(calendarWeek 없음): 월간 버튼 disable | `calendarWeek` 존재 시 |

**세그먼트 컨트롤 노출**:
- `data.calendarWeek` 존재 → 세그먼트 표시 (`.cal-views { display: flex }`)
- 없음 → 세그먼트 자체 숨김 (`.cal-views { display: none }`) = 옛 UI 100% 그대로 (5/27 이전 데이터 호환)

**일간 뷰 분류** (calendarWeek 있을 때):
- items 분류: region(domestic/global) × time(있음/없음) → 4그룹
- timed: time 오름차순 정렬 → `#cal-{dom,glo}-timed`
- untimed: `#cal-{dom,glo}-untimed`에 "시간 미정" 헤더와 함께
- 디자인: 좌측 [날짜·시간 박스], 본문 [제목 + 카테고리·중요 메타]

**주간 뷰 동작**:
- 일~토 7개 `.wk-day` cell. 빈 날도 표시
- 오늘 cell `.today` (파란 outline), 선택된 cell `.selected` (배경+굵은 outline)
- 마우스 드래그 좌우 스크롤 (3번 → 5번 이상 드래그하면 click 한 번 무시)
- cell 클릭 → 하단 `#cal-detail-week`에 그 요일 items 펼침

**월간 뷰 동작**:
- 6×7 grid. 첫 일요일 전 + 마지막 토요일 후 empty cell
- ★v1.6.0 종합★: 월간 진입 시 `aggregateMonth()`가 manifest의 그 달 모든 briefing을 fetch → 각 파일의 `calendarMonth.days` + `calendarWeek.days`(그 달분)를 (date,event) dedup 머지. **routine은 평소대로 그날 calendarMonth만 생성**하면 됨 (화면이 종합). lazy 캐시 (월간 진입·날짜 이동 시)
- hit 날에는 pill 최대 2개 + `+N` 더보기 표시
- empty 제외 모든 cell 클릭 가능 (hit 없으면 "일정 없음" detail 표시)
- cell 클릭 → 하단 `#cal-detail-month`에 그 날 items 펼침

**오늘의 테마·체크리스트 위치**:
- v1.5.0부터 일간 pane 안에만 존재 (주간·월간에서는 안 보임)
- `cal.theme` → `#cal-theme`, `cal.checks[]` → `#cal-checks`
