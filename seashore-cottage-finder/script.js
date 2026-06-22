'use strict';

/* ------------------------------------------------------------------ *
 * Seashore Cottage Finder
 *
 * Key idea: availability is PER NIGHT, not per stay window. The resort's
 * booking calendar greys out booked nights a whole month at a time. So you
 * mark the booked nights once (a handful of clicks), and this tool computes
 * EVERY open stay window that fits your trip length — instead of you clicking
 * through hundreds of date combinations.
 *
 * Everything runs in your browser. Preferences, the learned booking link, and
 * the nights you mark are saved to localStorage only.
 * ------------------------------------------------------------------ */

const BOOKING_BASE = 'https://www.sunoutdoors.com/book/checkavailability/236/nj/sun-retreats-seashore';

const STORE = {
  settings: 'scf.settings.v2',
  template: 'scf.template.v2',
  nights:   'scf.nights.v2',   // 'YYYY-MM-DD' -> 'free' | 'booked'  (absent = unknown)
};

/* ----------------------------- helpers ---------------------------- */

const $ = (id) => document.getElementById(id);

function dateFromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(date, n) {
  const out = new Date(date);
  out.setDate(out.getDate() + n);
  return out;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
const MON_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function prettyDate(date) {
  return `${WEEKDAYS[date.getDay()]} ${MON_ABBR[date.getMonth()]} ${date.getDate()}`;
}

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/* --------------------------- date format -------------------------- */
// Recognise date-like strings in a pasted URL so we can templatise them.

const DATE_PATTERNS = [
  { name: 'iso', re: /^\d{4}-\d{2}-\d{2}$/, parse: (s) => dateFromISO(s), fmt: (d) => toISO(d) },
  { name: 'us', re: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    parse: (s) => { const [m, d, y] = s.split('/').map(Number); return new Date(y, m - 1, d, 12); },
    fmt: (d) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}` },
];
function detectDate(value) {
  for (const p of DATE_PATTERNS) {
    if (p.re.test(value)) { const dt = p.parse(value); if (!isNaN(dt)) return { pattern: p, date: dt }; }
  }
  return null;
}

/* --------------------------- templates ---------------------------- */

function defaultTemplate() { return { url: BOOKING_BASE, format: 'iso', learned: false }; }

function learnTemplate(rawUrl) {
  const url = new URL(rawUrl.trim());
  const found = [];
  for (const [k, v] of url.searchParams.entries()) {
    const hit = detectDate(v);
    if (hit) found.push({ key: k, ...hit });
  }
  if (found.length < 2) {
    throw new Error('Could not find two dates in that URL. Pick dates on the booking page first, then copy the link.');
  }
  found.sort((a, b) => a.date - b.date);
  url.searchParams.set(found[0].key, '{CHECKIN}');
  url.searchParams.set(found[found.length - 1].key, '{CHECKOUT}');
  return { url: decodeURIComponent(url.toString()), format: found[0].pattern.name, learned: true };
}

function buildLink(checkin, checkout) {
  if (!template.url.includes('{CHECKIN}')) return template.url;
  const fmt = DATE_PATTERNS.find((p) => p.name === template.format) || DATE_PATTERNS[0];
  return template.url
    .replace('{CHECKIN}', encodeURIComponent(fmt.fmt(checkin)))
    .replace('{CHECKOUT}', encodeURIComponent(fmt.fmt(checkout)));
}

/* ----------------------------- state ------------------------------ */

let settings = load(STORE.settings, defaultSettings());
let template = load(STORE.template, defaultTemplate());
let nights = load(STORE.nights, {});   // ISO -> 'free' | 'booked'

function defaultSettings() {
  const now = new Date();
  const year = now.getMonth() > 8 ? now.getFullYear() + 1 : now.getFullYear();
  return { start: `${year}-06-21`, end: `${year}-09-07`, guests: 2, lengths: [2, 3, 4, 7], dow: 'any' };
}

/* --------------------------- settings I/O ------------------------- */

function readSettings() {
  return {
    start: $('start-date').value,
    end: $('end-date').value,
    guests: Number($('guests').value) || 2,
    lengths: [...document.querySelectorAll('#length-chips input:checked')].map((el) => Number(el.value)).sort((a, b) => a - b),
    dow: $('dow-filter').value,
  };
}
function applySettings(s) {
  $('start-date').value = s.start;
  $('end-date').value = s.end;
  $('guests').value = s.guests;
  $('dow-filter').value = s.dow;
  document.querySelectorAll('#length-chips input').forEach((el) => { el.checked = s.lengths.includes(Number(el.value)); });
}

/* --------------------------- the calendar ------------------------- */
// One cell per NIGHT, from earliest check-in to the night before latest
// check-out (a checkout date is not itself a night you sleep there).

function nightList() {
  const start = dateFromISO(settings.start);
  const lastNight = addDays(dateFromISO(settings.end), -1);
  const out = [];
  for (let d = new Date(start); d <= lastNight; d = addDays(d, 1)) out.push(new Date(d));
  return out;
}

function nightState(iso) { return nights[iso] || 'unknown'; }

function renderCalendar() {
  const cal = $('calendar');
  cal.innerHTML = '';
  const all = nightList();
  if (all.length === 0) return;

  // Group nights by calendar month.
  const byMonth = new Map();
  for (const d of all) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(d);
  }

  for (const [, days] of byMonth) {
    const first = days[0];
    const monthEl = document.createElement('div');
    monthEl.className = 'month';

    const checkLink = buildLink(first, addDays(days[days.length - 1], 1));
    monthEl.innerHTML = `
      <div class="month-head">
        <h3>${MONTHS[first.getMonth()]} ${first.getFullYear()}</h3>
        <a class="open-link" href="${checkLink}" target="_blank" rel="noopener">Open this month's calendar ↗</a>
      </div>
      <div class="dow-row">${WEEKDAYS.map((w) => `<span>${w[0]}</span>`).join('')}</div>`;

    const grid = document.createElement('div');
    grid.className = 'days';
    // Leading blanks so the 1st lands under the right weekday.
    for (let i = 0; i < first.getDay(); i++) {
      const blank = document.createElement('span');
      blank.className = 'day blank';
      grid.appendChild(blank);
    }
    for (const d of days) {
      const iso = toISO(d);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'day ' + nightState(iso);
      cell.dataset.iso = iso;
      cell.textContent = d.getDate();
      cell.title = prettyDate(d);
      grid.appendChild(cell);
    }
    monthEl.appendChild(grid);
    cal.appendChild(monthEl);
  }
}

function cycleNight(iso) {
  const cur = nightState(iso);
  const next = cur === 'unknown' ? 'free' : cur === 'free' ? 'booked' : 'unknown';
  if (next === 'unknown') delete nights[iso];
  else nights[iso] = next;
  save(STORE.nights, nights);
}

/* ----------------------- compute open stays ----------------------- */

function dowAllowed(date, mode) {
  const day = date.getDay();
  if (mode === 'weekend') return day === 5 || day === 6;
  if (mode === 'weekday') return day >= 0 && day <= 4;
  return true;
}

// For every candidate check-in and accepted length, classify the window by the
// state of its nights: 'open' (all free), 'blocked' (a booked night), or
// 'partial' (no booked night, but some still unknown).
function computeStays() {
  const start = dateFromISO(settings.start);
  const end = dateFromISO(settings.end);
  const open = [], partial = [];

  for (let d = new Date(start); d < end; d = addDays(d, 1)) {
    if (!dowAllowed(d, settings.dow)) continue;
    for (const n of settings.lengths) {
      const checkout = addDays(d, n);
      if (checkout > end) continue;
      let booked = false, unknown = false;
      for (let i = 0; i < n; i++) {
        const st = nightState(toISO(addDays(d, i)));
        if (st === 'booked') { booked = true; break; }
        if (st === 'unknown') unknown = true;
      }
      if (booked) continue;
      const stay = { checkin: new Date(d), checkout, nights: n };
      (unknown ? partial : open).push(stay);
    }
  }
  const byDate = (a, b) => a.checkin - b.checkin || a.nights - b.nights;
  return { open: open.sort(byDate), partial: partial.sort(byDate) };
}

/* --------------------------- rendering ---------------------------- */

function renderResults() {
  const { open, partial } = computeStays();
  const showPartial = $('show-partial').checked;
  const rows = showPartial ? [...open.map((s) => ({ ...s, kind: 'open' })),
                              ...partial.map((s) => ({ ...s, kind: 'partial' }))]
                                .sort((a, b) => a.checkin - b.checkin || a.nights - b.nights)
                           : open.map((s) => ({ ...s, kind: 'open' }));

  const markedNights = Object.keys(nights).length;
  $('summary-bar').innerHTML = `
    <span class="pill open">${open.length} open stay${open.length === 1 ? '' : 's'}</span>
    <span class="pill">${partial.length} possible (unchecked nights)</span>
    <span class="pill">${markedNights} nights marked</span>`;

  const body = $('results-body');
  body.innerHTML = '';
  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="empty">${
      markedNights === 0
        ? 'Mark some nights above (free / booked) and your open stays appear here.'
        : 'No fully-open stays yet. Tick “show stays with unchecked nights,” or mark more nights as free.'
    }</td></tr>`;
    return;
  }
  for (const s of rows) {
    const link = buildLink(s.checkin, s.checkout);
    const tr = document.createElement('tr');
    tr.dataset.kind = s.kind;
    tr.innerHTML = `
      <td>${prettyDate(s.checkin)} <small>${s.checkin.getFullYear()}</small></td>
      <td>${prettyDate(s.checkout)} <small>${s.checkout.getFullYear()}</small></td>
      <td>${s.nights}</td>
      <td>${s.kind === 'open'
            ? '<span class="tag tag-open">✅ Open</span>'
            : '<span class="tag tag-partial">🤔 Check</span>'}</td>
      <td><a class="open-link" href="${link}" target="_blank" rel="noopener">Book ↗</a></td>`;
    body.appendChild(tr);
  }
}

function refresh() {
  renderCalendar();
  renderResults();
}

/* --------------------------- template UI -------------------------- */

function applyTemplateToUI() {
  $('template-url').value = template.learned ? template.url : '';
  const el = $('template-status');
  if (template.learned) {
    el.textContent = '✓ Using your learned link — Book links land on the right dates.';
    el.className = 'status-line ok';
  } else {
    el.textContent = 'No link learned — Book links open the booking page for you to set dates.';
    el.className = 'status-line';
  }
  const openBtn = $('open-booking');
  if (openBtn) openBtn.href = template.url.includes('{CHECKIN}') ? BOOKING_BASE : template.url;
}

/* ------------------------------ actions --------------------------- */

function build() {
  const s = readSettings();
  if (!s.start || !s.end) { alert('Set both an earliest check-in and a latest check-out date.'); return; }
  if (dateFromISO(s.end) <= dateFromISO(s.start)) { alert('Latest check-out must be after earliest check-in.'); return; }
  if (s.lengths.length === 0) { alert('Pick at least one stay length.'); return; }
  settings = s;
  save(STORE.settings, settings);
  $('calendar-card').hidden = false;
  $('results-card').hidden = false;
  refresh();
  $('calendar-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copyList() {
  const { open } = computeStays();
  if (open.length === 0) { return; }
  const text = open.map((s) =>
    `${prettyDate(s.checkin)} ${s.checkin.getFullYear()} → ${prettyDate(s.checkout)} (${s.nights} night${s.nights > 1 ? 's' : ''})`
  ).join('\n');
  navigator.clipboard.writeText(text).catch(() => {});
}

/* ------------------------------ wire up --------------------------- */

function init() {
  applySettings(settings);
  applyTemplateToUI();

  $('build-btn').addEventListener('click', build);

  $('reset-btn').addEventListener('click', () => {
    if (!confirm('Reset preferences, the learned link, and every marked night?')) return;
    Object.values(STORE).forEach((k) => localStorage.removeItem(k));
    location.reload();
  });

  $('learn-btn').addEventListener('click', () => {
    const raw = $('template-url').value.trim();
    const el = $('template-status');
    if (!raw) { template = defaultTemplate(); save(STORE.template, template); applyTemplateToUI(); return; }
    try {
      template = learnTemplate(raw);
      save(STORE.template, template);
      applyTemplateToUI();
      if (!$('calendar-card').hidden) refresh();
    } catch (err) {
      el.textContent = '⚠ ' + err.message;
      el.className = 'status-line warn';
    }
  });

  // Calendar clicks (delegated).
  $('calendar').addEventListener('click', (e) => {
    const cell = e.target.closest('.day[data-iso]');
    if (!cell) return;
    cycleNight(cell.dataset.iso);
    cell.className = 'day ' + nightState(cell.dataset.iso);
    renderResults();
  });

  $('rest-free-btn').addEventListener('click', () => {
    for (const d of nightList()) { const iso = toISO(d); if (!nights[iso]) nights[iso] = 'free'; }
    save(STORE.nights, nights);
    refresh();
  });

  $('all-unknown-btn').addEventListener('click', () => {
    if (!confirm('Clear every night mark?')) return;
    nights = {};
    save(STORE.nights, nights);
    refresh();
  });

  $('show-partial').addEventListener('change', renderResults);
  $('copy-btn').addEventListener('click', copyList);
  $('print-btn').addEventListener('click', () => window.print());

  // If the user had a calendar going, restore it on load.
  if (Object.keys(nights).length > 0) {
    $('calendar-card').hidden = false;
    $('results-card').hidden = false;
    refresh();
  }
}

document.addEventListener('DOMContentLoaded', init);
