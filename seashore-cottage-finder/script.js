'use strict';

/* ------------------------------------------------------------------ *
 * Seashore Cottage Finder
 * Scans a whole summer for open stay windows at Sun Retreats Seashore
 * (Premium Cottage, 2 Bedroom) so you don't have to check the resort's
 * date picker one date at a time.
 *
 * Everything runs in your browser. Settings, the learned booking link,
 * and per-date statuses are saved to localStorage only.
 * ------------------------------------------------------------------ */

const BOOKING_BASE = 'https://www.sunoutdoors.com/book/checkavailability/236/nj/sun-retreats-seashore';

const STORE = {
  settings: 'scf.settings.v1',
  template: 'scf.template.v1',
  statuses: 'scf.statuses.v1',
  proxy:    'scf.proxy.v1',
};

const MAX_ROWS = 600; // safety guard against runaway combinations

/* ----------------------------- helpers ---------------------------- */

const $ = (id) => document.getElementById(id);

// Build a Date at local noon to dodge timezone/DST off-by-one issues.
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
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function prettyDate(date) {
  return `${WEEKDAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or blocked — ignore */ }
}

function windowKey(checkinISO, nights) {
  return `${checkinISO}|${nights}`;
}

/* --------------------------- date format -------------------------- */
// Recognise date-like strings inside a pasted URL so we can swap them out.

const DATE_PATTERNS = [
  { name: 'iso', re: /^\d{4}-\d{2}-\d{2}$/, parse: (s) => dateFromISO(s),
    fmt: (d) => toISO(d) },
  { name: 'us', re: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    parse: (s) => { const [m, d, y] = s.split('/').map(Number); return new Date(y, m - 1, d, 12); },
    fmt: (d) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}` },
];

function detectDate(value) {
  for (const p of DATE_PATTERNS) {
    if (p.re.test(value)) {
      const dt = p.parse(value);
      if (!isNaN(dt)) return { pattern: p, date: dt };
    }
  }
  return null;
}

/* --------------------------- templates ---------------------------- */
// A template is the booking URL with {CHECKIN}/{CHECKOUT} placeholders,
// plus the date format to render them in.

function defaultTemplate() {
  // No guessed date params: a bare link is guaranteed to open the page.
  return { url: BOOKING_BASE, format: 'iso', learned: false };
}

function learnTemplate(rawUrl) {
  const url = new URL(rawUrl.trim());
  const found = [];
  for (const [k, v] of url.searchParams.entries()) {
    const hit = detectDate(v);
    if (hit) found.push({ key: k, ...hit });
  }
  if (found.length < 2) {
    throw new Error('Could not find two dates in that URL. Make sure you picked dates on the booking page before copying the link.');
  }
  // Earliest date = check-in, latest = check-out.
  found.sort((a, b) => a.date - b.date);
  const checkinHit = found[0];
  const checkoutHit = found[found.length - 1];

  url.searchParams.set(checkinHit.key, '{CHECKIN}');
  url.searchParams.set(checkoutHit.key, '{CHECKOUT}');

  // decodeURIComponent so our placeholders stay readable in the stored string.
  const templateUrl = decodeURIComponent(url.toString());
  return { url: templateUrl, format: checkinHit.pattern.name, learned: true };
}

function buildLink(template, checkin, checkout) {
  const fmt = DATE_PATTERNS.find((p) => p.name === template.format) || DATE_PATTERNS[0];
  if (!template.url.includes('{CHECKIN}')) {
    return template.url; // bare booking page
  }
  return template.url
    .replace('{CHECKIN}', encodeURIComponent(fmt.fmt(checkin)))
    .replace('{CHECKOUT}', encodeURIComponent(fmt.fmt(checkout)));
}

/* --------------------------- generation --------------------------- */

function selectedLengths() {
  return [...document.querySelectorAll('#length-chips input:checked')]
    .map((el) => Number(el.value))
    .sort((a, b) => a - b);
}

function dowAllowed(date, mode) {
  const day = date.getDay(); // 0 Sun .. 6 Sat
  if (mode === 'weekend') return day === 5 || day === 6;
  if (mode === 'weekday') return day >= 0 && day <= 4;
  return true;
}

function generateWindows(settings) {
  const start = dateFromISO(settings.start);
  const end = dateFromISO(settings.end);
  const lengths = settings.lengths;
  const rows = [];

  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    if (!dowAllowed(d, settings.dow)) continue;
    for (const nights of lengths) {
      const checkout = addDays(d, nights);
      if (checkout > end) continue;
      rows.push({
        checkin: new Date(d),
        checkout,
        checkinISO: toISO(d),
        checkoutISO: toISO(checkout),
        nights,
      });
      if (rows.length > MAX_ROWS) return { rows, truncated: true };
    }
  }
  rows.sort((a, b) => a.checkin - b.checkin || a.nights - b.nights);
  return { rows, truncated: false };
}

/* ----------------------------- state ------------------------------ */

let currentRows = [];
let template = load(STORE.template, defaultTemplate());
let statuses = load(STORE.statuses, {});   // windowKey -> { status, note }

/* --------------------------- rendering ---------------------------- */

const STATUS_LABELS = {
  unknown: 'Not checked',
  open: '✅ Open',
  full: '❌ Full',
  maybe: '🤔 Maybe',
};

function getStatus(key) {
  return statuses[key] || { status: 'unknown', note: '' };
}

function setStatus(key, patch) {
  statuses[key] = { ...getStatus(key), ...patch };
  save(STORE.statuses, statuses);
}

function rowVisible(key) {
  const openOnly = $('show-open-only').checked;
  const filter = $('filter-status').value;
  const st = getStatus(key).status;
  if (openOnly && st !== 'open') return false;
  if (filter !== 'all' && st !== filter) return false;
  return true;
}

function renderSummary() {
  const counts = { total: currentRows.length, open: 0, full: 0, maybe: 0, unknown: 0 };
  for (const r of currentRows) counts[getStatus(windowKey(r.checkinISO, r.nights)).status]++;
  $('summary-bar').innerHTML = `
    <span class="pill">${counts.total} windows</span>
    <span class="pill open">${counts.open} open</span>
    <span class="pill">${counts.maybe} maybe</span>
    <span class="pill full">${counts.full} full</span>
    <span class="pill">${counts.unknown} unchecked</span>`;
}

function renderTable() {
  const body = $('results-body');
  body.innerHTML = '';
  let shown = 0;

  for (const r of currentRows) {
    const key = windowKey(r.checkinISO, r.nights);
    if (!rowVisible(key)) continue;
    shown++;
    const st = getStatus(key);
    const link = buildLink(template, r.checkin, r.checkout);

    const tr = document.createElement('tr');
    tr.dataset.status = st.status;
    tr.dataset.key = key;

    tr.innerHTML = `
      <td>${prettyDate(r.checkin)}<br><small>${r.checkin.getFullYear()}</small></td>
      <td>${prettyDate(r.checkout)}<br><small>${r.checkout.getFullYear()}</small></td>
      <td>${r.nights}</td>
      <td><a class="open-link" href="${link}" target="_blank" rel="noopener">Open ↗</a>
          <div class="live-cell" data-live></div></td>
      <td>
        <select data-status>
          <option value="unknown">Not checked</option>
          <option value="open">✅ Open</option>
          <option value="full">❌ Full</option>
          <option value="maybe">🤔 Maybe</option>
        </select>
      </td>
      <td><input class="note-input" type="text" data-note placeholder="notes…" value="${escapeAttr(st.note)}"></td>`;

    tr.querySelector('[data-status]').value = st.status;
    body.appendChild(tr);
  }

  if (shown === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px;">No windows match this filter.</td>`;
    body.appendChild(tr);
  }
  renderSummary();
}

function escapeAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/* ----------------------------- live check ------------------------- */

let liveRunning = false;

async function liveCheckAll() {
  if (liveRunning) return;
  const visibleRows = currentRows.filter((r) => rowVisible(windowKey(r.checkinISO, r.nights)));
  if (visibleRows.length === 0) return;

  if (!template.learned) {
    if (!confirm('You haven\'t taught the tool your booking link yet, so the live check can only reach the generic booking page (no dates). It will likely be blocked by the site\'s security. Continue anyway?')) return;
  }
  if (visibleRows.length > 60 &&
      !confirm(`This will attempt ${visibleRows.length} live requests, one at a time. That can take a while and may get blocked. Continue?`)) {
    return;
  }

  liveRunning = true;
  const btn = $('check-all-btn');
  btn.disabled = true;
  const proxy = $('proxy-url').value.trim();
  let blocked = 0, reachable = 0, done = 0;

  for (const r of visibleRows) {
    const key = windowKey(r.checkinISO, r.nights);
    const tr = document.querySelector(`tr[data-key="${cssEscape(key)}"]`);
    const cell = tr ? tr.querySelector('[data-live]') : null;
    if (cell) cell.textContent = 'checking…';

    const link = buildLink(template, r.checkin, r.checkout);
    const target = proxy ? proxy + encodeURIComponent(link) : link;
    try {
      // No-store, follow redirects. Most direct cross-site calls throw on CORS.
      const res = await fetch(target, { method: 'GET', cache: 'no-store', redirect: 'follow' });
      reachable++;
      if (cell) cell.textContent = `reachable (HTTP ${res.status}) — open to confirm`;
    } catch (err) {
      blocked++;
      if (cell) cell.textContent = 'blocked — use the Open link';
    }
    done++;
    setLive(`Live check: ${done}/${visibleRows.length} · ${reachable} reachable · ${blocked} blocked`, 'warn');
    await sleep(350); // be polite
  }

  liveRunning = false;
  btn.disabled = false;
  if (reachable === 0) {
    setLive(`Live auto-check was blocked for all ${done} windows (expected — the site blocks cross-site reads). Use the “Open ↗” links and tick each status instead.`, 'warn');
  } else {
    setLive(`Live check done: ${reachable} reachable, ${blocked} blocked. Reachable doesn't confirm a free cottage — open the link to verify, then set the status.`, 'ok');
  }
}

function cssEscape(s) {
  return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&');
}
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }
function setLive(msg, cls) {
  const el = $('live-status');
  el.textContent = msg;
  el.className = 'status-line' + (cls ? ' ' + cls : '');
}

/* ----------------------------- settings --------------------------- */

function readSettings() {
  return {
    start: $('start-date').value,
    end: $('end-date').value,
    guests: Number($('guests').value) || 2,
    lengths: selectedLengths(),
    dow: $('dow-filter').value,
  };
}

function applySettings(s) {
  $('start-date').value = s.start;
  $('end-date').value = s.end;
  $('guests').value = s.guests;
  $('dow-filter').value = s.dow;
  document.querySelectorAll('#length-chips input').forEach((el) => {
    el.checked = s.lengths.includes(Number(el.value));
  });
}

function defaultSettings() {
  // Default to "this summer" relative to today, falling back to 2026.
  const now = new Date();
  const year = now.getMonth() > 8 ? now.getFullYear() + 1 : now.getFullYear();
  return {
    start: `${year}-06-21`,
    end: `${year}-09-07`,
    guests: 2,
    lengths: [2, 3, 4, 7],
    dow: 'any',
  };
}

/* ------------------------------ wire up --------------------------- */

function generate() {
  const settings = readSettings();
  if (!settings.start || !settings.end) {
    alert('Please set both an earliest check-in and a latest check-out date.');
    return;
  }
  if (dateFromISO(settings.end) <= dateFromISO(settings.start)) {
    alert('The latest check-out must be after the earliest check-in.');
    return;
  }
  if (settings.lengths.length === 0) {
    alert('Pick at least one stay length.');
    return;
  }
  save(STORE.settings, settings);

  const { rows, truncated } = generateWindows(settings);
  currentRows = rows;
  $('results-card').hidden = false;
  renderTable();
  setLive(truncated
    ? `Showing the first ${MAX_ROWS} windows — narrow your dates or stay lengths for fewer.`
    : `${rows.length} stay windows built. Open each to check the cottage, then set its status — your ticks are saved automatically.`,
    truncated ? 'warn' : 'ok');
  $('results-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function applyTemplateToUI() {
  $('template-url').value = template.learned ? template.url : '';
  const statusEl = $('template-status');
  if (template.learned) {
    statusEl.textContent = '✓ Using your learned booking link — generated links will land on the right dates.';
    statusEl.className = 'status-line ok';
  } else {
    statusEl.textContent = 'No link learned yet — links open the booking page so you set dates there.';
    statusEl.className = 'status-line';
  }
}

function init() {
  applySettings(load(STORE.settings, defaultSettings()));
  $('proxy-url').value = load(STORE.proxy, '');
  applyTemplateToUI();

  $('generate-btn').addEventListener('click', generate);

  $('reset-btn').addEventListener('click', () => {
    if (!confirm('Reset all settings, the learned link, and every date status?')) return;
    [STORE.settings, STORE.template, STORE.statuses, STORE.proxy].forEach((k) => localStorage.removeItem(k));
    location.reload();
  });

  $('learn-btn').addEventListener('click', () => {
    const raw = $('template-url').value.trim();
    const statusEl = $('template-status');
    if (!raw) {
      template = defaultTemplate();
      save(STORE.template, template);
      applyTemplateToUI();
      return;
    }
    try {
      template = learnTemplate(raw);
      save(STORE.template, template);
      statusEl.textContent = '✓ Got it! Learned the date format from your link. Rebuild or refresh the checklist to use it.';
      statusEl.className = 'status-line ok';
      if (currentRows.length) renderTable();
    } catch (err) {
      statusEl.textContent = '⚠ ' + err.message;
      statusEl.className = 'status-line warn';
    }
  });

  $('proxy-url').addEventListener('change', () => save(STORE.proxy, $('proxy-url').value.trim()));

  // Delegated handlers for the results table.
  $('results-body').addEventListener('change', (e) => {
    const tr = e.target.closest('tr[data-key]');
    if (!tr) return;
    const key = tr.dataset.key;
    if (e.target.matches('[data-status]')) {
      setStatus(key, { status: e.target.value });
      tr.dataset.status = e.target.value;
      renderSummary();
    } else if (e.target.matches('[data-note]')) {
      setStatus(key, { note: e.target.value });
    }
  });

  $('show-open-only').addEventListener('change', renderTable);
  $('filter-status').addEventListener('change', renderTable);
  $('check-all-btn').addEventListener('click', liveCheckAll);
  $('print-btn').addEventListener('click', () => window.print());
  $('copy-open-btn').addEventListener('click', copyOpenDates);

  // Keep the "open booking page" button using the learned base if present.
  const openBtn = $('open-booking');
  if (openBtn) openBtn.href = template.url.includes('{CHECKIN}') ? BOOKING_BASE : template.url;
}

function copyOpenDates() {
  const open = currentRows.filter((r) => getStatus(windowKey(r.checkinISO, r.nights)).status === 'open');
  if (open.length === 0) {
    setLive('No dates marked “Open” yet — tick some first.', 'warn');
    return;
  }
  const text = open.map((r) =>
    `${prettyDate(r.checkin)} ${r.checkin.getFullYear()} → ${prettyDate(r.checkout)} (${r.nights} night${r.nights > 1 ? 's' : ''})`
  ).join('\n');
  navigator.clipboard.writeText(text).then(
    () => setLive(`Copied ${open.length} open date window(s) to your clipboard.`, 'ok'),
    () => setLive('Could not copy automatically — here they are:\n' + text, 'warn')
  );
}

document.addEventListener('DOMContentLoaded', init);
