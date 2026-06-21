# 🏖️ Seashore Cottage Finder

A tiny, no-backend web tool that makes it practical to hunt for an open
**Premium Cottage (2 Bedroom)** at
[Sun Retreats Seashore](https://www.sunoutdoors.com/new-jersey/sun-retreats-seashore)
across a whole summer — instead of fighting the resort's date picker one
date at a time.

## The problem it solves

The resort's booking page only checks **one date range at a time**. If you're
flexible on dates but want a specific unit, finding vacancy means repeatedly
re-entering dates and re-reading the results. Painful.

This tool flips it around: pick your summer window and the stay lengths you'd
accept, and it generates a **checklist of every possible stay window**, each
with a one-click link straight into the booking page — plus a place to record
what you found, saved in your browser.

## How to use it

1. **Set your search** — earliest check-in, latest check-out, stay lengths
   (e.g. 2/3/4/7 nights), and whether you only care about weekend check-ins.
2. **Teach it your booking link _(recommended)_** — open the booking page once,
   pick *any* dates, copy the URL from your address bar, and paste it in. The
   tool learns the exact link format so every generated link lands on the right
   dates automatically.
3. **Build my date checklist** — work down the list, click **Open ↗** for each
   window, and set its status (✅ Open / ❌ Full / 🤔 Maybe). Filter to
   **“Open” only** to see your shortlist, then **Copy open dates** or
   **Print**.

Your settings, learned link, and statuses persist in `localStorage` — close the
tab and pick up where you left off.

## Why it doesn't fully auto-check availability

Sun Retreats Seashore books through **Campspot**. Real-time availability sits
behind a **paid, authenticated API** and bot protection, and browsers block
cross-site reads of the booking page (CORS). So a free static page can't
reliably read live availability.

There *is* an **experimental “Attempt live auto-check”** button. It tries to
fetch each booking link from your browser and reports whether the request was
reachable or blocked. In practice it's usually blocked — and even a reachable
response doesn't prove a cottage is free — so the dependable workflow remains:
open each link, glance, and tick. An **Advanced** section lets you route
requests through your own CORS proxy if you have one.

## Files

- `index.html` — markup and copy
- `styles.css` — styling (seaside palette, print stylesheet for the checklist)
- `script.js` — date-window generation, link learning, persistence, live-check

## Privacy

Everything runs client-side. No analytics, no backend. The only network
requests are the booking links you choose to open and any live-checks you
trigger.

> Not affiliated with Sun Outdoors, Sun Retreats, or Campspot. Always confirm
> availability and book on the official site.
