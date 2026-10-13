# California School Finder

Find, compare, and follow California schools: district, charter, and private. Everything shown comes from public files published by the California Department of Education and federal agencies. Nothing is estimated or editorialized.

What it does:

- **Search** by street address, city, ZIP code, or school name. A place lists the schools within a radius on a map and in a list, with filters for type, grades, programs, and California School Dashboard level. A name lists matching schools statewide.
- **School pages** with Dashboard ratings and test scores for three years (2023 to 2025), enrollment, directory facts, and nearby schools that serve the same grades.
- **Compare** up to five schools side by side. A value is highlighted only when it leads its row by a clear margin.
- **My schools**: a list of up to 50 schools to follow, with each indicator's level, result, and change from the year before. It is kept in the browser; there are no accounts.
- English and Spanish, light and dark themes, keyboard and screen-reader accessible (WCAG 2.2 AA).

- Game plan and workstreams: [docs/PLAN.md](docs/PLAN.md)
- Rules for contributors and agents: [AGENTS.md](AGENTS.md)
- Design system: [docs/design-system.md](docs/design-system.md)
- Data sources: [docs/data-sources.md](docs/data-sources.md)

## Stack

| Layer     | Choice                                                                               |
| --------- | ------------------------------------------------------------------------------------ |
| App       | Next.js 16 (App Router, Cache Components, TypeScript strict), React 19               |
| Styling   | Tailwind v4 over design tokens in `src/styles/tokens.css`; light and dark themes     |
| i18n      | `next-intl`, locale in the path (`/en`, `/es`)                                       |
| Backend   | Convex (storage, a plain grid index for radius search) behind a data-access boundary |
| Contracts | Zod schemas in `src/lib/schemas/`; every type is `z.infer`                           |
| Tests     | Vitest + Testing Library + axe for units and components, Playwright for e2e          |
| Hosting   | Vercel (app) and Convex cloud (backend); a Docker image for self-hosting             |

Pages are server components that fetch through the seven functions in `src/lib/data/index.ts`, by way of the cached wrappers in `src/lib/data/cached.ts`, and render. Business rules are pure functions in `src/lib/domain/`. Convex functions in `convex/` are thin. Imports run as scripts, never during a request.

## Setup

Requires Node 22 or newer and pnpm (the version is pinned in `package.json`; `corepack enable` picks it up).

```bash
pnpm install
cp .env.example .env.local
pnpm dev            # http://localhost:3000, redirects to /en
```

One setting in `.env.local` decides where school data comes from: the Convex address.

| Variable                 | Value | Notes                                                                                                 |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL` | empty | The app serves an in-memory sample of 40 real Sacramento-area schools. No backend needed.             |
|                          | URL   | The app reads that Convex deployment. Filled in by `pnpm convex` the first time it runs.              |
| `CONVEX_DEPLOYMENT`      | name  | The deployment's name, also filled in by `pnpm convex`. Used by the Convex CLI and the import script. |

To go back to the sample data, blank `NEXT_PUBLIC_CONVEX_URL` and restart the dev server.

To work against Convex, run `pnpm convex` in a second terminal; it pushes `convex/` to your dev deployment and regenerates `convex/_generated`.

## Commands

```bash
pnpm dev              # Next.js dev server
pnpm build            # production build
pnpm start            # serve the production build
pnpm check            # typecheck + lint + unit tests + format check; must pass before a PR
pnpm test             # Vitest, one run
pnpm test:watch
pnpm e2e              # Playwright smoke suite (builds and starts the app on port 3103)
pnpm e2e:ui           # same, in the Playwright UI
pnpm e2e:report       # open the last HTML report
pnpm format           # Prettier, writes
pnpm convex           # Convex dev loop
pnpm convex:codegen   # regenerate convex/_generated without the dev loop
pnpm run import <source>   # data import, see below (`pnpm import` is a different, built-in pnpm command)
npx next typegen      # regenerate route types after adding or moving a route
node scripts/make-icons.mjs   # rebuild favicon.ico and apple-icon.png from src/app/icon.svg
```

`pnpm check` needs the generated route types. If `tsc` cannot find `PageProps`, run `npx next typegen` first (`pnpm build` and `pnpm dev` also generate them).

## Importing data

Source files are downloaded by scripts on a developer machine, cached under `.cache/` (gitignored), validated row by row with the schemas in `src/lib/schemas/imports/`, and written to Convex in batches. CDE's site is never fetched during a request.

```bash
pnpm run import all                               # every source, statewide
pnpm run import history --years 2026 --dry-run    # check a new year's files without writing
pnpm run import history --years 2026              # Dashboard ratings and test scores for that year
pnpm run import dashboard --year 2025             # one source, one year
```

Always `pnpm run import`: plain `pnpm import` is pnpm's own lockfile command.

The entry point is `scripts/import.ts`. Every source, its URL, layout, refresh cadence, and the gotchas found while parsing it are in [docs/data-sources.md](docs/data-sources.md). Read it before touching an importer. Two things from it matter most:

- **`www.cde.ca.gov` rate-limits and CAPTCHAs automated downloads**, so the school directory file is fetched by hand and cached.
- **Convex bills every byte read and written**, with a monthly allowance (1 GB on the free plan). Imports are written to spend little: rows already stored are not rewritten, and only the schools a run changed are refreshed. See "What an import costs" in that document before running a statewide import.

`scripts/build-fixtures.ts` builds `src/fixtures/schools.json` from the same files; its header comment lists the arguments. That file is the sample data the app serves without a backend, what the UI is developed against, and the reference for the adapter tests.

The app lists every source at `/en/about/data`.

### Loading a new year on the live site

The state publishes test scores each fall and the Dashboard some weeks later. This is the routine for getting a new year onto a deployed site. It runs from a checkout of this repository on your own machine.

**Once: tell the script about the live site.** Create `.env.production.local` beside `.env.local` (Git ignores both) with four values:

```bash
CONVEX_DEPLOYMENT=...            # the Convex deployment the live site reads, as in .env.local
NEXT_PUBLIC_CONVEX_URL=...       # its address, as in .env.local
APP_URL=https://<your-site>      # where the site is deployed
REVALIDATE_SECRET=...            # the same value the deployed site has
```

A separate production Convex deployment also needs `CONVEX_DEPLOY_KEY`, a deploy key from the Convex dashboard, set in your shell.

**Each year, two commands.** Use the year the school year ends in.

1. Check the new files. This downloads and validates them and writes nothing, so it costs no Convex usage:

   ```bash
   pnpm run import history --years 2026 --dry-run
   ```

   In the summary, `rowsRejected` should be 0 and no indicator should be marked `<-- none`. If either is off, the state changed a file's layout: stop and fix the importer first. Each of the first three years loaded had one such quirk.

2. Load it. This writes to Convex, refreshes the search rows of the schools that changed, and clears the live site's page cache:

   ```bash
   pnpm run import history --years 2026 --env .env.production.local
   ```

   It should end with `Page cache cleared at https://<your-site>`.

Things to know:

- **Check Convex usage before step 2.** A new year costs a few hundred MB of database bandwidth, a large share of the free plan's monthly 1 GB.
- **Running step 2 again is safe.** Rows already stored are not written again, and the summary then reads `new or changed 0`.
- **If it ends with "Page cache not cleared"**, the secret in the file does not match the deployed site's, or `APP_URL` is wrong. The data is loaded all the same, and pages catch up on their own within a few hours.
- **Visitors see the load in progress** for the ten minutes or so it takes: a school page can show the new year for some indicators before others.
- **If the importer needs a code change**, deploy that first (Convex functions, then the web app), then load.
- The Dashboard files may not be posted yet when test scores are. `pnpm run import caaspp --year 2026 --env .env.production.local` loads test scores alone.
- Enrollment, meals, staffing, and the private school list are separate yearly files with their own commands; see [docs/data-sources.md](docs/data-sources.md). The public school directory has to be downloaded by hand.

## Tests

```bash
pnpm test             # unit, component, and Convex function tests
pnpm e2e              # end-to-end smoke suite
```

- Pure logic has a `*.test.ts` next to the module. Components have `*.test.tsx` with Testing Library, `user-event`, and `runAxe` from `src/test/a11y.ts`.
- Convex queries and import mutations run in memory with `convex-test` (`src/lib/data/convex-functions.test.ts`). Every query is checked against the sample-data adapter for every sample school, and imports are checked for writing and refreshing only what changed.
- `src/i18n/messages.test.ts` fails if `messages/es.json` and `messages/en.json` drift in keys or ICU arguments.
- Tests are deterministic and never reach a backend: no network, sample data only. Do not verify changes by running imports or repeated searches against a live Convex deployment; that spends its usage allowance.

### End-to-end

`e2e/smoke.spec.ts` walks the main flows in a real browser on the sample data: the home screen, searching by address, city, ZIP code and name, the map and its pins, filters, a school page with its by-year tables, compare, My schools, the language and theme controls, and phone-width layout. It also runs axe (WCAG 2.2 AA, serious and critical impact) on every page in light and dark.

`pnpm e2e` builds the app and starts it on port 3103 on the sample data (it blanks the Convex address); `playwright.config.ts` is the single place that configures this, and the first test fails if the suite can see a school that is not in the sample. To run against a server you already started, set `PLAYWRIGHT_BASE_URL`:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3103 pnpm e2e
```

First-time setup downloads Chromium:

```bash
pnpm exec playwright install chromium
```

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:

1. **check**: `next typegen`, `pnpm check`, `pnpm build`.
2. **e2e**: `pnpm build`, then the Playwright smoke suite against `pnpm start` on the sample data. Chromium and the Next.js build cache are cached between runs; the HTML report is uploaded on failure.

Both jobs use Node 22 and the pnpm version pinned in `package.json`.

## Deployment

- **App**: Vercel, importing this repository. Build command `pnpm build`. Set `NEXT_PUBLIC_CONVEX_URL` (or `CONVEX_URL`) to the Convex deployment's address, and `REVALIDATE_SECRET` so imports can clear cached pages.
- **Backend**: Convex cloud. `npx convex deploy` pushes `convex/` to a production deployment. A site can also point at the dev deployment, which avoids loading the data twice; then anything pushed with `pnpm convex` is live at once.
- **Imports** run from a developer machine against whichever deployment the env file names: `pnpm run import history --years 2026 --env .env.production.local`. See [docs/data-sources.md](docs/data-sources.md).

See the Hosting and Imports rows in [docs/PLAN.md](docs/PLAN.md) for the decisions behind this.

### Self-hosting with Docker

The image holds the web app only. School data lives in Convex, or in the sample data bundled with the app, so there is no database in the container.

```bash
docker build -t school-finder .
docker run -p 3000:3000 school-finder
```

That serves the 40 sample schools at <http://localhost:3000> with no backend and no secrets, which is enough to try the app. For real data, name the Convex deployment when the container starts:

```bash
docker run -p 3000:3000 \
  -e CONVEX_URL=https://<deployment>.convex.cloud \
  -e REVALIDATE_SECRET=<random string, 16+ characters> \
  school-finder
```

Or with Compose: `docker compose up --build`, with the same two values in a `.env` file beside `compose.yaml`. Compose starts the web app only; it does not create or run a Convex backend.

| Setting             | When     | Meaning                                                                                     |
| ------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `CONVEX_URL`        | at start | The Convex deployment's address. With it the app reads Convex; without it, the sample data. |
| `REVALIDATE_SECRET` | at start | Lets `pnpm run import` clear cached pages through `POST /api/revalidate`. Optional.         |
| `PORT`              | at start | Port the server listens on inside the container. Default 3000.                              |

Things to know:

- One image works with any deployment, because `CONVEX_URL` is read when the server starts. (`NEXT_PUBLIC_CONVEX_URL` also works but is fixed when the image is built.)
- The build downloads the font from Google, so it needs network access. Running the container does not, apart from Convex, the map tiles, and the address lookup.
- Cached pages live in the container's memory. With more than one container each has its own cache, and an import's cache clear reaches only the container that receives it; the others catch up within a few hours.
- The container runs as a non-root user and reports its health on `/en`.
- The image is about 300 MB. There is no separate setting for where data comes from: the address is the switch.
- Imports are not part of the image. Run them from a checkout of this repository, with `APP_URL` set to where the container is reachable.

## Project layout

```
convex/              Convex schema, thin queries, import mutations
docs/                PLAN.md, data-sources.md, design-system.md
e2e/                 Playwright smoke suite
messages/            en.json and es.json
scripts/             import.ts and its sources, build-fixtures.ts, make-icons.mjs
src/app/[locale]/    routes: /, /school/[cds], /compare, /my-schools, /about/data, /styleguide
src/components/      header, theme and locale controls, ui primitives
src/features/        search, school, compare, my-schools: each feature's components and logic
src/fixtures/        sample schools from real files, validated in a test
src/i18n/            next-intl routing and helpers
src/lib/data/        data-access boundary, its two adapters, and the cached wrappers
src/lib/domain/      pure business rules with unit tests
src/lib/schemas/     Zod contracts
src/styles/          design tokens
Dockerfile           self-hosted image; compose.yaml runs it
```
