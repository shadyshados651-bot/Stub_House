# StubHouse — Cinema Ticket Booking (Demo)

Vanilla HTML/CSS/JS cinema-booking website for the Heliopolis, Cairo venue.
No framework, no build step. Works from `file://` or any static server.

## How to run

```bash
# Option A: open directly in the browser
open index.html   # or double-click index.html

# Option B: static server (recommended, enables service-worker-style features)
python3 -m http.server 8080
# then visit http://localhost:8080
```

## File structure

```
StubHouse/
├── index.html           # Home: hero, slider, how it works, lineup, availability
├── movies.html          # Full schedule with search, filter chips, sort
├── movie.html           # Movie detail: cast, ratings, showtimes, reviews, trailer
├── book.html            # Booking engine: showtime -> seats -> snacks -> checkout
├── bookings.html        # My bookings (Upcoming / Past) + View Ticket
├── ticket.html?ref=STB-######   # Digital ticket with QR, .ics, print
├── staff.html           # Staff check-in: mark booking used, reject duplicates
├── signin.html          # Sign in / sign up
├── profile.html         # Profile: account, watchlist, booking history
├── 404.html             # (not present — unknown movie keys render inline not-found)
├── favicon.png          # Brand favicon
├── README.md            # this file
├── css/
│   ├── style.css        # Design system: tokens, components, RTL overrides
│   ├── book.css         # Booking-page steps & snack cards
│   └── movie.css        # Movie-detail page styles
├── js/
│   ├── seed.js          # SAMPLE DATA: films, halls, shows, ticket types, fees, promos
│   ├── api.js           # ONLY module touching localStorage (Promise-based)
│   ├── script.js        # Shared: nav, theme, language, auth, availability, bookings
│   ├── book.js          # Booking engine (holds, ticket types, all-in price, payment)
│   ├── movie.js         # Movie detail: trailer modal, showtimes, watchlist, reviews
│   └── i18n.js          # Arabic/English strings + language switching
└── js/vendor/
    └── qr.js            # Self-contained QR code generator (no dependencies)
└── images/              # Optimized posters & snacks (WebP + JPG, srcset, lazy)
```

## Data model (single source of truth: `js/seed.js`)

Marked "SAMPLE DATA". Replace before launch.

- `STUBHOUSE_FILMS` — film key, title, screen, showtime, base price, seed taken seats
- `STUBHOUSE_MOVIE_INFO` — poster, genre, year, runtime, rating, director, writer,
  language, synopsis, cast (verified roles), trailerId
- `STUBHOUSE_HALLS` — hall id, name, format (2D/3D/IMAX/VIP), rows with seats,
  aisles, wheelchair & recliner seats
- `STUBHOUSE_SHOWS` — next 7 days, 2–4 shows per film per day, prices per ticket type
- `STUBHOUSE_TICKET_TYPES` — Adult / Student / Child discounts
- `STUBHOUSE_FEES` — service fee (5 EGP) + tax (5%)
- `STUBHOUSE_PROMOS` — STUB10 (10%), WELCOME20 (20%), SAVE25 (25 EGP fixed)
- `STUBHOUSE_SEAT_COUNT` = 60
- `STUBHOUSE_SEED_BOOKINGS` — 3 confirmed demo bookings (seeded once if empty)

Storage keys: `stubhouseTheme`, `stubhouseLang`, `stubhouseAccounts`,
`stubhouseCurrentUser`, `stubhouseBookings`, `stubhouseHolds`, `stubhouseWatchlist`,
`stubhousePromos`, `stubhouseReviews`, `stubhouseDraft` (sessionStorage).

## `js/api.js` functions (the ONLY module that touches localStorage)

Every function returns a Promise so the file can be swapped for a real backend
without touching UI code. See "Replacing api.js" below.

- `getAccounts()` / `saveAccounts(accounts)`
- `createAccount({name, email, password})` — hashes with SHA-256 + per-user salt
- `authenticate(email, password)` — returns `{ok, account}` or `{ok:false, message, locked}`
- `getCurrentUser()` / `setCurrentUser(user)` / `clearCurrentUser()`
- `getBookings()` / `saveBookings(bookings)` / `addBooking(booking)` / `getBooking(ref)` / `cancelBooking(ref)`
- `getTakenSeats(filmKey, baseTaken)` — seed taken + confirmed bookings
- `getTakenSeatsWithHolds(filmKey, baseTaken, showId)` — includes active holds
- `placeHold(showId, seats, holderId)` / `releaseHold(holdId)` / `cleanupExpiredHolds()`
- `getTheme()` / `setTheme(theme)`
- `getPromos()` / `validatePromo(code, subtotal)` — `{valid, discount, message}`
- `getWatchlist()` / `toggleWatchlist(filmKey)` — `{watching, list}`
- `getReviewsForFilm(filmKey)` / `addReview({filmKey, rating, dimensions, text})`
- `userHasConfirmedBooking(email, filmKey)` — review eligibility
- `HOLD_MINUTES` — seat hold duration (10 min default)

## Mock payment rules (sandbox — documented in README, not real)

Persistent banner: **"Demo payment: no real charge"**. No card number, expiry or CVV
is stored anywhere (not localStorage, not logs). Only brand + last4 kept for display.

Card outcomes (our own demo rules):
- `4111 1111 1111 1111` → success
- `4000 0000 0000 0002` → simulated decline
- any other Luhn-valid number → success

Validation: card brand detection (Visa 4x; Mastercard 51–55 & 2221–2720), Luhn check,
expiry must be in the future, CVV length 3.

Mobile wallet: Egyptian number regex `/^01[0125]\d{8}$/` (flag: re-verify against
current operator prefixes), mock OTP `123456` labelled demo.

Cash at counter: booking status `pending`, 30-minute expiry countdown; expiry releases
seats. Expired cash bookings are not confirmed and do not charge.

## Security (demo limits — NOT real security)

- Passwords are SHA-256 + per-user random salt in localStorage (client-side only).
- Login throttling: 5 failed attempts → 30-second lock per email.
- Session expiry: 7 days.
- All dynamic strings use `textContent`/DOM methods (no `innerHTML` of user data).
- Content-Security-Policy meta on every page.
- All validation clamps values read from localStorage/sessionStorage/URL params.
- **State clearly: all of this is client-side and not real security.** Real auth and
  payments require a server. See "Production note" below.

## Replacing `js/api.js` with a real backend

`api.js` is the only module that touches `localStorage`. To connect a real backend,
re-implement the same Promise-returning functions against your API (same names and
return shapes) and point the UI at it. No UI file needs to change. Functions are
exposed as `window.stubhouseApi.*`.

## Accessibility (WCAG 2.1 AA target)

- Skip-to-content link on every page
- `:focus-visible` outline on every interactive element
- Tickets dropdown is a `button[aria-expanded]`, keyboard (Enter/Space) operable
- Seat states differ by shape/icon (plain / ✓ / ✕ / ♿ / VIP gold outline), not colour alone
- Keyboard seat map with `aria-checked`, rovable via click; arrow/space not yet implemented
- `scroll-margin-top` on anchored sections (fixed 76px navbar)
- Contrast ratios computed for all shipped text/background pairs (dark theme passes;
  light theme computed to meet AA)
- `dir="rtl"` + `lang` set per language; logical CSS properties for RTL mirroring
- Touch targets >= 44px; `prefers-reduced-motion` respected for the hero slider

## Images (optimized)

Posters converted to WebP + JPG fallback with `srcset` (2 sizes), explicit
`width`/`height`, `loading="lazy"`. Posters ≤ ~200 KB, snacks ≤ ~100 KB.
Two posters are low-resolution source files (Turab El Mas 315×420, Ibrahim El Abyad
283×413) and may look blurry enlarged — supply higher-res artwork before launch.

## Known limitations / unverified items

- No Chromium/Firefox binary in this sandbox, so Playwright/Lighthouse browser tests
  (T1–T15) could not be executed here. Verify in a real browser: console errors,
  double-booking refusal, hold expiry, card/wallet/cash flows, XSS probe, mobile menu
  at 360px, keyboard-only booking, RTL layout, contrast.
- Contact phone/address are format-corrected (+20, "12 El Korba, Heliopolis") but the
  **real values must be confirmed** — do not publish without verifying.
- Ibrahim El Abyad trailer ID is unverified → falls back to YouTube search.
- Trailer IDs for the other three films were verified against official sources.
- Cast roles for Turab El Mas corrected against Wikipedia/elcinema/cineamo; two
  unverified entries removed.
- Social links (IG/X) are clearly-marked placeholders; no GitHub link.
- VAT/service fees are demo values (5 EGP fee, 5% tax); confirm before launch.
- Loyalty points, gift cards, rotating QR, ticket transfer/resale are NOT built
  (see Phase 22 optional features — pros/cons with backend requirements pending).

## Production note (payments)

Real card payments must use a hosted/embedded checkout from a licensed gateway so card
data never touches this site's code. Paymob (Egypt) documents cards with 3D Secure,
wallets (e.g. Vodafone Cash, Orange Cash) and installments, a Test/Live account split,
and merchant verification before going live; verify current details at
developers.paymob.com before committing to any gateway.

## Verified data

Trailer IDs (official sources):
- Interstellar `3WzHXI5HizQ` — Movieclips Trailers official teaser ✅
- 12 Angry Men `TEN-2uTi2c0` — MGM official trailer ✅
- Turab El Mas `9cO54cwkN1I` — New Century Production official trailer ✅
- Ibrahim El Abyad — unverified → YouTube search fallback

## License

Demo project. Images are placeholders — replace with licensed poster/snack artwork
before launch. QR generator (`js/vendor/qr.js`) is original self-contained code.
