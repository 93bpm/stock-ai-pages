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
| `model` | string | `"claude-sonnet-4-7"` 등 | 실행 모델명 (자체 보고) |
| `status` | string | `"success" / "skip" / "fail"` | 정상 종료 / sanity skip / 예외 |
| `duration_seconds` | number | 발화 시작~끝 초 | **정확값 ✓** |
| `tokens_estimated` | number | 한국어 ~2자/토큰 환산 | **추산값** (정확값은 claude.ai Usage에서 확인) |
| `tokens_actual` | number? | API 정확 토큰 (가능하면) | optional. 정확값 ✓ |
| `response_size_kb` | number | 응답 본문 KB | **정확값 ✓** |
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

### §4.1 subNote / subNoteEm 패턴

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

**제약**: `subNoteEm`은 반드시 `subNote`의 부분 문자열. Sanity Check에 포함됨 (`guides/data-quality.md §4`).

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
| 캘린더 그리드 | `#calGrid` |
| US 섹션 | `#us .card` 내부 |
| World 글로벌 | `#global` |
| World 국내 | `#domestic` |
| KR 섹션 | `#kr .card` 내부 |
| Calendar 섹션 | `#cal .card` 내부 |

루틴은 이 hook들을 알 필요 없음 (JS가 처리). 컨텍스트엔 참고용으로 기록.
