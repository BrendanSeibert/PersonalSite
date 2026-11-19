# EX3

A personal site. React 19 + Vite frontend, Node 24 + Express 5 + TypeScript backend, PostgreSQL 16, all run with Docker Compose. `README.md` is the human-facing overview (what the site is, how to run, configure and deploy it); this file holds the rules to follow when changing code.

Libraries beyond those: React Router 8, TanStack Query 5 and `pg`. Tests use Vitest, Supertest, React Testing Library, MSW and Playwright (Chromium). Pages: Home (`/`), Frog Library (`/frog-library`) and About (`/about`).

## Git Policy

- **NEVER commit, stage or push anything** unless the user explicitly asks. Leave all changes uncommitted in the working tree for them to review. Do not run `git add` or `git rm --cached`.

## Environment (Windows)

- The dev machine is Windows with Git Bash and PowerShell 5.1.
- In PowerShell 5.1, **never chain commands with `&&`**. Run them one per line, or use `;`. Don't use PowerShell reserved words or automatic variables (such as `$input`, `$args`, `$host`) as variable names.
- Git Bash rewrites POSIX-style paths and arguments (for example `/dev/null` or `/api/...`). For path-sensitive commands, use `MSYS_NO_PATHCONV=1` or run them in PowerShell.
- **Do not use sed for code or JSON edits.** Use the Edit tool, because sed silently fails or mangles `\n` on this machine.
- Use the Write tool, not shell heredocs, for long files such as plan documents.
- Ports bind to `127.0.0.1` on purpose. Don't remove that.
- If Vitest reports "failed to find the runner":
  1. Check the working directory's drive letter. A lowercase `c:\` loads Vitest twice, so `cd` to `C:\...` and run again.
  2. If that doesn't fix it, clear the Vite cache (`node_modules/.vite`) before bisecting.
  3. It has also happened from Git Bash, so prefer PowerShell for frontend tests.
- Some config exists to avoid Windows problems. Don't remove it: `usePolling: true` in `frontend/vite.config.ts`, `nodemon --legacy-watch` in the backend `dev` script, `init: true` on the `backend` and `frontend` services, and `.gitattributes` forcing LF on `*.sh` and `Caddyfile`.

## Setup and commands

- First run: `cp .env.example .env`. Never commit `.env`. Database passwords use only letters, digits, `-` and `_`, because they go inside a URL.
- To run tests outside Docker (again whenever a `package-lock.json` changes): `npm ci` in `backend/` and `frontend/`, then `npx playwright install chromium` in `frontend/`.

| Task | Command |
| --- | --- |
| Start the dev stack | `docker compose up --build` (http://localhost:5173, API on :3000, health at `/api/health`) |
| After a `package.json` change | `docker compose up --build -V` (renews `node_modules`, keeps the database) |
| Reset the database | `docker compose down -v` (also needed after changing `POSTGRES_*` values) |
| Backend logs | `docker compose logs -f backend` |
| Backend unit tests (type check + 90% coverage) | `cd backend` then `npm test` |
| Frontend unit tests (type check + 90% coverage) | `cd frontend` then `npm test` |
| Frontend browser tests (Chromium, a few minutes) | `cd frontend` then `npm run test:browser` |
| Integration tests (real PostgreSQL) | `docker compose -p ex3-test -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests`, then always `docker compose -p ex3-test -f docker-compose.test.yml down -v` |
| Production image | `docker build -t ex3 .` |
| Image smoke test (Git Bash) | `sh scripts/smoke.sh` (prints `smoke ok`) |

## Verification

- After a change, run the relevant suite. Before saying work is done, run the full suite (backend and frontend unit tests, browser tests, integration tests, and the smoke test when the image or backend changed), plus a type check. Report results per suite, and say plainly if any were skipped or failed.
- Browser tests run in real Chromium, where focus behaves differently from jsdom. Use browser tests to check focus and accessibility changes.
- Every test assertion must actually check behaviour. No placeholder or vacuous assertions.
- Compute colour contrast ratios exactly with a script. Never estimate them.
- After a batch of edits to a plan or doc, re-read the file to confirm the edits landed correctly.
- For visual and CSS changes, check existing container and media queries first. Confirm the result with screenshots at mobile and desktop widths.

CI (`.github/workflows/ci.yml`) runs `backend`, `frontend` (including `npm run lint`, browser tests, `scripts/check-dist.test.sh` and `scripts/check-dist.sh`), `integration` and `image` (smoke) jobs, plus `npm audit --omit=dev --audit-level=high`. Dependabot runs weekly.

## Project map

- **Root:** `Dockerfile` (3-stage production image, runs as `node`), `docker-compose.yml` (dev), `docker-compose.test.yml` (integration), `docker-compose.prod.yml` + `Caddyfile` (optional self-hosting), `scripts/check-dist.sh` (fails on inline script/style or source maps), `scripts/check-dist.test.sh` (its fixture test), `scripts/smoke.sh`.
- **`backend/src/`:** `server.ts` (thin startup wiring, keep-alive timeouts of 65s/66s; don't lower them), `lifecycle.ts` (testable migrate-or-exit and clean shutdown; migrations use their own pool without the 5 s timeouts), `app.ts` (builds the Express app with no side effects), `config.ts` (validates env vars), `db.ts` (pool, shared `Db` type), `migrate.ts`, `visitor.ts` (the `ex3_visitor` cookie), `security.ts` (headers, rate limits, `Origin` check), `staticSite.ts` (serves the build in production), `routes/health.ts`, `routes/favorites.ts`.
- **`backend/tests/`:** `unit/` (no database) and `integration/` (real PostgreSQL in Docker).
- **`frontend/src/`:**
  - Setup and routing: `main.tsx` (one line: calls `startApp`), `startApp.tsx` (applies the theme, then mounts React, i18n, router, TanStack Query; tested in `startApp.test.tsx`), `queryClient.ts` (reads retry once, never on a 4xx), `paths.ts` (`PATHS`), `routes.tsx` (pages sit inside an `errorElement` route that shows `ErrorPage`).
  - Data and text: `api/favorites.ts` (endpoint calls with checked data), `i18n/` (`en.json`, `translate.ts`, `fillSlots.tsx` for links inside a sentence), `context/` (`I18nProvider`, `useI18n()`).
  - `styles/`: `_palette.scss`, `_tokens.scss`, `themeInvariant.ts` (the dark-block opt-out marker), convention and contrast tests.
  - `theme/`: `theme.ts` (pure: `parseTheme`, `resolveTheme`, `toggleTheme`), `themeStorage.ts` (`localStorage` key `ex3.theme`, `systemPrefersDark`, `watchSystemTheme`, `watchStoredTheme` (other tabs), `applyTheme`, `initialTheme`, `bootstrapTheme`) and `useTheme.ts`. `startApp` calls `bootstrapTheme()` before rendering.
  - `components/`:
    - Layout: `AppLayout`, `Navbar`, `ColumnLayout`, `usePageTitle.ts`, `NewTabLink` (links that open a new tab), `ThemeToggle` (the dark mode switch in the nav bar).
    - Spinner and cards: `FrogSpinner`, `FrogCard`, `frogEntries.ts` (entries, card tones, `IMAGES`), `frogReel.ts` (pure reel maths), `frogExpansion.ts` (pure open/close rules), `useCardExpansion.ts` + `ExpandableFrogCard.tsx`.
    - Favorites: `FavoriteButton` + `useFavorite.ts`, `FavoritesPanel` + `favoritesTabs.ts` (pure tab keyboard rule), `FavoritesStatus` (announces failed saves, on every page).
  - `pages/`: `HomePage`, `FrogLibraryPage`, `AboutPage`, `NotFoundPage`, `ErrorPage` (shown when a page fails to render; the nav bar stays), `contactLinks.ts`, `aboutContent.ts` (pure: the About page's list order, from `en.json`'s key order, and who does each step).
  - `test/`: jsdom and browser setup, MSW server and handlers, `favoritesFake.ts`, `matchMedia.ts` (`fakeMatchMedia`), `renderWithProviders` (also returns its `queryClient`), `renderApp.tsx` (mounts the real routes for browser tests; `routesWithPage` adds a test page), `browserHelpers.ts` (shared layout helpers), `viewports.ts`, `axe.ts` (`expectNoAxeViolations`), `textSpacing.ts` (WCAG 1.4.12 overrides).

Keep pure logic (such as `frogReel.ts` and `frogExpansion.ts`) separate from React hooks and components, so it can be unit tested.

## How requests flow

- **Dev:** browser → Vite dev server (proxies `/api`) → Express → PostgreSQL.
- **Production:** one container. Express serves the built app and the API behind the host's TLS proxy, in front of a managed PostgreSQL.
- **Favorites:** a heart press updates every heart for that frog optimistically, then sends `PUT` (like) or `DELETE` (unlike) to `/api/favorites/:entryId` with the cookie. The backend answers with the new count, and the page refetches `GET /api/favorites/mine` and `/top`. On failure the heart flips back and `FavoritesStatus` announces it.
- **Health:** `/api/health` runs `SELECT 1`. It's used by the Docker health check and the smoke test, not by the page.

## Frontend conventions (enforced by tests)

`styleConventions.test.ts` and `noHardcodedText.test.tsx` enforce the first four of these, and the dark-block rule.

- **Colours:** literals (`#hex`, `rgb()`, and colour keywords like `green` or `blue`) appear only in `src/styles/_palette.scss`. Each component maps palette colours to roles once, in a `.d-<component>` block of custom properties named `--<text|surface|border|shadow>-color-<component>[-<part>][-<state>]`.
- **Dark block:** every `.d-<component>` block is followed by a `:root[data-theme="dark"] .d-<component>` block that sets exactly the same roles, even where the value is unchanged. Components keep reading `var(--x)`. The CSS keys off the attribute only, never `@media (prefers-color-scheme)`. A new role needs a dark value, or the parity test fails. The one opt-out: a sheet whose colours are the same in both themes starts with `// theme-invariant: <reason>` and has no dark block (only `ThemeToggle.scss` today). `styles/themeInvariant.ts` reads the marker for both `styleConventions.test.ts` and `theme.browser.test.tsx`, which checks that an invariant component's roles really stay the same, and that every other component changes at least one. Adding a new opt-out also means updating the expected list in both tests.
- **Sizes:** use `rem` (or `fr`, `%`, `vw`, `dvh`, `clamp()`) with tokens from `src/styles/_tokens.scss`. The only `px` allowed is a `1px` hairline.
- **Text:** every user-facing string, including `aria-label`s and page titles, goes in `src/i18n/en.json` and is read with `t()` from `useI18n()`. No hard-coded text.
- **Class names:** a component root has `d-<name>` (colours) and `<name>` (layout). Child classes start with the component name. Exception: `NewTabLink` has no styles and no `.scss`; the caller passes its own link class.
- **Styles:** one `.scss` file per component, next to it, starting with `@use "../styles/palette" as p;` and/or `@use "../styles/tokens" as t;`.
- **Mixins:** use the ones in `_tokens.scss` instead of re-implementing them. `wide-layout` holds the one breakpoint: three columns above 64rem, stacked rows (Middle, Left, Right) at 64rem and below. `button-shape` is for buttons and nav links. `panel` gives the rounded, bordered look; the page sets its own `background-color`, `border-color` and heading colour.

## Colour

- The palette comes from four anchors: Burnt Sienna `#984216`, Ivory Sand `#E4D6C5`, Stormy Sky `#78898F` and Sage Green `#8D957E`. Other shades are lighter or darker versions of the same hues. Only shades the site uses are in the file, except `sienna-750` and `sienna-800`, which are unused but kept on purpose (too dark for text on the dark page, too saturated for large surfaces).
- The main colour is `sage-800` (`#3b422e`), used for the nav bar, buttons, payline, hearts, headings and the selected tab, with `sage-900` for hover. The page background is `sand-100`. Body text is `sky-900`. Focus rings are `sky-700` (`sand-300` on the nav bar).
- Dark mode is keyed by `<html data-theme="light|dark">`, set by JS. The first theme follows the browser (live, until the visitor uses the switch). The switch's choice is remembered in `localStorage` (`ex3.theme`), like the panel tab, and the stored value is checked against an allow-list (`parseTheme`) before it touches the DOM. `color-scheme` (in `AppLayout.scss` and the `index.html` meta) makes native parts follow.
- A choice made or cleared in another tab applies straight away (the `storage` event, `watchStoredTheme`).
- Switching is atomic: `applyTheme` sets `data-theme-switching` for a moment, and `AppLayout.scss` turns transitions off while it is set, so nothing fades through low-contrast in-between colours. The switch thumb's slide is the one motion kept (`ThemeToggle.scss`).
- `<html>` has its own background (`AppLayout.scss`) so overscroll shows the page colour. It must equal `--surface-color-app-layout` in each theme, and `theme.browser.test.tsx` checks that it does.
- Dark mode's accent is Burnt Sienna (`sienna-300` for headings in sand panels, links, hearts, the selected tab bar and the Spin button; `sienna-400` for the payline). The page is `sky-950`, text is `sand-100`, and the nav bar is `sage-900`. Columns and cards are one step lighter shades of their own family. Shades are still lighter or darker versions of the four anchor hues.
- Card surfaces against panels (about 1.2:1), panel borders (about 1.4:1) and the spinner window border (`sage-500`, about 2.9:1) are below 3:1 on purpose. Cards are identified by their title text, and the window border is decoration. Don't "fix" them.

## Accessibility (WCAG 2.x AA)

- New colour pairings must meet AA: 4.5:1 for text, 3:1 for non-text. Add each one to `frontend/src/styles/contrast.test.ts`: `LIGHT_PAIRINGS`, `DARK_PAIRINGS`, or `TOGGLE_PAIRINGS` (the switch, checked on both nav bar colours). Dark mode needs its own pairings, so a new colour usually needs one in each list.
- **A new page or UI state gets a case in `src/a11y.browser.test.tsx`** (axe scans at a phone and a laptop size, in both themes, plus text-spacing overrides on the Frog Library and the About page; axe can't see clipped text, so `AboutPage.browser.test.tsx` also checks that nothing clips under those overrides). One deliberate exception: `target-size` is skipped while the landed card is open, because it floats over the Spin button on purpose. It closes on an outside click, Escape, or focus moving away.
- Layout browser tests (`layout.browser.test.tsx`) cover 9 viewport sizes from `test/viewports.ts`.
- Cards other than `fitsRow` cards must grow to show their whole title (WCAG 1.4.12). Only the spinner's landed card and concealed reel cards (`fitsRow`) are one row tall, with titles cut at two lines. The full name appears in the status line.
- The home page's DOM and Tab order (Middle, Left, Right) differs from the visual order (Left, Middle, Right) on purpose. Don't reorder it.

## Pages and navigation

- A new page needs:
  - a route in `routes.tsx`
  - its URL in `paths.ts` (`PATHS`)
  - exactly one `<main tabIndex={-1}>` with an `aria-label` from the same key as its title
  - a `usePageTitle('<key>')` call (with no key it shows the site name only, as on Home; the format is `app.pageTitle` in `en.json`)
  - an entry in `NAV_ITEMS` in `Navbar.tsx`, if it belongs in the nav
- After every navigation, including Back and Forward, `AppLayout` scrolls to the top and focuses `<main>`. `AppLayout` sets the page language, not the title.
- The nav bar has links only. Every `NAV_ITEMS` entry needs a `to`. The nav bar hides the link to the current page.
- The dark mode switch (`ThemeToggle`) is not a nav item. It sits after `<nav>`, inside the `.navbar-end` wrapper, always rightmost. At very large text `.navbar-end` wraps (it overflowed at 200%), and the switch stays rightmost after wrapping. It is a `role="switch"` button named "Dark mode" (the name never changes; `aria-checked` carries the state).
- Links that open a new tab use `NewTabLink` (`components/NewTabLink.tsx`; pass `pdf` for a PDF link, and the caller's link class as `className`).

## Frogs (spinner entries)

- Entries live in `frontend/src/i18n/en.json` under `frogSpinner.entries`. Each has a `title` (must be unique) and a `blurb`. The file order is the reel order. The ids (`entry01`...) never appear on screen.
- The Frog Library shows the same entries, all open, in the same order and colours.
- Card colours are assigned automatically, so neighbouring cards always differ.
- Adding or removing a frog also needs a **new numbered migration** that inserts it into or deletes it from `frogs` (for example `INSERT INTO frogs (id, position) VALUES ('entry21', 21);`). `seedFrogs.test.ts` checks that the seed plus later migrations match `en.json`. Removing a frog removes its likes.
- Images go in `frontend/src/assets/frog-entries/` (about 160px square, WebP, since each appears five times on the reel). Import each one in `frogEntries.ts` and add it to `IMAGES`. Images are decorative (`alt=""`) unless they add information, in which case their alt text goes in `en.json`.

## Favorites

- The heart is the only way to favorite a frog. Landing on one in the spinner never does.
- Visitors are anonymous. On the first like, the backend sets an `ex3_visitor` cookie: a random ID signed by the server, `HttpOnly`, `SameSite=Lax`, `Path=/api`, lasting 400 days and renewed on each like. Reading lists never sets it. An unsigned or forged ID counts as no cookie.
- The only data stored is the visitor ID and which frogs it liked, with timestamps. No IP addresses or user agents.
- Each ID can like each frog once, and counts never go negative. Only frogs in the `frogs` table can be liked.
- The panel tab choice is remembered in `localStorage`.

## Backend and database

- Migrations are numbered `.sql` files in `backend/migrations/`, applied in order at startup, each in a transaction, and recorded in `schema_migrations`. A failure stops the backend. **Never edit an applied migration.** Add the next number instead. The seed (`002_seed_frogs.sql`) never runs again.
- Tables: `frogs` (id, display position) and `favorites` (one row per visitor and frog). A frog's tally is its row count.
- Env vars are validated in `config.ts`, and bad values stop startup:
  - `COOKIE_SECURE` must be `true` over HTTPS, and `true` also turns on HSTS.
  - `NODE_ENV=production` refuses `COOKIE_SECURE=false`, a missing `VISITOR_SECRET`, and a database without TLS (unless `DATABASE_PRIVATE_NETWORK=true`). It also turns on the rate limits and the `Origin` check.
  - `TRUST_PROXY` is a hop count, never `true`.
  - `DATABASE_URL` accepts only `sslmode=verify-full`, or no `sslmode` together with `DATABASE_CA_CERT` or `DATABASE_PRIVATE_NETWORK=true`.
  - `STATIC_DIR` is set only in the production image.
  - Error messages must never print the database URL.
- In production, `/assets/*` is cached for a year (`immutable`), `index.html` is `no-cache`, and all of `/api` is `no-store`. Page URLs return `index.html`. `/api/*`, `/assets/*` and any path whose last segment contains a dot get a JSON 404.

## Security (keep intact)

- Strict CSP (`default-src 'none'`, no `'unsafe-inline'`). Never add inline scripts or styles. Fix the code, not the CSP.
- `frame-ancestors 'none'` and `X-Frame-Options`. No CORS headers. `PUT`/`DELETE` requests with a foreign `Origin` get a `403`.
- Production rate limits per address: 600 API requests and 60 likes/unlikes per 15 minutes, and 30 new visitors per hour. Request bodies are capped at 10 KB, and database queries have timeouts.
- No `X-Powered-By`, only generic error messages, no source maps. The container runs as `node`, and the image contains no source or `.env`.
- Never disable database certificate verification.

## Plan Documents

- Plans are `.md` files kept **outside the repo**, in a sibling directory named `<repo name>_Plans` (for this repo, `../EX3_Plans/`). Create it if it doesn't exist. Never put plans inside the repo. Name new ones `<Feature> Implementation Plan.md`.
- Write plans for a junior developer, explaining both HOW and WHY for each step.
- When reviewing a plan, check it against the actual code and current package versions and APIs, and give numbered findings.
- Save a backup before rewriting a plan, and flag conflicts with companion plans in the same `_Plans` directory.

## Docs

When behaviour, commands or conventions change, update this file, and update `README.md` if it covers the same thing.

- Don't copy rules from this file into `README.md`. Link to the section instead. The README keeps only what a person needs to run, test, configure, deploy or debug the site, plus the contrast tables and architecture diagrams.
- README screenshots live in `docs/screenshots/`. If a change alters the home page's look noticeably, retake the affected shots in the same change.
