# EX3: Hello World full-stack slice

A personal site with a frog spinner, a Frog Library and frog favorites: a React frontend, a Node.js API and PostgreSQL. Everything runs locally with one Docker command.

**Stack:** React 19 + Vite 8, React Router 8, TanStack Query 5 (frontend) · Node.js 24, Express 5, TypeScript, `pg` (backend) · PostgreSQL 16 · Docker Compose · Vitest, Supertest, React Testing Library, MSW (tests).

## Prerequisites

- Docker Desktop (on Windows, with the WSL 2 backend enabled)
- Git
- Node.js 24 LTS, only needed to run the unit tests outside Docker

## First-time setup

```powershell
cp .env.example .env
```

The values in `.env.example` are for local development only. Keep the password to letters, numbers, `-` and `_` (it goes inside a connection URL).

## Start everything

```powershell
docker compose up --build
```

Then open <http://localhost:5173>. You should see a dark green nav bar ("Brendan Seibert" on the left; Frog Library and About on the right) above three columns, with "About Me" in the middle one. The right column is the favorites panel, headed by two tabs: **Your Favorites** and **All Time Favorites**. The API is also available directly at <http://localhost:3000/api/health>.

Add `-d` to run in the background.

**After pulling the production-readiness change** (new backend packages, Node 24), run `docker compose up --build -V` once. Without `-V`, Compose reuses the containers' old `node_modules` and the backend stops with `Cannot find package 'helmet'`.

## Stop everything

- `docker compose down` stops and removes the containers but keeps the database data.
- `docker compose down -v` also deletes the database volume (a full reset).

## Useful commands

| Command | What it does |
| --- | --- |
| `docker compose logs -f backend` | Watch the backend logs |
| `docker compose ps` | See the status of each service |
| `docker compose up --build backend` | Rebuild and restart one service |
| `docker compose up --build -V` | Rebuild after a `package.json` change (renews the containers' `node_modules`, keeps the database) |

## Run the tests

**Once, after cloning (and again whenever a `package-lock.json` changes),** install the packages on your own machine. The unit tests run outside Docker, so they need their own copy. Run one command per line:

```powershell
cd backend
npm ci
cd ..\frontend
npm ci
npx playwright install chromium
cd ..
```

Without this, `npm test` fails with "'vitest' is not recognized" or "Cannot find module". The `playwright install` line downloads the Chromium build the browser tests drive (about 150 MB, once per machine); npm does not do this for you.

**Backend unit tests** (type check, then tests with a 90% coverage threshold):

```powershell
cd backend
npm test
```

**Frontend unit tests** (same idea):

```powershell
cd frontend
npm test
```

**Frontend browser tests** (real-browser layout tests at phone, tablet and desktop sizes, in headless Chromium). They run on your machine, not in Docker:

```powershell
cd frontend
npm run test:browser
```

They include real frog-spinner spins (3 seconds each), so the run takes a couple of minutes.

`src/a11y.browser.test.tsx` runs [axe-core](https://github.com/dequelabs/axe-core)'s WCAG 2.x Level A and AA rules over every page and the home page's key states (idle, card landed and open, All Time Favorites, favorites unavailable, empty Your Favorites) at a phone and a laptop size, and over the Frog Library under the WCAG 1.4.12 text-spacing overrides (`src/test/textSpacing.ts`). **A new page or state gets a case there.** axe finds only the mechanical failures (a missing name, a bad ARIA attribute): it does not replace checking by hand with a screen reader, the keyboard, zoom and a contrast theme. One rule is skipped in one state: with the landed card open, `target-size` is off, because the open card floats over the Spin button on purpose (it closes on a click outside, Escape, or focus moving away).

If `npm test` fails every file with "Vitest failed to find the runner", the terminal's working directory has a lowercase drive letter (`c:\...`), which makes Node load Vitest twice. `cd C:\Users\...\frontend` (capital `C:`) and run it again.

**Backend integration tests** (real PostgreSQL in a throwaway Docker stack; no local install needed). Run both lines; the second always cleans up:

```powershell
docker compose -p ex3-test -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
docker compose -p ex3-test -f docker-compose.test.yml down -v
```

The first command's exit code is the test result (0 = passed).

Do not chain these commands with `&&` in Windows PowerShell 5.1; it is a parse error there. Run them one per line.

## Styling and text conventions

The frontend follows a few rules, and `npm test` in `frontend/` enforces the first four and the dark-block rule (`styleConventions.test.ts` and `noHardcodedText.test.tsx`).

| Rule | Example |
| --- | --- |
| Only `src/styles/_palette.scss` contains colour literals (`#hex`, `rgb()`, colour names) | `$sage-800: #3b422e;` |
| Each component maps palette colours to roles once, in a `.d-<component-name>` block of custom properties | `.d-navbar { --surface-color-navbar: #{p.$sage-800}; }` |
| Custom property names follow `--<text\|surface\|border\|shadow>-color-<component>[-<part>][-<state>]` | `--text-color-navbar-link-hover` |
| Sizes use `rem` (or `fr`, `%`, `vw`, `dvh`, `clamp()`), with tokens from `src/styles/_tokens.scss`. The only `px` allowed is a `1px` hairline | `padding: t.$space-3 t.$space-5;` |
| Every user-facing string, including `aria-label`s and the page title, lives in `src/i18n/en.json` and is read with `t()` from `useI18n()` | `t('navbar.frogLibrary')` |
| A component's root has both classes, `d-<name>` (colours) and `<name>` (layout); child classes start with the component name | `<header className="d-navbar navbar">`, `.navbar-link` |
| Each `.d-<name>` block is followed by a `:root[data-theme="dark"] .d-<name>` block that sets exactly the same roles (the test fails if one is missing) | `:root[data-theme="dark"] .d-navbar { --surface-color-navbar: #{p.$sage-900}; }` |
| One `.scss` file per component, next to it, starting with `@use "../styles/palette" as p;` and/or `@use "../styles/tokens" as t;` | `Navbar.tsx` imports `./Navbar.scss` |

The three-column layout switches to stacked rows (Middle, Left, Right) at 64rem (1024px at default text size) and below. That rule lives in one mixin, `wide-layout` in `_tokens.scss`. The same file holds the shape-only mixins: `button-shape` for buttons and nav links, and `panel` for the rounded, bordered panels (the home page's columns, the Frog Library and About panels). A page that wants the panel look uses `@include t.panel;` and sets its own `background-color`, `border-color` and heading colour.

## Colour

The palette (`frontend/src/styles/_palette.scss`) is built from four anchor colours: Burnt Sienna `#984216`, Ivory Sand `#E4D6C5`, Stormy Sky `#78898F` and Sage Green `#8D957E`. The other shades are the same hues made lighter or darker. Only the shades the site uses are in the file, with one exception: `sienna-750` and `sienna-800` stay in the palette file but aren't used (too dark for text on the dark page, too saturated for large surfaces). The other sienna shades are dark mode's accent. Sage Green is the main colour, used at `sage-800` (`#3b422e`) for the nav bar, buttons, payline, hearts, headings and the selected tab, with `sage-900` (`#292f1e`) for hover. The page background is an off-white sand (`sand-100`) rather than near-white. Every pairing meets WCAG AA: 4.5:1 for text, and 3:1 for focus rings, button outlines, the payline and the selected tab's bar.

| Where | Foreground on background | Contrast |
| --- | --- | --- |
| Body text on the page, the columns and the cards | `sky-900` on `sand-100`, `sand-150`, `sage-100`, `sky-100`, `sand-200`, `sage-200`, `sky-200` | 10.4 to 13.3 |
| Column headings (middle, left, right; the Frog Library and About headings match the middle) | `sage-800` on `sand-150`, `sage-800` on `sage-100`, `sky-800` on `sky-100` | 8.7, 9.4, 9.9 |
| Page-not-found heading | `sage-800` on `sand-100` | 9.2 |
| Spinner status line | `sage-800` on `sage-100` | 9.4 |
| Links in the About Me section, and on hover | `sage-800` on `sand-150`, `sage-900` on `sand-150` | 8.7, 11.5 |
| Nav bar title and buttons | `sand-50` and `sand-100` on `sage-800` | 10.0, 9.2 |
| Nav button on hover | `sage-900` on `sand-200` | 9.7 |
| "Spin the wheel" button, and on hover | `sand-50` on `sage-800`, on `sage-900` | 10.0, 13.1 |
| "Spin the wheel" button outline against its column | `sage-800` on `sage-100` | 9.4 (needs 3) |
| Nav button outline and focus ring | `sand-300` on `sage-800` | 6.2 (needs 3) |
| Page focus ring | `sky-700` on any page or column surface | 7.0 or more (needs 3) |
| Payline | `sage-800` on `sand-50` | 10.0 (needs 3) |
| Favorite heart (outline and fill) | `sage-800` on the card tones `sand-200`, `sage-200`, `sky-200` | 7.3, 8.3, 7.9 (needs 3) |
| Favorites tabs: text, and on hover | `sky-700` on `sky-100`, on `sky-200` | 7.5, 6.4 |
| Favorites tabs: selected text | `sky-900` on `sky-100` | 13.1 |
| Favorites tabs: the selected tab's bar | `sage-800` on `sky-100` | 9.2 (needs 3) |
| Heart focus ring on the card tones | `sky-700` on `sand-200`, `sage-200`, `sky-200` | 5.9, 6.7, 6.4 (needs 3) |
| Heart on its hover surface | `sage-800` on `sand-50` | 10.0 (needs 3) |
| Card focus ring on the spinner window | `sky-700` on `sand-50` | 8.0 (needs 3) |

The card surfaces against their panels (about 1.2:1) and the panel borders (about 1.4:1) are below 3:1 on purpose. WCAG 1.4.11 needs a visible boundary only when nothing else identifies the control, and every card face is identified by its title text. The spinner window's border (`sage-500`, about 2.9:1) is decoration, not a control.

`frontend/src/styles/contrast.test.ts` checks every row; add new pairings there too. When you add a colour pairing, check it with a contrast checker before using it, and add it here.

### Dark mode

The nav bar has a dark mode switch at its far right: a sun and a moon with a thumb that slides over the active one, built as a `<button role="switch">` named "Dark mode" (the name never changes; `aria-checked` says on or off).

- **First visit:** the site follows the browser or OS setting, and keeps following it live until you use the switch.
- **After a press:** your choice is remembered in this browser's `localStorage` (`ex3.theme`) and wins on later visits. If storage is blocked, the switch still works for that visit. Nothing is sent to the server.
- **Other tabs:** a choice made in one tab applies straight away in the site's other open tabs.
- **How it works:** `startApp.tsx` (called by `main.tsx`) sets `<html data-theme="light|dark">` before React renders, so there is no flash of the wrong theme. A switch changes every colour at once, with no fade. The CSS keys off that attribute only. A stored value other than exactly `light` or `dark` is ignored. `color-scheme` (a meta tag and a rule in `AppLayout.scss`) makes scrollbars and form controls follow.
- **Colours:** the page is `sky-950` and the text `sand-100`. The columns and cards are lighter shades of their own families, the nav bar is `sage-900`, and Burnt Sienna is the accent (`sienna-300` for headings in sand panels, links, hearts, the selected tab's bar and the Spin button; `sienna-400` for the payline).

Dark pairings (`DARK_PAIRINGS` in `contrast.test.ts`):

| Where | Foreground on background | Contrast |
| --- | --- | --- |
| Body text on the page | `sand-100` on `sky-950` | 15.60 |
| Body text on the middle, left, right column | `sand-100` on `sand-900`, `sage-950`, `sky-900` | 14.42, 14.31, 13.08 |
| Body text on sand, sage, sky cards | `sand-100` on `sand-800`, `sage-850`, `sky-850` | 11.27, 11.02, 11.64 |
| Middle heading (and Frog Library, About) | `sienna-300` on `sand-900` | 8.48 |
| Left heading, spinner result line | `sage-300` on `sage-950` | 10.40 |
| Right heading | `sky-300` on `sky-900` | 8.65 |
| Not-found and error headings | `sienna-300` on `sky-950` | 9.17 |
| Link in the middle column, and on hover | `sienna-300`, `sienna-200` on `sand-900` | 8.48, 11.31 |
| Nav title, nav links | `sand-50`, `sand-100` on `sage-900` | 13.15, 12.20 |
| Nav link on hover | `sage-900` on `sand-200` | 9.69 |
| Nav outline and focus ring | `sand-300` on `sage-900` | 8.16 (needs 3) |
| "Spin the wheel" button, and on hover | `sienna-950` on `sienna-300`, on `sienna-200` | 9.09, 12.11 |
| "Spin the wheel" button against its column | `sienna-300` on `sage-950` | 8.41 (needs 3) |
| Page focus ring on page, middle, left, right | `sky-300` on `sky-950`, `sand-900`, `sage-950`, `sky-900` | 10.32, 9.54, 9.46, 8.65 (needs 3) |
| Payline | `sienna-400` on `sky-950` | 6.58 (needs 3) |
| Heart on sand, sage, sky cards | `sienna-300` on `sand-800`, `sage-850`, `sky-850` | 6.63, 6.48, 6.85 (needs 3) |
| Heart on its hover surface | `sienna-300` on `sky-950` | 9.17 (needs 3) |
| Heart focus ring on sand, sage, sky cards | `sky-300` on `sand-800`, `sage-850`, `sky-850` | 7.46, 7.29, 7.70 (needs 3) |
| Favorites tabs: text, and on hover | `sky-300` on `sky-900`, on `sky-800` | 8.65, 6.57 |
| Favorites tabs: selected text | `sand-50` on `sky-900` | 14.11 |
| Favorites tabs: the selected tab's bar | `sienna-300` on `sky-900` | 7.70 (needs 3) |
| Card focus ring on the spinner window | `sky-300` on `sky-950` | 10.32 (needs 3) |

The switch (`TOGGLE_PAIRINGS`) is checked on both nav bar colours (`sage-800` in light, `sage-900` in dark); every row needs 3:

| Where | Foreground on background | Light | Dark |
| --- | --- | --- | --- |
| Switch track outline | `sand-300` on the nav bar | 6.19 | 8.16 |
| Switch track outline on hover | `sand-50` on the nav bar | 10.0 | 13.15 |
| Inactive icon | `sand-100` on the nav bar | 9.25 | 12.20 |
| Thumb against the track | `sand-200` on the nav bar | 7.34 | 9.69 |
| Active icon on the thumb | `sage-900` on `sand-200` | 9.69 | 9.69 |

As in light mode, some pairings are below 3:1 on purpose and aren't tested: card against panel (about 1.3:1), panel borders (1.6 to 1.9:1), concealed reel shapes against their card (decoration with no text) and the column against the page (about 1.1:1). The spinner window's border (`sage-500` on `sky-950`) is 5.67.

The a11y browser tests run every case in both themes.

## Spinner content

The frog spinner in the "Frog Spinner" column reads its entries from `frontend/src/i18n/en.json`, under `frogSpinner.entries`.

- **Text:** each entry has a `title` and a `blurb` (the description shown when the card opens). The order in the file is the order on the reel. Titles must be unique (a test checks this). The ids (`entry01`...) never appear on screen.
- **Adding or removing an entry:** edit `en.json`. Card colours are assigned automatically so neighbouring cards always differ. Until an admin page exists, the backend must also know the frog: add a new numbered migration that inserts its row into `frogs` (for example `backend/migrations/004_add_entry21.sql` with `INSERT INTO frogs (id, position) VALUES ('entry21', 21);`), or one that deletes it. Removing a frog removes its likes. The seed (`002_seed_frogs.sql`) is the initial crop only and never runs again; `seedFrogs.test.ts` checks that the seed plus every later frog migration (such as `004_remove_entry20.sql`) leaves exactly the frogs in `en.json`.
- **Long titles:** only a card with `fitsRow` (the spinner's landed card, and every concealed reel card) is exactly one reel row tall, with its title cut at two lines ("…"); the landed card's full name is in the status line below it. Every other card, such as those in the favorites panel, grows to show its whole title (WCAG 1.4.12).
- **The Frog Library page** (`/frog-library`) shows the same entries, every one fully open, in the same order and the same colours, so editing `en.json` updates both the reel and the library.
- **Images:** put the file in `frontend/src/assets/frog-entries/`, import it at the top of `frontend/src/components/frogEntries.ts`, and add it to `IMAGES` there. Keep images small (about 160px square, WebP), because each one appears five times on the reel strip. Images are decorative (`alt=""`) for now; if a picture adds information the title doesn't, give it alt text in `en.json`.

## Favorites

Every card that names its frog (the Frog Library, the spinner's landed card, the favorites panel) has a heart in its top-right corner. Pressing it favorites that frog, or unfavorites it. The heart is the only way to favorite a frog: landing on one in the spinner never does.

- **How you are remembered, without a login:** on your first like, the backend sets an anonymous cookie, `ex3_visitor`: a random ID signed by the server (`<id>.<signature>`, so a made-up ID is treated as no cookie), `HttpOnly`, `SameSite=Lax`, `Path=/api`, 400 days, renewed on every like. Reading the lists never sets it. A private window, another browser or another device is a different visitor.
- **What is stored:** that random ID and the frogs it liked, with when. No IP address, no user agent, nothing about you.
- **Clearing cookies** forgets your favorites, but your likes stay in the all-time tally: "All Time" means everyone who ever liked a frog.
- **The tally is for fun.** Anyone can clear cookies and like again; each ID can like each frog once, and counts can't double count or go negative. In production, one address can create at most 30 new visitors an hour (see Security), but many addresses can still stuff the ballot, so don't use the counts for anything that matters.
- **The panel** (the home page's right column) shows Your Favorites, or the All Time top ten with counts, chosen by the two tabs across its top, which serve as its header (remembered in this browser's `localStorage`). A long list scrolls inside the panel.
- **Endpoints:** `GET /api/favorites/mine`, `GET /api/favorites/top`, `PUT /api/favorites/:entryId` (like) and `DELETE /api/favorites/:entryId` (unlike). Only frogs in the `frogs` table can be liked.

## Settings

`.env` (copied from `.env.example`) holds the database name, user and password, the backend port, and:

- **`COOKIE_SECURE`** (`true` or `false`, default `false`): the visitor cookie's `Secure` flag. Keep `false` for `http://localhost`. It **must be `true`** on any server reached over HTTPS, so the cookie is never sent over plain HTTP. Any other value stops the backend at startup. `true` also turns on HSTS.
- **`NODE_ENV`** (`development`, `test` or `production`, default `development`): `production` refuses `COOKIE_SECURE=false`, a missing `VISITOR_SECRET` and a database connection without TLS (unless `DATABASE_PRIVATE_NETWORK=true`), and turns on the rate limits and the `Origin` check. The production image sets it; development never does.
- **`TRUST_PROXY`** (a hop count, default `0`): how many reverse proxies sit in front of the backend. `0` locally, usually `1` behind one proxy, never `true` (refused at startup). Check it on the host with the steps in Security.
- **`STATIC_DIR`**: the folder with the built frontend. Only the production image sets it (`/app/public`); unset, the backend serves no files.
- **`VISITOR_SECRET`**: the key that signs the visitor cookie. **Required in production**: at least 32 random characters, for example from `openssl rand -base64 48`, kept in the host's dashboard. Unset elsewhere, a fixed development key is used (production refuses it). Changing it makes every existing visitor a new one: their likes stay in the tally, but Your Favorites starts empty.
- **`DATABASE_URL`** on a host: `?sslmode=verify-full`, or no `sslmode` on the host's private network (with `DATABASE_PRIVATE_NETWORK=true`). `require`, `prefer`, `verify-ca`, `no-verify`, `disable`, the `ssl` parameter, `uselibpqcompat` and any TLS parameter given twice stop the backend at startup (the error never prints the URL).
- **`DATABASE_CA_CERT`**: the PEM text of a database provider's own root certificate, for providers not signed by a public authority. The URL must then carry no `sslmode` or other `ssl…` parameter. Line breaks stored as a literal `\n` are turned back into real ones.
- **`DATABASE_PRIVATE_NETWORK`** (`true` or `false`, default `false`): `true` only when the database is reached over the host's private network (Railway's `*.railway.internal`, Render's internal URL, the self-hosted Compose network). It is the only way production starts without TLS to the database, so a public URL that lost its `?sslmode=verify-full` fails loudly instead of running in plain text.

## Production

One container serves the built React app and the API on one port, in front of a managed PostgreSQL over verified TLS. Build and check it from the repository root:

```powershell
docker build -t ex3 .
```

- **What's in the image** (`Dockerfile`, three stages): `node:24-alpine`, the compiled backend (`dist/`), the migrations, the frontend build (`public/`) and production packages only. It runs as the `node` user, with `NODE_ENV=production` and `STATIC_DIR=/app/public`. No source, dev packages, `.env` or `*.md` (see `.dockerignore`).
- **Run-time settings** come from the host, never the image: `DATABASE_URL`, `COOKIE_SECURE=true`, `VISITOR_SECRET`, `TRUST_PROXY`, `PORT` (default 3000) and, if used, `DATABASE_CA_CERT` or `DATABASE_PRIVATE_NETWORK=true`.
- **Caching:** `/assets/*` (hashed names) for a year, `immutable`; `index.html` and other files `no-cache` (revalidated with ETags); every `/api` response `no-store`. Text is gzipped.
- **Pages:** any page URL (`/about`, `/frog-library`, a made-up one) returns `index.html` so a hard refresh works. `/api/*`, `/assets/*` and any path whose last part has a dot (`/robots.txt`, `/.env`) get a JSON 404, never the page.
- **Smoke test** (Git Bash, Docker Desktop running): `sh scripts/smoke.sh` builds the image, runs it against a throwaway PostgreSQL and checks the headers, caching, 404s, the `Origin` check, the new-visitor limit and the `node` user. It prints `smoke ok`.
- **Development is unchanged:** `docker compose up --build` still runs Vite and nodemon, with no rate limits and no `Origin` check.
- **Self-hosting (optional):** `docker-compose.prod.yml` runs the image (read-only, no Linux capabilities), PostgreSQL (no published port) and Caddy (automatic HTTPS, only ports 80 and 443). Put real `POSTGRES_*` values (a password of letters and digits only, such as `openssl rand -hex 24`, because it goes into a URL), `VISITOR_SECRET` and `SITE_ADDRESS` in `.env`, then `docker compose -f docker-compose.prod.yml up -d --build`. Backups are yours: a nightly `pg_dump` copied off the machine.

## Security

| Threat | What stops it |
| --- | --- |
| Injected scripts (XSS) | React escapes text; a strict CSP (`default-src 'none'`, `'self'` only, no `'unsafe-inline'`). `scripts/check-dist.sh` fails the build on an inline script or style |
| Clickjacking | `frame-ancestors 'none'`, `X-Frame-Options` |
| HTTP downgrade | HSTS (`max-age=86400` to start; raise to `31536000` after a week of HTTPS), `Secure` cookie, production refuses `COOKIE_SECURE=false` |
| Cross-site likes (CSRF) | `SameSite=Lax`, no CORS headers, `PUT`/`DELETE` with a foreign `Origin` answer `403` (production) |
| Floods | Per address, in production: 600 API requests and 60 likes/unlikes per 15 minutes; 10 KB bodies; database timeouts |
| Ballot stuffing from one address | The visitor cookie is signed, so made-up IDs count as new visitors; 30 new visitors per address per hour |
| Forged `X-Forwarded-For` | `TRUST_PROXY` is a hop count, never `true` |
| Path traversal, dotfiles, secrets in the image | `express.static` containment, `dotfiles: 'ignore'`; the image holds no source or `.env` |
| Container escalation | Runs as `node`; on the self-hosted stack, read-only, no capabilities, `no-new-privileges` |
| Vulnerable packages | `npm audit` in CI, Dependabot weekly |
| Database eavesdropping or impersonation | `sslmode=verify-full` or `DATABASE_CA_CERT` (certificate and hostname verified), or the host's private network (`DATABASE_PRIVATE_NETWORK=true`); production refuses plain text otherwise; weak, repeated or conflicting TLS parameters refused at startup |
| Fingerprinting | No `X-Powered-By`, generic errors, no source maps |
| Shared caches leaking favorites | `no-store` on all of `/api` |

**Not prevented, by design:** ballot stuffing from many addresses (about 720 new visitors a day each), and a volumetric denial of service beyond one small container (put Cloudflare's free tier in front if it matters).

**Check the headers** once hosted with securityheaders.com (expect A or better) and Mozilla's HTTP Observatory (one step lower until HSTS is raised to a year).

**Check `TRUST_PROXY` on the real host** after the first deploy and after any hosting change, from PowerShell, in this order:

1. Writes from other sites are refused (prints `403`):
   ```powershell
   $site = "https://<your-site>"
   curl.exe -s -o NUL -w "%{http_code}`n" -X PUT -H "Origin: https://evil.example" "$site/api/favorites/entry01"
   ```
2. A forged address isn't believed: the last lines must be `429` (the new-visitor limit is 30 an hour). Thirty-five `200`s mean `TRUST_PROXY` is too high; lower it by one and redeploy.
   ```powershell
   1..35 | ForEach-Object { curl.exe -s -o NUL -w "%{http_code}`n" -X PUT -H "X-Forwarded-For: 203.0.113.$_" "$site/api/favorites/entry01" }
   ```
3. Visitors don't share one counter: right after step 2, like a frog from your phone over mobile data. If the heart snaps back with a `429`, `TRUST_PROXY` is too low; raise it by one and redeploy.

## CI

`.github/workflows/ci.yml` runs on every push and pull request, with read-only permissions:

| Job | What it runs |
| --- | --- |
| `backend` | `npm ci`, `npm audit --omit=dev --audit-level=high`, `npm test`, `npm run build` |
| `frontend` | the same, plus lint, the browser tests, `scripts/check-dist.test.sh` and `scripts/check-dist.sh` |
| `integration` | the integration test stack |
| `image` | `scripts/smoke.sh` |

A high or critical vulnerability in a shipped package fails the build. Dependabot (`.github/dependabot.yml`) opens weekly pull requests for npm, Docker and GitHub Actions updates. **A red check means don't deploy.** On GitHub, also turn on Dependabot alerts, secret scanning, and a branch protection rule on `main` requiring the four jobs.

## Database

- **Migrations** live in `backend/migrations/`, as numbered `.sql` files (`001_...`, `002_...`). The backend applies new ones in order when it starts, each in a transaction, and records them in `schema_migrations`; if one fails, the backend logs it and stops. To change the database, add the next number. Never edit a migration that has been applied; add a new one.
- **`frogs`** is the backend's list of which frogs exist (id and display position), seeded with the initial 20. There may be more or fewer later.
- **`favorites`** has one row per like (visitor, frog), referring to `frogs`. A frog's tally is its number of rows.

## Pages and navigation

- The pages are Home (`/`), the Frog Library (`/frog-library`) and About (`/about`).
- Every page's URL lives in `frontend/src/paths.ts` (`PATHS`). The routes and the nav bar both read it, so changing a URL is one line.
- A new page needs a route in `routes.tsx`; exactly one `<main tabIndex={-1}>`, **with a name** (`aria-label`, from the same key as its title; after each navigation, Back and Forward included, `AppLayout` scrolls to the top and focuses that `<main>`, so a screen reader says e.g. "Frog Library, main landmark"); a `usePageTitle()` call (`usePageTitle('frogLibrary.heading')` gives the tab title "Frog Library · Brendan Seibert", and with no key it is the site name alone, as on Home; the format is `app.pageTitle` in `en.json`); and, if it belongs in the nav bar, an item in `NAV_ITEMS` in `Navbar.tsx`. `AppLayout` sets only the page language, not the title.
- A link that opens a new tab uses `NewTabLink` (`components/NewTabLink.tsx`). It adds `target="_blank"`, `rel="noopener noreferrer"` and the screen-reader-only "opens in a new tab" text; pass `pdf` for a PDF link, and the page's own link class as `className` (it has no styles of its own).
- If a page fails to render, `ErrorPage` replaces it (the nav bar stays), instead of React Router's built-in error screen.
- On wide screens the home page's columns read Left, Middle, Right on screen, but the DOM and Tab order run Middle, Left, Right. This is deliberate: the columns are independent, and the DOM order is the right reading order on a phone (WCAG 1.3.2 and 2.4.3 still pass).
- The nav bar is links only: every item in `NAV_ITEMS` must have a `to` (an item without one fails to compile). The dark mode switch is not a nav item: it sits after `<nav>`, inside the `.navbar-end` wrapper, at the far right.
- The nav bar hides the link to the page you are on: no Home on the home page, no Frog Library on the library, no About on the About page. On any other URL, all three links show.
- After a navigation, Tab moves forward from the page's `<main>` into its content; Shift+Tab goes back to the nav bar.

## Project layout

```text
EX3/
├── README.md
├── .env.example               sample settings (copy to .env, never commit .env)
├── Dockerfile                 production image: frontend build, backend build, runtime as node
├── .dockerignore              keeps node_modules, dist, .env, .git and *.md out of the image
├── .gitattributes             *.sh and Caddyfile always LF, so Git Bash on Windows can run them
├── docker-compose.yml         dev stack: db + backend + frontend
├── docker-compose.test.yml    integration test stack: test db + backend tests
├── docker-compose.prod.yml    optional self-hosted stack: app + db + Caddy
├── Caddyfile                  with it: automatic HTTPS, reverse proxy to the app
├── .github/                   workflows/ci.yml (tests, audit, build, smoke), dependabot.yml
├── scripts/                   check-dist.sh (no inline script/style or source maps), check-dist.test.sh (its fixture test), smoke.sh (image smoke test)
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── server.ts          starts the server (thin wiring)
│   │   ├── lifecycle.ts       migrate-or-exit at startup, clean shutdown (testable)
│   │   ├── app.ts             builds the Express app (no side effects, easy to test)
│   │   ├── config.ts          validates environment variables
│   │   ├── db.ts              creates the PostgreSQL connection pool; the shared Db type
│   │   ├── migrate.ts         applies new migrations in order at startup
│   │   ├── visitor.ts         reads and issues the anonymous ex3_visitor cookie
│   │   ├── security.ts        security headers (CSP, HSTS...), rate limits, the same-origin check on writes
│   │   ├── staticSite.ts      serves the frontend build in production, with index.html for page URLs
│   │   └── routes/            health.ts (GET /api/health), favorites.ts (the four favorites endpoints)
│   ├── migrations/            numbered .sql files: the frogs and favorites tables, the seed, and later frog changes (004 removes entry20)
│   └── tests/
│       ├── unit/              fast tests, no database
│       └── integration/       tests against a real PostgreSQL in Docker
└── frontend/
    ├── Dockerfile
    ├── vite.config.ts         dev server, /api proxy, Vitest projects (unit, browser)
    └── src/
        ├── main.tsx           calls startApp
        ├── startApp.tsx       applies the theme, then mounts React, i18n, router and TanStack Query (+ test)
        ├── paths.ts           every page's URL (PATHS), shared by the routes and the nav bar
        ├── routes.tsx         the list of URLs and their pages, inside AppLayout
        ├── layout.browser.test.tsx   real-browser layout tests at 9 viewport sizes
        ├── a11y.browser.test.tsx     axe WCAG A/AA scans of every page and key state
        ├── api/               favorites.ts (the favorites endpoints, checked data)
        ├── styles/            _palette.scss (colours), _tokens.scss (sizes, breakpoint, mixins), convention and contrast tests
        ├── theme/             theme.ts (pure: parse, resolve and toggle the theme), themeStorage.ts (localStorage `ex3.theme`, browser setting, sets <html data-theme>), useTheme.ts (+ tests)
        ├── i18n/              en.json (every visible string), translate.ts, fillSlots.tsx (links inside a sentence),
        │                      no-hard-coded-text test
        ├── context/           I18nProvider and useI18n()
        ├── components/        AppLayout, Navbar, ColumnLayout (each with .scss and tests); usePageTitle.ts (each page's tab title)
        │   ├── FrogSpinner.tsx       the reel, "Spin the wheel" button and status line (+ .scss, tests, browser tests)
        │   ├── FrogCard.tsx          one rounded, coloured card: image slot, title, optional description
        │   ├── frogEntries.ts        the entry list from en.json, card tones, image map
        │   ├── frogReel.ts           pure reel maths: next pick, resting and landing rows
        │   ├── frogExpansion.ts      pure open/close rules for the landed card (click, tap, keys)
        │   ├── useCardExpansion.ts   those rules as a hook; ExpandableFrogCard.tsx uses it (spinner and panel)
        │   ├── FavoriteButton.tsx    the heart: a toggle button; useFavorite.ts holds its state and saves
        │   ├── FavoritesPanel.tsx    the home page's right column: Your Favorites / All Time Favorites
        │   ├── favoritesTabs.ts      the panel's two tabs and their keyboard rule (pure)
        │   ├── FavoritesStatus.tsx   announces a heart that couldn't be saved (in AppLayout, every page)
        │   ├── NewTabLink.tsx        a link that opens a new tab, with the screen-reader warning
        │   └── ThemeToggle.tsx       the dark mode switch (+ .scss, tests, browser tests); Navbar places it after the links, in .navbar-end
        ├── pages/             HomePage, FrogLibraryPage and AboutPage (each + browser tests), NotFoundPage, ErrorPage;
        │                      contactLinks.ts (the email address and profile URLs behind the About Me links)
        └── test/              test setup (jsdom and browser), MSW server and handlers, favoritesFake.ts, matchMedia.ts (fakeMatchMedia), renderWithProviders,
                               renderApp.tsx and browserHelpers.ts (shared by the browser tests),
                               viewports.ts (the viewport table shared by the browser tests),
                               axe.ts (expectNoAxeViolations), textSpacing.ts (the WCAG 1.4.12 overrides)
```

## How a request flows

The browser loads the React app from the Vite dev server. React Router shows the home page. The home page uses TanStack Query to call the favorites endpoints (`GET /api/favorites/mine` and `/top`). Vite forwards any `/api` request to the Node backend, which queries PostgreSQL and returns JSON. TanStack Query hands the result to the favorites panel and the hearts. `GET /api/health` (a trivial `SELECT 1`) is for the Docker health check and the smoke test; the page no longer shows it.

Favorites flow the same way. Pressing a heart updates every heart for that frog at once, then sends `PUT` (like) or `DELETE` (unlike) to `/api/favorites/<frog>`, with the `ex3_visitor` cookie. The backend checks the frog exists, stores or removes one row, and answers with the new count; the page then refetches your list and the top ten. If the save fails, the heart flips back and the page announces it.

```text
Browser (React) --> Vite dev server --/api--> Node + Express --SELECT 1--> PostgreSQL
                    (frontend container)      (backend container)        (db container)
```

In production there is no Vite: one container answers everything.

```text
                 HTTPS                      private network (TLS or the host's own network)
 Browser  ───────────────▶  Host's proxy  ───▶  Container (node, non-root)  ───▶  Managed PostgreSQL
                            TLS ends here       Express:
                                                  helmet ▸ compression ▸ rate limits ▸ Origin check
                                                  /assets/*  → 1-year immutable cache
                                                  /api/*     → JSON, no-store
                                                  any GET    → index.html (no-cache) → React Router
```

## Troubleshooting

- **Port already in use:** stop whatever uses 5173, 3000 or 5432, or change *your* side of the `ports:` mapping in `docker-compose.yml` (the middle number in `"127.0.0.1:5173:5173"`). Keep the `127.0.0.1:` at the front.
- **"password authentication failed" when connecting from Windows, although `.env` is correct:** a PostgreSQL installed directly on Windows is probably answering on port 5432 instead of the Docker one. Run `netstat -ano | findstr :5432`. Either stop that service (Windows "Services" app, `postgresql-...`, set to Manual) or map the Docker database to `"127.0.0.1:5433:5432"` and connect on 5433.
- **Backend logs show "host not found", "getaddrinfo ENOTFOUND" or "Invalid URL" right after you changed the password:** the password contains a character that breaks the URL (`@ : / # ? %`). Use only letters, numbers, `-` and `_`, then run `docker compose down -v` (see the last entry).
- **The app works on your machine but not from your phone or another computer:** this is intentional. All ports are bound to `127.0.0.1` so the dev servers are not reachable from the network. Do not remove that to "fix" it.
- **Page loads but says "Favorites are unavailable right now.":** run `docker compose logs backend`. Open <http://localhost:3000/api/health>; if the database is down, the backend logs the real reason on a line starting with `Health check: database query failed`.
- **Frontend changes do not appear in the browser:** confirm `usePolling: true` in `frontend/vite.config.ts` (Windows file-watching quirk).
- **Backend changes are not picked up** (no `restarting due to changes...` in the logs): confirm the `dev` script in `backend/package.json` uses `nodemon --legacy-watch`, then run `docker compose up --build -V backend`.
- **Compose stops with "Copy .env.example to .env first":** you have no `.env` file. Run `cp .env.example .env`.
- **"The token '&&' is not a valid statement separator":** you are in Windows PowerShell 5.1. Run the commands one per line.
- **`docker compose down` takes 10 seconds or more:** check that `init: true` is set on `backend` and `frontend` in `docker-compose.yml`.
- **Dependency changes not picked up:** `docker compose up --build -V` (renews the containers' `node_modules` volume and keeps your database). Only use `docker compose down -v` if you also want to wipe the database.
- **Database container never becomes healthy after changing `POSTGRES_USER`, `POSTGRES_PASSWORD` or `POSTGRES_DB`:** those values are applied only when the data volume is first created. Run `docker compose down -v` to reset it.
- **`npm run test:browser` fails with "browserType.launch: Executable doesn't exist":** run `npx playwright install chromium` in `frontend`.
- **Styles don't change after `npm install`:** run `docker compose up --build -V`.
- **A convention test fails on a colour or `px` value:** move the colour into `_palette.scss` and reference it from the component's `.d-` block; use a `rem` token from `_tokens.scss` instead of `px`.
- **A convention test flags `green` or `blue` in a stylesheet:** bare colour keywords count as colour literals. Name the thing by role or mood instead (like the card tones `sand`, `sage` and `sky`, which are mood names that happen to match palette families, not CSS colour keywords).
- **`Invalid environment variables: COOKIE_SECURE: must be "true" in production`:** set `COOKIE_SECURE=true` on the host.
- **`self-signed certificate` or `Hostname/IP does not match` from `pg`:** the URL's host is wrong, or the provider needs `DATABASE_CA_CERT`. Never disable verification.
- **`sslmode=require is not allowed`:** use `sslmode=verify-full`, or `DATABASE_CA_CERT` with no `sslmode`.
- **`DATABASE_URL: needs TLS in production`:** add `?sslmode=verify-full`, or set `DATABASE_CA_CERT`. Only if the database is on the host's private network, set `DATABASE_PRIVATE_NETWORK=true` instead.
- **`VISITOR_SECRET: must be set to your own random value in production`:** set it on the host to the output of `openssl rand -base64 48`, and keep it: changing it starts every visitor's favorites over.
- **Likes fail with `403 Forbidden` on the host:** something in front rewrites the `Host` header; check the proxy setup.
- **Every visitor gets `429` at once:** `TRUST_PROXY` is too low; run the checks in Security.
- **`Cannot find package 'helmet'` in development:** run `docker compose up --build -V`.
- **`smoke.sh` fails at once with `$'\r'` errors:** the scripts have CRLF line endings; check `.gitattributes` and check the files out again.
- **Random 502s behind the host's proxy:** check the keep-alive timeouts in `server.ts` (65 and 66 seconds) weren't lowered.
- **A page shows but a hard refresh 404s:** `STATIC_DIR` is unset or wrong.
- **A `Refused to execute inline script` console error:** something added an inline script; the CSP is right, the script isn't.
- **Frontend `npm test` fails with "Vitest failed to find the runner" on the very first run after `npm ci`:** run it again. This was seen intermittently on Windows right after a fresh install and did not recur. It has also been seen on every run from Git Bash and never from PowerShell; if it keeps happening, run the tests from PowerShell.
