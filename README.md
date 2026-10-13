# School Finder

A California school finder. Type a home address, pick a radius, and see every school nearby: district, charter, and private. Filter by type, grades, programs, and California School Dashboard level; open a school's detail page; compare up to five side by side. Everything shown comes from public files published by the California Department of Education and federal agencies. Nothing is estimated or editorialized.

- Game plan and workstreams: [docs/PLAN.md](docs/PLAN.md)
- Rules for contributors and agents: [AGENTS.md](AGENTS.md)
- Design system: [docs/design-system.md](docs/design-system.md)
- Data sources: [docs/data-sources.md](docs/data-sources.md)

## Stack

| Layer     | Choice                                                                           |
| --------- | -------------------------------------------------------------------------------- |
| App       | Next.js 16 (App Router, Cache Components, TypeScript strict), React 19           |
| Styling   | Tailwind v4 over design tokens in `src/styles/tokens.css`; light and dark themes |
| i18n      | `next-intl`, locale in the path (`/en`, `/es`)                                   |
| Backend   | Convex (storage, geospatial radius queries) behind a data-access boundary        |
| Contracts | Zod schemas in `src/lib/schemas/`; every type is `z.infer`                       |
| Tests     | Vitest + Testing Library + axe for units and components, Playwright for e2e      |
| Hosting   | Vercel (app) and Convex cloud (backend)                                          |

Pages are server components that fetch through the four functions in `src/lib/data/index.ts` and render. Business rules are pure functions in `src/lib/domain/`. Convex functions in `convex/` are thin. Imports run as scripts, never during a request.

## Setup

Requires Node 22 or newer and pnpm (the version is pinned in `package.json`; `corepack enable` picks it up).

```bash
pnpm install
cp .env.example .env.local
pnpm dev            # http://localhost:3000, redirects to /en
```

`.env.local` has one switch that matters:

| Variable                 | Values               | Notes                                                                   |
| ------------------------ | -------------------- | ----------------------------------------------------------------------- |
| `DATA_SOURCE`            | `fixtures` (default) | In-memory sample of 39 real Sacramento-area schools. No backend needed. |
|                          | `convex`             | Reads the Convex deployment. Requires the two variables below.          |
| `NEXT_PUBLIC_CONVEX_URL` | URL                  | Filled in by `pnpm convex` the first time it runs.                      |
| `CONVEX_DEPLOYMENT`      | name                 | Same.                                                                   |

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
pnpm import <source>  # data import, see below
npx next typegen      # regenerate route types after adding or moving a route
```

`pnpm check` needs the generated route types. If `tsc` cannot find `PageProps`, run `npx next typegen` first (`pnpm build` and `pnpm dev` also generate them).

## Importing data

Source files are downloaded by scripts on a developer machine or in CI, cached under `.cache/` (gitignored), validated row by row with the schemas in `src/lib/schemas/imports/`, and upserted through the Convex adapter. CDE's site is never fetched during a request.

```bash
pnpm import directory
pnpm import dashboard --year 2025
pnpm import all
```

The entry point is `scripts/import.ts`. Every source, its URL, layout, refresh cadence, and the gotchas found while parsing it are in [docs/data-sources.md](docs/data-sources.md). Read it before touching an importer. Note the access warning at the top: `www.cde.ca.gov` rate-limits and CAPTCHAs automated downloads, so the directory file is fetched by hand and cached.

`scripts/build-fixtures.ts` builds `src/fixtures/schools.json` from the same files; its header comment lists the arguments. The fixture file is the reference data for adapter contract tests and what the UI is developed against.

The app lists every source and the date it was last retrieved at `/en/about/data`.

## Tests

```bash
pnpm test             # unit and component tests
pnpm e2e              # end-to-end smoke suite
```

- Pure logic has a `*.test.ts` next to the module. Components have `*.test.tsx` with Testing Library, `user-event`, and `runAxe` from `src/test/a11y.ts`.
- `src/i18n/messages.test.ts` fails if `messages/es.json` and `messages/en.json` drift in keys or ICU arguments.
- Tests are deterministic: no network, fixtures only.

### End-to-end

`e2e/smoke.spec.ts` loads each page over the fixtures backend in both themes, checks the header, language and theme controls, a fixture school's detail page, the compare page, and the data sources page, and runs axe (WCAG 2.2 AA, serious and critical impact) on every page in light and dark.

`pnpm e2e` builds the app and starts it on port 3103 with `DATA_SOURCE=fixtures`; `playwright.config.ts` is the single place that configures this. To run against a server you already started, set `PLAYWRIGHT_BASE_URL`:

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
2. **e2e**: `pnpm build`, then the Playwright smoke suite against `pnpm start` with `DATA_SOURCE=fixtures`. Chromium and the Next.js build cache are cached between runs; the HTML report is uploaded on failure.

Both jobs use Node 22 and the pnpm version pinned in `package.json`.

## Deployment

- **App**: Vercel, importing this repository. Build command `pnpm build`. Set `DATA_SOURCE=convex` and `NEXT_PUBLIC_CONVEX_URL` (or `CONVEX_URL`) to the Convex deployment's address, and `REVALIDATE_SECRET` so imports can clear cached pages.
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
  -e DATA_SOURCE=convex \
  -e CONVEX_URL=https://<deployment>.convex.cloud \
  -e REVALIDATE_SECRET=<random string, 16+ characters> \
  school-finder
```

Or with Compose: `docker compose up --build`, with the same three values in a `.env` file beside `compose.yaml`.

| Setting             | When     | Meaning                                                                             |
| ------------------- | -------- | ----------------------------------------------------------------------------------- |
| `DATA_SOURCE`       | at start | `fixtures` (default, sample data) or `convex`.                                      |
| `CONVEX_URL`        | at start | The Convex deployment's address. Required with `DATA_SOURCE=convex`.                |
| `REVALIDATE_SECRET` | at start | Lets `pnpm run import` clear cached pages through `POST /api/revalidate`. Optional. |
| `PORT`              | at start | Port the server listens on inside the container. Default 3000.                      |

Things to know:

- One image works with any deployment, because `CONVEX_URL` is read when the server starts. (`NEXT_PUBLIC_CONVEX_URL` also works but is fixed when the image is built.)
- The build downloads the font from Google, so it needs network access. Running the container does not, apart from Convex, the map tiles, and the address lookup.
- Cached pages live in the container's memory. With more than one container each has its own cache, and an import's cache clear reaches only the container that receives it; the others catch up within a few hours.
- The container runs as a non-root user and reports its health on `/en`.
- The image is about 300 MB. With `DATA_SOURCE=convex` and no address, the server starts but data pages fail, and the log says `CONVEX_URL ... is required when DATA_SOURCE=convex`.
- Imports are not part of the image. Run them from a checkout of this repository, with `APP_URL` set to where the container is reachable.

## Project layout

```
convex/              Convex schema, thin queries, geospatial index
docs/                PLAN.md, data-sources.md, design-system.md
e2e/                 Playwright smoke suite
messages/            en.json and es.json
scripts/             import.ts, build-fixtures.ts, parsing helpers
src/app/[locale]/    routes: /, /school/[cds], /compare, /about/data, /styleguide
src/components/      header, theme and locale controls, ui primitives
src/fixtures/        sample schools from real files, validated in a test
src/i18n/            next-intl routing and helpers
src/lib/data/        data-access boundary and its adapters
src/lib/domain/      pure business rules with unit tests
src/lib/schemas/     Zod contracts
src/styles/          design tokens
```
