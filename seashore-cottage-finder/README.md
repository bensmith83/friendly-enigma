# 🏖️ Seashore Cottage Finder

Automatically scan a whole summer for an open **Premium Cottage (2 Bedroom)**
at [Sun Retreats Seashore](https://www.sunoutdoors.com/new-jersey/sun-retreats-seashore)
— the machine does the date-by-date checking instead of you.

## Why it works the way it does

The obvious idea — "just call the booking API for every date" — doesn't work
from a normal web page or a server. The site sits behind **Akamai bot
protection**: any request that isn't a real browser with a valid session is
rejected with `403 Access Denied`. A third-party page also can't reach it
because of cross-origin (CORS) rules.

There's exactly one place the call *does* work: **inside your own browser, on
the booking site itself.** There, requests are same-origin and carry your real
session cookies, so they pass Akamai and hit the same availability API the page
already uses.

So the tool ships a small script (`auto-check.js`) that runs there. It:

1. Quietly watches the site's network calls.
2. Waits for you to run **one** normal availability search (so it learns the
   exact request shape and how dates are encoded).
3. Replays that request across every date window in your summer range, with a
   polite delay, and lists which ones have the cottage open.

## How to use it

1. On the **Cottage Finder page** (`index.html`), set your trip preferences:
   date range, stay lengths, check-in day, and a "unit keyword" that identifies
   the cottage (default `Premium Cottage`).
2. Open the booking site, then load the checker onto it — either by dragging
   the generated **bookmarklet** to your bookmarks bar and clicking it on the
   page, or by pasting the generated script into the browser **DevTools
   console**.
3. A small panel appears. Run one availability search, then press **Run the
   summer scan**. It lists every open stay and can copy them to your clipboard.

The script logs the first API response to the console; if results look wrong,
adjust the "unit keyword" to match how the cottage appears in that response.

### Manual fallback

If the auto-scan can't read the API (e.g. the site changes), there's a manual
night-calendar mode: mark nights free/booked yourself and it computes every
open stay of your preferred lengths.

## Files

- `index.html` — preferences UI + script/bookmarklet generator + manual mode
- `auto-check.js` — the in-browser automation (console / bookmarklet)
- `script.js` — page controller (config generation, manual calendar)
- `styles.css` — styling

## Is this OK to run?

The checker only replays the same availability searches you could do by hand,
from your own logged-in browser, with a delay between calls. It **reads**
availability — it never books anything. Keep the throttle reasonable.

## Privacy

Everything runs client-side. Settings and any marked nights are stored only in
your browser. Nothing is sent anywhere except the booking site's own API, from
your browser.

> Not affiliated with Sun Outdoors, Sun Retreats, or Campspot. Always confirm
> availability and book on the official site.
