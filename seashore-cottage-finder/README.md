# 🏖️ Seashore Cottage Finder

A tiny, no-backend web tool for finding an open **Premium Cottage (2 Bedroom)**
at [Sun Retreats Seashore](https://www.sunoutdoors.com/new-jersey/sun-retreats-seashore)
across a whole summer — without clicking through hundreds of date combinations.

## The insight

Availability is **per night**, not per stay window. The resort's booking
calendar greys out nights that are already taken — a whole month at a glance.
So instead of checking every possible check-in/check-out combination, you only
need to know which individual nights are booked. From that, *every* open stay
window can be computed.

## How it works

1. **Trip preferences** — set your summer range, the stay lengths you'd accept
   (2/3/4/7 nights), guests, and whether you only want weekend check-ins.
2. **Teach it your booking link** *(optional)* — paste one booking URL that
   already has dates in it, so the generated "Book ↗" links land on the exact
   dates.
3. **Mark the booked nights** — open the resort calendar (a link is provided per
   month), and click the greyed-out nights here to mark them **Booked**. Then
   hit *"Mark the rest as free."* That's roughly a dozen clicks for a summer.
4. **Your open stays** — the tool instantly lists every stay that fits your
   trip length and touches only free nights, each with a one-click booking
   link. Copy or print the list.

Nights cycle **Unknown → Free → Booked → Unknown** on click. Stays touching a
booked night are dropped automatically; stays with still-unchecked nights show
as "🤔 Check" if you enable that view.

Everything persists in `localStorage`, so you can come back later.

## Why it doesn't read availability automatically

The resort books through **Campspot**, whose real-time availability sits behind
a paid, authenticated API and bot protection. Browsers also block cross-site
reads of the booking page (CORS). A free static page can't reliably pull live
data — but since the booking calendar shows booked nights visually, marking
them takes only seconds.

## Files

- `index.html` — markup and copy
- `styles.css` — styling (seaside palette, nightly calendar, print stylesheet)
- `script.js` — calendar state, open-stay computation, link learning, persistence

## Privacy

Everything runs client-side. No analytics, no backend. The only network
requests are the booking links you choose to open.

> Not affiliated with Sun Outdoors, Sun Retreats, or Campspot. Always confirm
> availability and book on the official site.
