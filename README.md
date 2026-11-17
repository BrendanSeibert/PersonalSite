# EX3: Hello World full-stack slice

A thin vertical slice that proves every layer of the stack is wired together: a React page asks a Node.js API for its health, and the API asks PostgreSQL. Everything runs locally with one Docker command.

**Stack:** React 19 + Vite 8, React Router 8, TanStack Query 5 (frontend) · Node.js 22, Express 5, TypeScript, `pg` (backend) · PostgreSQL 16 · Docker Compose · Vitest, Supertest, React Testing Library, MSW (tests).

## Prerequisites

- Docker Desktop (on Windows, with the WSL 2 backend enabled)
- Git
- Node.js 22 LTS, only needed to run the unit tests outside Docker

## First-time setup

```powershell
cp .env.example .env
```

The values in `.env.example` are for local development only. Keep the password to letters, numbers, `-` and `_` (it goes inside a connection URL).

## Start everything

```powershell
docker compose up --build
```

Then open <http://localhost:5173>. You should see a dark green nav bar ("Brendan Seibert" on the left; Frog Library and About on the right) above three columns, with "Hello, world" in the middle one and, within a second, "API ok, database up". The right column is the favorites panel, headed by two tabs: **Your Favorites** and **All Time Favorites**. The API is also available directly at <http://localhost:3000/api/health>.

Add `-d` to run in the background.

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

**Backend integration tests** (real PostgreSQL in a throwaway Docker stack; no local install needed). Run both lines; the second always cleans up:

```powershell
docker compose -p ex3-test -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-tests
docker compose -p ex3-test -f docker-compose.test.yml down -v
```

The first command's exit code is the test result (0 = passed).

Do not chain these commands with `&&` in Windows PowerShell 5.1; it is a parse error there. Run them one per line.

## Styling and text conventions

The frontend follows a few rules, and `npm test` in `frontend/` enforces the first four (`styleConventions.test.ts` and `noHardcodedText.test.tsx`).

| Rule | Example |
| --- | --- |
| Only `src/styles/_palette.scss` contains colour literals (`#hex`, `rgb()`, colour names) | `$sage-800: #3b422e;` |
| Each component maps palette colours to roles once, in a `.d-<component-name>` block of custom properties | `.d-navbar { --surface-color-navbar: #{p.$sage-800}; }` |
| Custom property names follow `--<text\|surface\|border\|shadow>-color-<component>[-<part>][-<state>]` | `--text-color-navbar-link-hover` |
| Sizes use `rem` (or `fr`, `%`, `vw`, `dvh`, `clamp()`), with tokens from `src/styles/_tokens.scss`. The only `px` allowed is a `1px` hairline | `padding: t.$space-3 t.$space-5;` |
| Every user-facing string, including `aria-label`s and the page title, lives in `src/i18n/en.json` and is read with `t()` from `useI18n()` | `t('navbar.frogLibrary')` |
| A component's root has both classes, `d-<name>` (colours) and `<name>` (layout); child classes start with the component name | `<header className="d-navbar navbar">`, `.navbar-link` |
| One `.scss` file per component, next to it, starting with `@use "../styles/palette" as p;` and/or `@use "../styles/tokens" as t;` | `Navbar.tsx` imports `./Navbar.scss` |

The three-column layout switches to stacked rows (Middle, Left, Right) at 64rem (1024px at default text size) and below. That rule lives in one mixin, `wide-layout` in `_tokens.scss`. The same file holds the shape-only mixins: `button-shape` for buttons and nav links, and `panel` for the rounded, bordered panels (the home page's columns, the Frog Library and About panels). A page that wants the panel look uses `@include t.panel;` and sets its own `background-color`, `border-color` and heading colour.

## Colour

The palette (`frontend/src/styles/_palette.scss`) is built from four anchor colours: Burnt Sienna `#984216`, Ivory Sand `#E4D6C5`, Stormy Sky `#78898F` and Sage Green `#8D957E`. The other shades are the same hues made lighter or darker. Only the shades the site uses are in the file, with one exception: Burnt Sienna's shades (`sienna-750`, `sienna-800`) stay in the palette file but aren't used at the moment, so sienna can come back (for example as an accent) without re-deriving them. Sage Green is the main colour, used at `sage-800` (`#3b422e`) for the nav bar, buttons, payline, hearts, headings and the selected tab, with `sage-900` (`#292f1e`) for hover. The page background is an off-white sand (`sand-100`) rather than near-white. Every pairing meets WCAG AA: 4.5:1 for text, and 3:1 for focus rings, button outlines, the payline and the selected tab's bar.

| Where | Foreground on background | Contrast |
| --- | --- | --- |
| Body text on the page, the columns and the cards | `sky-900` on `sand-100`, `sand-150`, `sage-100`, `sky-100`, `sand-200`, `sage-200`, `sky-200` | 10.4 to 13.3 |
| Column headings (middle, left, right; the Frog Library and About headings match the middle) | `sage-800` on `sand-150`, `sage-800` on `sage-100`, `sky-800` on `sky-100` | 8.7, 9.4, 9.9 |
| Page-not-found heading | `sage-800` on `sand-100` | 9.2 |
| Status lines (health, spinner result) | `sky-700` on `sand-150`, `sage-800` on `sage-100` | 7.0, 9.4 |
| Nav bar title and buttons | `sand-50` and `sand-100` on `sage-800` | 10.0, 9.2 |
| Nav button on hover | `sage-900` on `sand-200` | 9.7 |
| "Get a frog" button, and on hover | `sand-50` on `sage-800`, on `sage-900` | 10.0, 13.1 |
| "Get a frog" button outline against its column | `sage-800` on `sage-100` | 9.4 (needs 3) |
| Nav button outline and focus ring | `sand-300` on `sage-800` | 6.2 (needs 3) |
| Page focus ring | `sky-700` on any page or column surface | 7.0 or more (needs 3) |
| Payline | `sage-800` on `sand-50` | 10.0 (needs 3) |
| Favorite heart (outline and fill) | `sage-800` on the card tones `sand-200`, `sage-200`, `sky-200` | 7.3, 8.3, 7.9 (needs 3) |
| Favorites tabs: text, and on hover | `sky-700` on `sky-100`, on `sky-200` | 7.5, 6.4 |
| Favorites tabs: selected text | `sky-900` on `sky-100` | 13.1 |
| Favorites tabs: the selected tab's bar | `sage-800` on `sky-100` | 9.2 (needs 3) |

`frontend/src/styles/contrast.test.ts` checks every row; add new pairings there too. When you add a colour pairing, check it with a contrast checker before using it, and add it here.

## Spinner content

The frog spinner in the "Frog Spinner" column reads its entries from `frontend/src/i18n/en.json`, under `frogSpinner.entries`.

- **Text:** each entry has a `title` and a `blurb` (the description shown when the card opens). The order in the file is the order on the reel. Titles must be unique (a test checks this). The ids (`entry01`...) never appear on screen.
- **Adding or removing an entry:** edit `en.json`. Card colours are assigned automatically so neighbouring cards always differ. Until an admin page exists, the backend must also know the frog: add a new numbered migration that inserts its row into `frogs` (for example `backend/migrations/004_add_entry21.sql` with `INSERT INTO frogs (id, position) VALUES ('entry21', 21);`), or one that deletes it. Removing a frog removes its likes. The seed (`002_seed_frogs.sql`) is the initial crop only and never runs again; `seedFrogs.test.ts` checks that the seed plus every later frog migration (such as `004_remove_entry20.sql`) leaves exactly the frogs in `en.json`.
- **The Frog Library page** (`/frog-library`) shows the same entries, every one fully open, in the same order and the same colours, so editing `en.json` updates both the reel and the library.
- **Images:** put the file in `frontend/src/assets/frog-entries/`, import it at the top of `frontend/src/components/frogEntries.ts`, and add it to `IMAGES` there. Keep images small (about 160px square, WebP), because each one appears five times on the reel strip. Images are decorative (`alt=""`) for now; if a picture adds information the title doesn't, give it alt text in `en.json`.

## Favorites

Every card that names its frog (the Frog Library, the spinner's landed card, the favorites panel) has a heart in its top-right corner. Pressing it favorites that frog, or unfavorites it. The heart is the only way to favorite a frog: landing on one in the spinner never does.

- **How you are remembered, without a login:** on your first like, the backend sets an anonymous cookie, `ex3_visitor`: a random ID (`HttpOnly`, `SameSite=Lax`, `Path=/api`, 400 days, renewed on every like). Reading the lists never sets it. A private window, another browser or another device is a different visitor.
- **What is stored:** that random ID and the frogs it liked, with when. No IP address, no user agent, nothing about you.
- **Clearing cookies** forgets your favorites, but your likes stay in the all-time tally: "All Time" means everyone who ever liked a frog.
- **The tally is for fun.** Anyone can clear cookies and like again; each ID can like each frog once, and counts can't double count or go negative. Nothing stops ballot stuffing, so don't use the counts for anything that matters.
- **The panel** (the home page's right column) shows Your Favorites, or the All Time top ten with counts, chosen by the two tabs across its top, which serve as its header (remembered in this browser's `localStorage`). A long list scrolls inside the panel.
- **Endpoints:** `GET /api/favorites/mine`, `GET /api/favorites/top`, `PUT /api/favorites/:entryId` (like) and `DELETE /api/favorites/:entryId` (unlike). Only frogs in the `frogs` table can be liked.

## Settings

`.env` (copied from `.env.example`) holds the database name, user and password, the backend port, and:

- **`COOKIE_SECURE`** (`true` or `false`, default `false`): the visitor cookie's `Secure` flag. Keep `false` for `http://localhost`. It **must be `true`** on any server reached over HTTPS, so the cookie is never sent over plain HTTP. Any other value stops the backend at startup.

## Database

- **Migrations** live in `backend/migrations/`, as numbered `.sql` files (`001_...`, `002_...`). The backend applies new ones in order when it starts, each in a transaction, and records them in `schema_migrations`; if one fails, the backend logs it and stops. To change the database, add the next number. Never edit a migration that has been applied; add a new one.
- **`frogs`** is the backend's list of which frogs exist (id and display position), seeded with the initial 20. There may be more or fewer later.
- **`favorites`** has one row per like (visitor, frog), referring to `frogs`. A frog's tally is its number of rows.

## Pages and navigation

- The pages are Home (`/`), the Frog Library (`/frog-library`) and About (`/about`).
- Every page's URL lives in `frontend/src/paths.ts` (`PATHS`). The routes and the nav bar both read it, so changing a URL is one line.
- A new page needs a route in `routes.tsx`, exactly one `<main tabIndex={-1}>` (after each navigation, Back and Forward included, `AppLayout` scrolls to the top and focuses that `<main>`), and, if it belongs in the nav bar, an item in `NAV_ITEMS` in `Navbar.tsx`.
- The nav bar is links only: every item in `NAV_ITEMS` must have a `to` (an item without one fails to compile).
- The nav bar hides the link to the page you are on: no Home on the home page, no Frog Library on the library, no About on the About page. On any other URL, all three links show.
- After a navigation, Tab moves forward from the page's `<main>` into its content; Shift+Tab goes back to the nav bar.

## Project layout

```text
EX3/
├── README.md
├── .env.example               sample settings (copy to .env, never commit .env)
├── docker-compose.yml         dev stack: db + backend + frontend
├── docker-compose.test.yml    integration test stack: test db + backend tests
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── server.ts          starts the server, handles clean shutdown
│   │   ├── app.ts             builds the Express app (no side effects, easy to test)
│   │   ├── config.ts          validates environment variables
│   │   ├── db.ts              creates the PostgreSQL connection pool; the shared Db type
│   │   ├── migrate.ts         applies new migrations in order at startup
│   │   ├── visitor.ts         reads and issues the anonymous ex3_visitor cookie
│   │   └── routes/            health.ts (GET /api/health), favorites.ts (the four favorites endpoints)
│   ├── migrations/            numbered .sql files: the frogs and favorites tables, the seed, and later frog changes (004 removes entry20)
│   └── tests/
│       ├── unit/              fast tests, no database
│       └── integration/       tests against a real PostgreSQL in Docker
└── frontend/
    ├── Dockerfile
    ├── vite.config.ts         dev server, /api proxy, Vitest projects (unit, browser)
    └── src/
        ├── main.tsx           mounts React, i18n, router and TanStack Query
        ├── paths.ts           every page's URL (PATHS), shared by the routes and the nav bar
        ├── routes.tsx         the list of URLs and their pages, inside AppLayout
        ├── layout.browser.test.tsx   real-browser layout tests at 9 viewport sizes
        ├── api/               health.ts (GET /api/health), favorites.ts (the favorites endpoints, checked data)
        ├── styles/            _palette.scss (colours), _tokens.scss (sizes, breakpoint, mixins), convention and contrast tests
        ├── i18n/              en.json (every visible string), translate.ts, no-hard-coded-text test
        ├── context/           I18nProvider and useI18n()
        ├── components/        AppLayout, Navbar, ColumnLayout, HealthStatus (each with .scss and tests)
        │   ├── FrogSpinner.tsx       the reel, "Get a frog" button and status line (+ .scss, tests, browser tests)
        │   ├── FrogCard.tsx          one rounded, coloured card: image slot, title, optional description
        │   ├── frogEntries.ts        the entry list from en.json, card tones, image map
        │   ├── frogReel.ts           pure reel maths: next pick, resting and landing rows
        │   ├── frogExpansion.ts      pure open/close rules for the landed card (click, tap, keys)
        │   ├── useCardExpansion.ts   those rules as a hook; ExpandableFrogCard.tsx uses it (spinner and panel)
        │   ├── FavoriteButton.tsx    the heart: a toggle button; useFavorite.ts holds its state and saves
        │   ├── FavoritesPanel.tsx    the home page's right column: Your Favorites / All Time Favorites
        │   └── FavoritesStatus.tsx   announces a heart that couldn't be saved (in AppLayout, every page)
        ├── pages/             HomePage, FrogLibraryPage and AboutPage (each + browser tests), NotFoundPage
        └── test/              test setup (jsdom and browser), MSW server and handlers, favoritesFake.ts, renderWithProviders,
                               viewports.ts (the viewport table shared by the browser tests)
```

## How a request flows

The browser loads the React app from the Vite dev server. React Router shows the home page. The home page uses TanStack Query to call `GET /api/health`. Vite forwards any `/api` request to the Node backend. The backend runs a trivial query (`SELECT 1`) against PostgreSQL and returns `{"status":"ok","db":"up"}`. TanStack Query hands that result to the page, which shows it in a small status line.

Favorites flow the same way. Pressing a heart updates every heart for that frog at once, then sends `PUT` (like) or `DELETE` (unlike) to `/api/favorites/<frog>`, with the `ex3_visitor` cookie. The backend checks the frog exists, stores or removes one row, and answers with the new count; the page then refetches your list and the top ten. If the save fails, the heart flips back and the page announces it.

```text
Browser (React) --> Vite dev server --/api--> Node + Express --SELECT 1--> PostgreSQL
                    (frontend container)      (backend container)        (db container)
```

## Troubleshooting

- **Port already in use:** stop whatever uses 5173, 3000 or 5432, or change *your* side of the `ports:` mapping in `docker-compose.yml` (the middle number in `"127.0.0.1:5173:5173"`). Keep the `127.0.0.1:` at the front.
- **"password authentication failed" when connecting from Windows, although `.env` is correct:** a PostgreSQL installed directly on Windows is probably answering on port 5432 instead of the Docker one. Run `netstat -ano | findstr :5432`. Either stop that service (Windows "Services" app, `postgresql-...`, set to Manual) or map the Docker database to `"127.0.0.1:5433:5432"` and connect on 5433.
- **Backend logs show "host not found", "getaddrinfo ENOTFOUND" or "Invalid URL" right after you changed the password:** the password contains a character that breaks the URL (`@ : / # ? %`). Use only letters, numbers, `-` and `_`, then run `docker compose down -v` (see the last entry).
- **The app works on your machine but not from your phone or another computer:** this is intentional. All ports are bound to `127.0.0.1` so the dev servers are not reachable from the network. Do not remove that to "fix" it.
- **Page loads but says "API unavailable":** run `docker compose logs backend`. The health check logs the real reason on a line starting with `Health check: database query failed`.
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
- **Frontend `npm test` fails with "Vitest failed to find the runner" on the very first run after `npm ci`:** run it again. This was seen intermittently on Windows right after a fresh install and did not recur. It has also been seen on every run from Git Bash and never from PowerShell; if it keeps happening, run the tests from PowerShell.
