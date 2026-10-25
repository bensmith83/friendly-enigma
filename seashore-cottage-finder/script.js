'use strict';

/* ------------------------------------------------------------------ *
 * Seashore Cottage Finder — page controller
 *
 * Two jobs:
 *  1. Generate a configured copy of auto-check.js (the in-browser
 *     automation) plus a bookmarklet, from the user's preferences.
 *  2. Provide a manual night-calendar fallback that computes open stays
 *     from nights the user marks by hand.
 *
 * Settings and marked nights persist in localStorage only.
 * ------------------------------------------------------------------ */

const BOOKING_BASE = 'https://www.sunoutdoors.com/book/checkavailability/236/nj/sun-retreats-seashore';
const STORE = { settings: 'scf.settings.v3', nights: 'scf.nights.v3' };

const $ = (id) => document.getElementById(id);

/* ----------------------------- dates ------------------------------ */
function dateFromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); }
function toISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function addDays(d, n) { const o = new Date(d); o.setDate(o.getDate() + n); return o; }
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MA = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function pretty(d) { return `${WD[d.getDay()]} ${MA[d.getMonth()]} ${d.getDate()}`; }

function load(k, f) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

/* ----------------------------- state ------------------------------ */
function defaultSettings() {
  const now = new Date();
  const year = now.getMonth() > 8 ? now.getFullYear() + 1 : now.getFullYear();
  return { start: `${year}-06-21`, end: `${year}-09-07`, guests: 2, lengths: [2, 3, 4, 7], dow: 'any', keyword: 'Premium Cottage', throttle: 450 };
}
let settings = load(STORE.settings, defaultSettings());
let nights = load(STORE.nights, {});
let autoTemplate = '';   // raw auto-check.js text with markers

/* --------------------------- settings I/O ------------------------- */
function readSettings() {
  return {
    start: $('start-date').value,
    end: $('end-date').value,
    guests: Number($('guests').value) || 2,
    lengths: [...document.querySelectorAll('#length-chips input:checked')].map((e) => Number(e.value)).sort((a, b) => a - b),
    dow: $('dow-filter').value,
    keyword: $('unit-keyword').value.trim() || 'Premium Cottage',
    throttle: Math.max(150, Number($('throttle').value) || 450),
  };
}
function applySettings(s) {
  $('start-date').value = s.start;
  $('end-date').value = s.end;
  $('guests').value = s.guests;
  $('dow-filter').value = s.dow;
  $('unit-keyword').value = s.keyword;
  $('throttle').value = s.throttle;
  document.querySelectorAll('#length-chips input').forEach((e) => { e.checked = s.lengths.includes(Number(e.value)); });
}

/* ----------------------- generate the checker --------------------- */
function configBlock(s) {
  return '/*__CONFIG__*/\n  var CONFIG = ' + JSON.stringify({
    start: s.start, end: s.end, lengths: s.lengths, dow: s.dow,
    unitKeyword: s.keyword, throttleMs: s.throttle,
  }, null, 2).replace(/\n/g, '\n  ') + ';\n  /*__END_CONFIG__*/';
}

function generatedScript() {
  if (!autoTemplate) return '';
  const s = readSettings();
  return autoTemplate.replace(/\/\*__CONFIG__\*\/[\s\S]*?\/\*__END_CONFIG__\*\//, configBlock(s));
}

function refreshGenerated() {
  const code = generatedScript();
  $('script-preview').value = code || '// Could not load auto-check.js — use “Copy the checker script” after the page fully loads.';
  if (code) {
    $('bookmarklet').href = 'javascript:' + encodeURIComponent(code);
  }
}

/* ----------------------- manual calendar -------------------------- */
function nightList() {
  const start = dateFromISO(settings.start), lastNight = addDays(dateFromISO(settings.end), -1), out = [];
  for (let d = new Date(start); d <= lastNight; d = addDays(d, 1)) out.push(new Date(d));
  return out;
}
function nightState(iso) { return nights[iso] || 'unknown'; }

function renderCalendar() {
  const cal = $('calendar'); cal.innerHTML = '';
  const all = nightList(); if (!all.length) return;
  const byMonth = new Map();
  for (const d of all) { const k = `${d.getFullYear()}-${d.getMonth()}`; (byMonth.get(k) || byMonth.set(k, []).get(k)).push(d); }
  for (const [, days] of byMonth) {
    const first = days[0], monthEl = document.createElement('div'); monthEl.className = 'month';
    monthEl.innerHTML = `<div class="month-head"><h3>${MON[first.getMonth()]} ${first.getFullYear()}</h3></div>
      <div class="dow-row">${WD.map((w) => `<span>${w[0]}</span>`).join('')}</div>`;
    const grid = document.createElement('div'); grid.className = 'days';
    for (let i = 0; i < first.getDay(); i++) { const b = document.createElement('span'); b.className = 'day blank'; grid.appendChild(b); }
    for (const d of days) {
      const iso = toISO(d), cell = document.createElement('button');
      cell.type = 'button'; cell.className = 'day ' + nightState(iso); cell.dataset.iso = iso; cell.textContent = d.getDate(); cell.title = pretty(d);
      grid.appendChild(cell);
    }
    monthEl.appendChild(grid); cal.appendChild(monthEl);
  }
}
function cycleNight(iso) {
  const cur = nightState(iso), next = cur === 'unknown' ? 'free' : cur === 'free' ? 'booked' : 'unknown';
  if (next === 'unknown') delete nights[iso]; else nights[iso] = next;
  save(STORE.nights, nights);
}
function dowAllowed(d) { const k = d.getDay(); if (settings.dow === 'weekend') return k === 5 || k === 6; if (settings.dow === 'weekday') return k <= 4; return true; }
function computeOpen() {
  const start = dateFromISO(settings.start), end = dateFromISO(settings.end), open = [], partial = [];
  for (let d = new Date(start); d < end; d = addDays(d, 1)) {
    if (!dowAllowed(d)) continue;
    for (const n of settings.lengths) {
      const co = addDays(d, n); if (co > end) continue;
      let booked = false, unknown = false;
      for (let i = 0; i < n; i++) { const st = nightState(toISO(addDays(d, i))); if (st === 'booked') { booked = true; break; } if (st === 'unknown') unknown = true; }
      if (booked) continue;
      (unknown ? partial : open).push({ ci: new Date(d), co, n });
    }
  }
  return { open, partial };
}
function renderResults() {
  const { open, partial } = computeOpen();
  $('summary-bar').innerHTML = `<span class="pill open">${open.length} open</span><span class="pill">${partial.length} possible</span><span class="pill">${Object.keys(nights).length} nights marked</span>`;
  const body = $('results-body'); body.innerHTML = '';
  const rows = open.map((s) => ({ ...s, k: 'open' }));
  if (!rows.length) { body.innerHTML = `<tr><td colspan="5" class="empty">Mark some nights above to see open stays.</td></tr>`; return; }
  for (const s of rows.sort((a, b) => a.ci - b.ci || a.n - b.n)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${pretty(s.ci)} <small>${s.ci.getFullYear()}</small></td><td>${pretty(s.co)}</td><td>${s.n}</td>
      <td><span class="tag tag-open">✅ Open</span></td>
      <td><a class="open-link" href="${BOOKING_BASE}" target="_blank" rel="noopener">Book ↗</a></td>`;
    body.appendChild(tr);
  }
}
function refreshManual() { renderCalendar(); renderResults(); }

/* ------------------------------ wire up --------------------------- */
function init() {
  applySettings(settings);

  // Load the automation script template (same-origin on the deployed site).
  fetch('auto-check.js').then((r) => r.text()).then((t) => { autoTemplate = t; refreshGenerated(); })
    .catch(() => { $('gen-status').textContent = 'Note: open this page over http(s) (not a local file) so the script can be generated.'; $('gen-status').className = 'status-line warn'; });

  // Re-generate whenever a setting changes.
  ['start-date', 'end-date', 'guests', 'dow-filter', 'unit-keyword', 'throttle'].forEach((id) =>
    $(id).addEventListener('change', () => { settings = readSettings(); save(STORE.settings, settings); refreshGenerated(); }));
  document.querySelectorAll('#length-chips input').forEach((el) =>
    el.addEventListener('change', () => { settings = readSettings(); save(STORE.settings, settings); refreshGenerated(); }));

  $('copy-script').addEventListener('click', () => {
    const code = generatedScript();
    if (!code) { $('gen-status').textContent = 'Script still loading — try again in a second.'; $('gen-status').className = 'status-line warn'; return; }
    navigator.clipboard.writeText(code).then(() => {
      $('gen-status').textContent = '✓ Copied. Paste it into the booking page\'s DevTools console and press Enter.';
      $('gen-status').className = 'status-line ok';
    });
  });

  // Bookmarklet is for dragging, not clicking from here.
  $('bookmarklet').addEventListener('click', (e) => {
    e.preventDefault();
    $('gen-status').textContent = 'Drag this button to your bookmarks bar, then click it while on the booking page (don\'t click it here).';
    $('gen-status').className = 'status-line warn';
  });

  $('open-booking').href = BOOKING_BASE;

  // ----- manual fallback -----
  $('build-btn').addEventListener('click', () => {
    const s = readSettings();
    if (dateFromISO(s.end) <= dateFromISO(s.start)) { alert('Latest check-out must be after earliest check-in.'); return; }
    settings = s; save(STORE.settings, settings);
    $('manual-body').hidden = false; refreshManual();
  });
  $('calendar').addEventListener('click', (e) => {
    const cell = e.target.closest('.day[data-iso]'); if (!cell) return;
    cycleNight(cell.dataset.iso); cell.className = 'day ' + nightState(cell.dataset.iso); renderResults();
  });
  $('rest-free-btn').addEventListener('click', () => { for (const d of nightList()) { const iso = toISO(d); if (!nights[iso]) nights[iso] = 'free'; } save(STORE.nights, nights); refreshManual(); });
  $('all-unknown-btn').addEventListener('click', () => { if (!confirm('Clear all night marks?')) return; nights = {}; save(STORE.nights, nights); refreshManual(); });
}

document.addEventListener('DOMContentLoaded', init);
