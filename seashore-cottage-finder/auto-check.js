/* ==================================================================
 * Seashore Cottage Finder — in-browser auto-checker
 *
 * This runs INSIDE your browser on the Sun Retreats Seashore booking
 * site (paste into the DevTools console, or use it as a bookmarklet).
 * Running here means requests are same-origin and carry your real
 * session cookies, so they pass the site's Akamai bot protection and
 * hit the exact same availability API the page already uses — which a
 * normal web page or a server cannot do.
 *
 * How it works:
 *   1. It quietly watches the site's network calls.
 *   2. You run ONE normal availability search on the page (any dates).
 *   3. It learns that request, then replays it across every date in
 *      your summer range and lists which ones have the cottage open.
 *
 * The CONFIG block below is replaced with your settings when you copy
 * this from the Cottage Finder page. You can also edit it by hand.
 * ================================================================== */
(function () {
  'use strict';
  if (window.__SCF_LOADED__) { window.__scfPanel && window.__scfPanel(); return; }
  window.__SCF_LOADED__ = true;

  /*__CONFIG__*/
  var CONFIG = {
    start: '2026-06-21',     // earliest check-in (YYYY-MM-DD)
    end: '2026-09-07',       // latest check-out (YYYY-MM-DD)
    lengths: [2, 3, 4, 7],   // stay lengths (nights) you'd accept
    dow: 'any',              // 'any' | 'weekend' | 'weekday' (check-in day)
    unitKeyword: 'Premium Cottage', // text that marks the cottage as present/available
    throttleMs: 450          // pause between API calls (be polite)
  };
  /*__END_CONFIG__*/

  /* ----------------------------- helpers ------------------------- */
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fromISO(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); }
  function addDays(d, n) { var o = new Date(d); o.setDate(o.getDate() + n); return o; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pretty(d) { return WD[d.getDay()] + ' ' + MO[d.getMonth()] + ' ' + d.getDate(); }

  /* --------------------- capture the API request ----------------- */
  // We record the most recent JSON request that looks like an
  // availability/search call, including its URL, method, headers and body.
  var captured = null;

  function looksAvail(url, body) {
    var s = (String(url || '') + ' ' + String(body || '')).toLowerCase();
    return /(avail|search|reservation|rates?|booking|grid|sites?|units?|stay)/.test(s) &&
           /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/.test(s); // must contain a date
  }
  function record(method, url, headers, body) {
    captured = { method: (method || 'GET').toUpperCase(), url: String(url), headers: headers || {}, body: (typeof body === 'string' ? body : null) };
    setStatus('Learned a search request ✔  — now press “Run the summer scan”.', 'ok');
  }

  // hook fetch
  var ofetch = window.fetch;
  window.fetch = function (input, init) {
    init = init || {};
    var url = (typeof input === 'string') ? input : (input && input.url);
    var method = init.method || (input && input.method) || 'GET';
    var body = init.body;
    var headersObj = headersToObj(init.headers || (input && input.headers));
    var p = ofetch.apply(this, arguments);
    try {
      if (looksAvail(url, typeof body === 'string' ? body : '')) {
        p.then(function (res) {
          try { if ((res.headers.get('content-type') || '').indexOf('json') >= 0) record(method, url, headersObj, typeof body === 'string' ? body : null); } catch (e) {}
        });
      }
    } catch (e) {}
    return p;
  };

  // hook XHR (covers axios and older code)
  var OX = window.XMLHttpRequest;
  var oOpen = OX.prototype.open, oSend = OX.prototype.send, oSet = OX.prototype.setRequestHeader;
  OX.prototype.open = function (m, u) { this.__scf = { method: m, url: u, headers: {} }; return oOpen.apply(this, arguments); };
  OX.prototype.setRequestHeader = function (k, v) { if (this.__scf) this.__scf.headers[k] = v; return oSet.apply(this, arguments); };
  OX.prototype.send = function (body) {
    var self = this;
    if (self.__scf && looksAvail(self.__scf.url, typeof body === 'string' ? body : '')) {
      self.addEventListener('load', function () {
        try { if ((self.getResponseHeader('content-type') || '').indexOf('json') >= 0) record(self.__scf.method, self.__scf.url, self.__scf.headers, typeof body === 'string' ? body : null); } catch (e) {}
      });
    }
    return oSend.apply(this, arguments);
  };

  function headersToObj(h) {
    var o = {};
    try {
      if (!h) return o;
      if (typeof Headers !== 'undefined' && h instanceof Headers) { h.forEach(function (v, k) { o[k] = v; }); }
      else if (Array.isArray(h)) { h.forEach(function (p) { o[p[0]] = p[1]; }); }
      else { Object.keys(h).forEach(function (k) { o[k] = h[k]; }); }
    } catch (e) {}
    return o;
  }

  /* ------------------- templatise the captured dates ------------- */
  // Find the two dates in the captured URL+body, replace earliest with
  // {CI} and latest with {CO}, and remember their format so we can
  // re-render each candidate window the same way.
  function makeTemplate() {
    if (!captured) return null;
    var hay = captured.url + '\n' + (captured.body || '');
    var found = [];
    var reIso = /\d{4}-\d{2}-\d{2}/g, reUs = /\d{1,2}\/\d{1,2}\/\d{4}/g, m;
    while ((m = reIso.exec(hay))) found.push({ s: m[0], fmt: 'iso', d: fromISO(m[0]) });
    if (found.length < 2) { while ((m = reUs.exec(hay))) { var pr = m[0].split('/').map(Number); found.push({ s: m[0], fmt: 'us', d: new Date(pr[2], pr[0] - 1, pr[1], 12) }); } }
    if (found.length < 2) return null;
    found.sort(function (a, b) { return a.d - b.d; });
    var ci = found[0], co = found[found.length - 1];
    var fmt = ci.fmt;
    function tmpl(str) { return str.split(ci.s).join('{CI}').split(co.s).join('{CO}'); }
    return {
      method: captured.method,
      urlTmpl: tmpl(captured.url),
      bodyTmpl: captured.body ? tmpl(captured.body) : null,
      headers: captured.headers,
      fmt: fmt
    };
  }
  function fmtDate(d, fmt) { return fmt === 'us' ? (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() : iso(d); }

  /* ------------------------ window generation -------------------- */
  function dowOk(d) {
    var k = d.getDay();
    if (CONFIG.dow === 'weekend') return k === 5 || k === 6;
    if (CONFIG.dow === 'weekday') return k >= 0 && k <= 4;
    return true;
  }
  function windows() {
    var start = fromISO(CONFIG.start), end = fromISO(CONFIG.end), out = [];
    for (var d = new Date(start); d < end; d = addDays(d, 1)) {
      if (!dowOk(d)) continue;
      for (var i = 0; i < CONFIG.lengths.length; i++) {
        var n = CONFIG.lengths[i], co = addDays(d, n);
        if (co > end) continue;
        out.push({ ci: new Date(d), co: co, n: n });
      }
    }
    return out;
  }

  /* ----------------------------- the scan ------------------------ */
  var running = false, cancel = false;
  async function run() {
    var t = makeTemplate();
    if (!t) { setStatus('No search learned yet. Do one normal availability search on this page (pick any dates, hit search), then press Run.', 'warn'); return; }
    if (running) { cancel = true; return; }
    running = true; cancel = false;
    var btn = document.getElementById('scf-run'); if (btn) btn.textContent = 'Stop';

    var wins = windows();
    var open = [], errors = 0, sampleLogged = false;
    for (var i = 0; i < wins.length; i++) {
      if (cancel) { setStatus('Stopped at ' + i + ' of ' + wins.length + '.', 'warn'); break; }
      var w = wins[i];
      var ciS = fmtDate(w.ci, t.fmt), coS = fmtDate(w.co, t.fmt);
      var url = t.urlTmpl.split('{CI}').join(encodeMaybe(t.urlTmpl, ciS)).split('{CO}').join(encodeMaybe(t.urlTmpl, coS));
      var body = t.bodyTmpl ? t.bodyTmpl.split('{CI}').join(ciS).split('{CO}').join(coS) : undefined;
      try {
        var res = await ofetch(url, { method: t.method, headers: t.headers, body: body, credentials: 'include' });
        var txt = await res.text();
        if (!sampleLogged) { console.log('%c[Cottage Finder] sample response (first 2000 chars):', 'color:#0b6e7a;font-weight:bold'); console.log(txt.slice(0, 2000)); sampleLogged = true; }
        if (txt.toLowerCase().indexOf(CONFIG.unitKeyword.toLowerCase()) >= 0) open.push(w);
      } catch (e) { errors++; }
      setStatus('Scanning… ' + (i + 1) + '/' + wins.length + '  ·  ' + open.length + ' open  ·  ' + errors + ' errors', '');
      renderList(open);
      await sleep(CONFIG.throttleMs);
    }
    running = false; if (btn) btn.textContent = 'Run the summer scan';
    if (!cancel) setStatus('Done. ' + open.length + ' open stay window(s) found across ' + wins.length + ' checked. ' + (open.length === 0 ? 'If you expected some, the “unit keyword” may not match — check the sample response logged in the console and edit it in the panel.' : ''), open.length ? 'ok' : 'warn');
    renderList(open);
  }
  // If a date sits in a query string it should be URL-encoded; if in a path, leave as-is. Heuristic: encode when the template has '?'.
  function encodeMaybe(tmpl, s) { return tmpl.indexOf('?') >= 0 ? encodeURIComponent(s) : s; }

  /* ---------------------------- the panel ------------------------ */
  var lastOpen = [];
  function renderList(open) {
    lastOpen = open;
    var box = document.getElementById('scf-results');
    if (!box) return;
    if (!open.length) { box.innerHTML = '<div style="color:#888">No open stays yet…</div>'; return; }
    box.innerHTML = open.map(function (w) {
      return '<div>✅ <b>' + pretty(w.ci) + '</b> → ' + pretty(w.co) + ' <span style="color:#888">(' + w.n + ' night' + (w.n > 1 ? 's' : '') + ')</span></div>';
    }).join('');
  }
  function copyOpen() {
    var text = lastOpen.map(function (w) { return pretty(w.ci) + ' ' + w.ci.getFullYear() + ' → ' + pretty(w.co) + ' (' + w.n + ' nights)'; }).join('\n');
    navigator.clipboard.writeText(text || 'No open stays found.').then(function () { setStatus('Copied ' + lastOpen.length + ' open stays to clipboard.', 'ok'); });
  }

  var statusEl;
  function setStatus(msg, cls) { if (statusEl) { statusEl.textContent = msg; statusEl.style.color = cls === 'ok' ? '#0a7d68' : cls === 'warn' ? '#b3402a' : '#333'; } }

  function panel() {
    if (document.getElementById('scf-panel')) { document.getElementById('scf-panel').style.display = 'block'; return; }
    var p = document.createElement('div');
    p.id = 'scf-panel';
    p.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:330px;max-height:80vh;overflow:auto;background:#fff;border:1px solid #cdd;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#20323a;padding:14px';
    p.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<b style="color:#0b6e7a">🏖️ Cottage Finder</b>' +
        '<span id="scf-x" style="cursor:pointer;color:#888;font-size:16px">✕</span></div>' +
      '<ol style="margin:0 0 8px 18px;padding:0;color:#5d7079">' +
        '<li>Run one normal availability search on this page.</li>' +
        '<li>Press <b>Run the summer scan</b>.</li></ol>' +
      '<label style="font-weight:600">Unit keyword</label>' +
      '<input id="scf-kw" style="width:100%;margin:2px 0 8px;padding:6px;border:1px solid #cdd;border-radius:6px" />' +
      '<div style="display:flex;gap:6px;margin-bottom:8px">' +
        '<button id="scf-run" style="flex:1;padding:8px;border:0;border-radius:6px;background:#0b6e7a;color:#fff;font-weight:600;cursor:pointer">Run the summer scan</button>' +
        '<button id="scf-copy" style="padding:8px;border:1px solid #cdd;border-radius:6px;background:#fff;cursor:pointer">Copy</button></div>' +
      '<div id="scf-status" style="min-height:2.4em;margin-bottom:8px"></div>' +
      '<div id="scf-results" style="border-top:1px solid #eee;padding-top:8px;font-size:12px"></div>';
    document.body.appendChild(p);
    statusEl = document.getElementById('scf-status');
    document.getElementById('scf-kw').value = CONFIG.unitKeyword;
    document.getElementById('scf-kw').addEventListener('input', function () { CONFIG.unitKeyword = this.value; });
    document.getElementById('scf-run').addEventListener('click', run);
    document.getElementById('scf-copy').addEventListener('click', copyOpen);
    document.getElementById('scf-x').addEventListener('click', function () { p.style.display = 'none'; });
    setStatus('Watching for a search… run one availability search on this page to begin.', '');
  }
  window.__scfPanel = panel;
  panel();
  console.log('%c[Cottage Finder] loaded. Do one availability search on the page, then press “Run the summer scan”.', 'color:#0b6e7a;font-weight:bold');
})();
