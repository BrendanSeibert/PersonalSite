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

Then open <http://localhost:5173>. You should see a dark-green nav bar ("Brendan Seibert" on the left; Home, Pick a Frog and About on the right) above three columns, with "Hello, world" in the middle one and, within a second, "API ok, database up". The API is also available directly at <http://localhost:3000/api/health>.

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
| Only `src/styles/_palette.scss` contains colour literals (`#hex`, `rgb()`, colour names) | `$green-800: #1a4a2e;` |
| Each component maps palette colours to roles once, in a `.d-<component-name>` block of custom properties | `.d-navbar { --surface-color-navbar: #{p.$green-800}; }` |
| Custom property names follow `--<text\|surface\|border\|shadow>-color-<component>[-<part>][-<state>]` | `--text-color-navbar-button-hover` |
| Sizes use `rem` (or `fr`, `%`, `vw`, `dvh`, `clamp()`), with tokens from `src/styles/_tokens.scss`. The only `px` allowed is a `1px` hairline | `padding: t.$space-3 t.$space-5;` |
| Every user-facing string, including `aria-label`s and the page title, lives in `src/i18n/en.json` and is read with `t()` from `useI18n()` | `t('navbar.pickAFrog')` |
| A component's root has both classes, `d-<name>` (colours) and `<name>` (layout); child classes start with the component name | `<header className="d-navbar navbar">`, `.navbar-button` |
| One `.scss` file per component, next to it, starting with `@use "../styles/palette" as p;` and/or `@use "../styles/tokens" as t;` | `Navbar.tsx` imports `./Navbar.scss` |

The three-column layout switches to stacked rows (Middle, Left, Right) at 64rem (1024px at default text size) and below. That rule lives in one mixin, `wide-layout` in `_tokens.scss`.

## Spinner content

The frog spinner in the "Highlights" column reads its entries from `frontend/src/i18n/en.json`, under `frogSpinner.entries`.

- **Text:** each entry has a `title` and a `blurb` (the description shown when the card opens). The order in the file is the order on the reel. Titles must be unique (a test checks this). The ids (`entry01`...) never appear on screen.
- **Adding or removing an entry:** edit `en.json`. Card colours are assigned automatically so neighbouring cards always differ.
- **Images:** put the file in `frontend/src/assets/frog-entries/`, import it at the top of `frontend/src/components/frogEntries.ts`, and add it to `IMAGES` there. Keep images small (about 160px square, WebP), because each one appears five times on the reel strip. Images are decorative (`alt=""`) for now; if a picture adds information the title doesn't, give it alt text in `en.json`.

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
│   │   ├── db.ts              creates the PostgreSQL connection pool
│   │   └── routes/health.ts   GET /api/health
│   └── tests/
│       ├── unit/              fast tests, no database
│       └── integration/       tests against a real PostgreSQL in Docker
└── frontend/
    ├── Dockerfile
    ├── vite.config.ts         dev server, /api proxy, Vitest projects (unit, browser)
    └── src/
        ├── main.tsx           mounts React, i18n, router and TanStack Query
        ├── routes.tsx         the list of URLs and their pages, inside AppLayout
        ├── layout.browser.test.tsx   real-browser layout tests at 9 viewport sizes
        ├── api/health.ts      calls GET /api/health
        ├── styles/            _palette.scss (colours), _tokens.scss (sizes, breakpoint, mixins), convention tests
        ├── i18n/              en.json (every visible string), translate.ts, no-hard-coded-text test
        ├── context/           I18nProvider and useI18n()
        ├── components/        AppLayout, Navbar, ColumnLayout, HealthStatus (each with .scss and tests)
        │   ├── FrogSpinner.tsx       the reel, "Get a frog" button and status line (+ .scss, tests, browser tests)
        │   ├── FrogCard.tsx          one rounded, coloured card: image slot, title, optional description
        │   ├── frogEntries.ts        the entry list from en.json, card tones, image map
        │   ├── frogReel.ts           pure reel maths: next pick, resting and landing rows
        │   └── frogExpansion.ts      pure open/close rules for the landed card (hover, click, tap, keys)
        ├── pages/             HomePage, NotFoundPage
        └── test/              test setup (jsdom and browser), MSW server and handlers, renderWithProviders,
                               viewports.ts (the viewport table shared by the browser tests)
```

## How a request flows

The browser loads the React app from the Vite dev server. React Router shows the home page. The home page uses TanStack Query to call `GET /api/health`. Vite forwards any `/api` request to the Node backend. The backend runs a trivial query (`SELECT 1`) against PostgreSQL and returns `{"status":"ok","db":"up"}`. TanStack Query hands that result to the page, which shows it in a small status line.

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
- **A convention test flags `green` or `blue` in a stylesheet:** bare colour keywords count as colour literals. Name the thing by role or mood instead (like the card tones `sand`, `meadow` and `sky`).
- **Frontend `npm test` fails with "Vitest failed to find the runner" on the very first run after `npm ci`:** run it again. This was seen intermittently on Windows right after a fresh install and did not recur. It has also been seen on every run from Git Bash and never from PowerShell; if it keeps happening, run the tests from PowerShell.
