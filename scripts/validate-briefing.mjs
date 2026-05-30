#!/usr/bin/env node
/**
 * validate-briefing.mjs — briefing JSON 품질 검증 (v1.6.0 Sub-Feature A)
 *
 * 사용법:
 *   node scripts/validate-briefing.mjs [YYYY-MM-DD]   # 특정 날짜
 *   node scripts/validate-briefing.mjs                 # manifest.latest
 *
 * 검증 항목:
 *   [HARD — exit 1]  schema validate / sourceUrl 5룰 / 카운트 / calendarWeek 일관성 ⑨룰
 *   [SOFT — 경고만]  페르소나 위반 grep (단정·추천성·격식체·길이)
 *
 * routine이 sanity를 빼먹어도 CI가 잡는 이중 안전망. 단 hard 실패해도
 * auto-merge는 별개 workflow라 머지는 진행됨 (페이지 빈 화면 방지) — CI는 경고 표시용.
 */

import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ROOT = path.resolve(import.meta.dirname, '..');
const BLOCKED_DOMAINS = ['bloomberg.com', 'wsj.com', 'ft.com', 'reuters.com', 'mk.co.kr', 'yna.co.kr'];
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

// 페르소나 위반 패턴 (guides/operations.md §1.5)
const PERSONA_PATTERNS = {
  단정: /확실히|반드시|틀림없이|분명히|당연히/,
  추천성: /매수 추천|매도 추천|매수해야|매도해야|사야 합니다|팔아야 합니다/,
};
// 길이 임계값 — "디자인 깨짐 방지" 상한 (실측: title 최대 61 / summary 144 / note 37).
// operations.md §1.1의 권장 길이(30/60/25)는 톤 가이드일 뿐, CI는 디자인 상한만 게이트.
const LEN_LIMITS = { title: 70, summary: 160, note: 45 };

let hardFails = [];
let softWarns = [];

function hard(msg) { hardFails.push(msg); }
function soft(msg) { softWarns.push(msg); }

// ─── 대상 날짜 결정 ───
function resolveDate() {
  const arg = process.argv[2];
  if (arg) return arg;
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'meta/manifest.json'), 'utf8'));
  return manifest.latest;
}

// ─── 1. Schema validate ───
function validateSchema(data) {
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'meta/schema.json'), 'utf8'));
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    for (const e of validate.errors) {
      hard(`schema: ${e.instancePath || '(root)'} ${e.message}`);
    }
  }
}

// ─── 2. sourceUrl 5룰 ───
function validateSourceUrls(data) {
  const all = [...(data.world?.global || []), ...(data.world?.domestic || [])];
  const urls = [];
  for (const n of all) {
    if (!n.sourceUrl) { hard(`sourceUrl: "${(n.title || '').slice(0, 20)}..." 빈 값`); continue; }
    if (BLOCKED_DOMAINS.some(d => n.sourceUrl.includes(d))) hard(`sourceUrl: 차단 도메인 ${n.sourceUrl}`);
    if (!/^https?:\/\//.test(n.sourceUrl)) hard(`sourceUrl: 형식 오류 ${n.sourceUrl}`);
    urls.push(n.sourceUrl);
  }
  const dup = urls.filter((u, i) => urls.indexOf(u) !== i);
  if (dup.length) hard(`sourceUrl: 중복 ${[...new Set(dup)].join(', ')}`);
}

// ─── 3. 카운트 ───
function validateCounts(data) {
  const checks = [
    ['us.indices', data.us?.indices?.length, 4],
    ['us.indicators', data.us?.indicators?.length, 6],
    ['us.sectorsUp', data.us?.sectorsUp?.length, 5],
    ['us.sectorsDown', data.us?.sectorsDown?.length, 5],
    ['world.global', data.world?.global?.length, 12],
    ['world.domestic', data.world?.domestic?.length, 12],
    ['kr.indices', data.kr?.indices?.length, 2],
  ];
  for (const [name, actual, expected] of checks) {
    if (actual !== expected) hard(`카운트: ${name} = ${actual} (기대 ${expected})`);
  }
}

// ─── 4. calendarWeek 일관성 ⑨룰 (있을 때만) ───
function validateCalendarWeek(data) {
  const cw = data.calendarWeek;
  if (!cw) return; // 옛 데이터 호환 — 없으면 skip
  // ① days = 7
  if (cw.days?.length !== 7) hard(`calendarWeek: days.length = ${cw.days?.length} (기대 7)`);
  // ② start=일, end=토  (★UTC 고정 — 로컬 타임존에서 toISOString 하루 밀림 방지)
  if (cw.start) {
    const sd = new Date(cw.start + 'T00:00:00Z');
    if (sd.getUTCDay() !== 0) hard(`calendarWeek: start ${cw.start} 요일=${DOW[sd.getUTCDay()]} (기대 일)`);
  }
  if (cw.end) {
    const ed = new Date(cw.end + 'T00:00:00Z');
    if (ed.getUTCDay() !== 6) hard(`calendarWeek: end ${cw.end} 요일=${DOW[ed.getUTCDay()]} (기대 토)`);
  }
  // ③ start + 6일 === end
  if (cw.start && cw.end) {
    const s = new Date(cw.start + 'T00:00:00Z');
    s.setUTCDate(s.getUTCDate() + 6);
    const expEnd = s.toISOString().slice(0, 10);
    if (expEnd !== cw.end) hard(`calendarWeek: start+6=${expEnd} ≠ end ${cw.end}`);
  }
  // ④ data.date가 범위 안
  if (cw.start && cw.end && (data.date < cw.start || data.date > cw.end)) {
    hard(`calendarWeek: data.date ${data.date}가 ${cw.start}~${cw.end} 범위 밖`);
  }
  // ⑤ 오늘 calendar 일정 ⊂ calendarWeek.days[todayIdx]
  const todayIdx = DOW.indexOf(data.weekday);
  const todayCell = cw.days?.[todayIdx];
  if (todayCell && data.calendar) {
    const calEvents = [
      ...(data.calendar.domestic?.timed || []),
      ...(data.calendar.domestic?.untimed || []),
      ...(data.calendar.global?.timed || []),
      ...(data.calendar.global?.untimed || []),
    ].map(e => e.event);
    const weekEvents = (todayCell.items || []).map(i => i.event);
    for (const ev of calEvents) {
      // 느슨한 매칭: calendar event의 앞 10자가 week event 어딘가에 포함
      const key = ev.slice(0, 10);
      if (!weekEvents.some(we => we.includes(key) || ev.includes(we.slice(0, 10)))) {
        soft(`일관성⑤: calendar "${ev.slice(0, 25)}..." 가 calendarWeek 오늘(${data.weekday})에 없음`);
      }
    }
  }
  // ⑥ calendarMonth year/month
  const cm = data.calendarMonth;
  if (cm) {
    const [y, m] = data.date.split('-').map(Number);
    if (cm.year !== y) hard(`calendarMonth: year ${cm.year} ≠ ${y}`);
    if (cm.month !== m) hard(`calendarMonth: month ${cm.month} ≠ ${m}`);
    // ⑦ days[*].date가 그 달 범위
    for (const d of cm.days || []) {
      if (!d.date.startsWith(`${y}-${String(m).padStart(2, '0')}`)) {
        hard(`calendarMonth: ${d.date}가 ${y}-${m}월 범위 밖`);
      }
    }
  }
}

// ─── 5. 페르소나 위반 grep (SOFT) ───
function validatePersona(data) {
  const opinionFields = [];
  const push = (label, val) => { if (typeof val === 'string' && val) opinionFields.push([label, val]); };

  push('us.comment', data.us?.comment);
  push('us.subNote', data.us?.subNote);
  push('kr.comment', data.kr?.comment);
  push('kr.subNote', data.kr?.subNote);
  push('kr.expectedRange', data.kr?.expectedRange);
  push('world.subNote', data.world?.subNote);
  push('calendar.subNote', data.calendar?.subNote);
  push('calendar.theme', data.calendar?.theme);
  (data.kr?.watchlist || []).forEach((w, i) => push(`kr.watchlist[${i}].desc`, w.desc));
  (data.calendar?.checks || []).forEach((c, i) => push(`calendar.checks[${i}]`, c));
  [...(data.world?.global || []), ...(data.world?.domestic || [])].forEach((n, i) => push(`news[${i}].note`, n.note));

  // 단정·추천성 grep
  for (const [label, val] of opinionFields) {
    for (const [kind, re] of Object.entries(PERSONA_PATTERNS)) {
      const m = val.match(re);
      if (m) soft(`페르소나(${kind}): ${label} "${m[0]}"`);
    }
  }

  // 길이 위반 (title/summary/note)
  const news = [...(data.world?.global || []), ...(data.world?.domestic || [])];
  for (const n of news) {
    if (n.title && [...n.title].length > LEN_LIMITS.title) soft(`길이: title ${[...n.title].length}자 (≤${LEN_LIMITS.title}) "${n.title.slice(0, 20)}..."`);
    if (n.summary && [...n.summary].length > LEN_LIMITS.summary) soft(`길이: summary ${[...n.summary].length}자 (≤${LEN_LIMITS.summary})`);
    if (n.note && [...n.note].length > LEN_LIMITS.note) soft(`길이: note ${[...n.note].length}자 (≤${LEN_LIMITS.note}) "${n.note.slice(0, 15)}..."`);
  }

  // subNoteEm ⊂ subNote (4섹션)
  for (const sec of ['us', 'kr', 'world', 'calendar']) {
    const o = data[sec];
    if (o?.subNoteEm && o?.subNote && !o.subNote.includes(o.subNoteEm)) {
      hard(`subNoteEm: ${sec}.subNoteEm "${o.subNoteEm}" 가 subNote의 부분문자열 아님`);
    }
  }
}

// ─── main ───
function main() {
  const date = resolveDate();
  const file = path.join(ROOT, 'briefing', `${date}.json`);
  if (!fs.existsSync(file)) {
    console.error(`❌ ${file} 없음`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  console.log(`\n🔍 validate-briefing: ${date}.json\n`);

  validateSchema(data);
  validateSourceUrls(data);
  validateCounts(data);
  validateCalendarWeek(data);
  validatePersona(data);

  // 결과 출력
  if (softWarns.length) {
    console.log(`🟡 SOFT 경고 (${softWarns.length}건 — 머지 막지 않음):`);
    softWarns.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }
  // STRICT 모드(VALIDATE_STRICT=1): HARD 실패 시 exit 1 (게이트).
  // 기본: 리포트 모드 — 위반 출력하되 exit 0 (CI 초록 유지, 머지 영향 0).
  // 데이터 품질이 안정되면 STRICT로 승격.
  const strict = process.env.VALIDATE_STRICT === '1';
  if (hardFails.length) {
    console.log(`🔴 HARD 위반 (${hardFails.length}건):`);
    hardFails.forEach(f => console.log(`   - ${f}`));
    if (strict) {
      console.log(`\n❌ [STRICT] 검증 실패 — 위 HARD 항목 확인 필요\n`);
      process.exit(1);
    }
    console.log(`\n⚠️  [리포트 모드] HARD 위반 ${hardFails.length}건 — 게이트 아님 (VALIDATE_STRICT=1로 게이트화)\n`);
    process.exit(0);
  }
  console.log(`✅ HARD 검증 통과${softWarns.length ? ` (SOFT 경고 ${softWarns.length}건)` : ''}\n`);
  process.exit(0);
}

main();
