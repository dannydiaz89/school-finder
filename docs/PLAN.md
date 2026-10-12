# School Finder — game plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` dropped

Last updated: 2026-10-11 (Stage 1 merged; Stage 2 in progress)

## Goal

A California school finder that caschooldashboard.org does not offer: search by home address within a radius, filter by school type (district, charter, private) and programs, open a detail page per school, and compare schools side by side. Personal use first, but built so it can be shared.

Approved direction: mockups at https://claude.ai/artifact/2kRKrcg2CHREiXbpRUbQMs (Google-search look, hairlines, text filters, neutral copy). Data sources in [data-sources.md](data-sources.md).

## Decisions

| Area                     | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                | Next.js (App Router, TypeScript strict), pnpm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Backend                  | Convex for storage and transport. Geospatial component for radius search. Convex is the current implementation behind a data-access boundary, not the architecture, so a later move to Postgres touches only the adapter.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Portability rules        | (1) Convex functions are thin: a few lines that validate args and call pure TypeScript in `src/lib/`. Business rules (filters, grade matching, level mapping, placement exclusion, compare logic, import transforms) live in plain modules with unit tests and no Convex import. (2) The UI calls a small data-access API in `src/lib/data/` (`searchSchools`, `getSchool`, `getNearby`, `getSchoolsByCds`) defined by Zod args and result schemas; the Convex implementation is one adapter file behind it. (3) Pages render on the server and fetch on navigation; nothing depends on live subscriptions. (4) The radius query is the one backend-specific piece and has a contract test any implementation must pass. (5) Geocoding is a Next.js route handler with the logic in a plain module. (6) Import scripts parse outside the database and call the adapter for writes. |
| Styling                  | Tailwind v4 with design tokens as CSS custom properties. No component library; small in-house set in `src/components/ui`. Radix primitives for menus, popovers, dialogs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Theme                    | Light and dark. System preference by default, manual override stored per browser.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| i18n                     | `next-intl`, locale in the path (`/en`, `/es`). UI strings only; source data stays English.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Accessibility            | WCAG 2.2 AA target. Semantic HTML, keyboard-first, axe checks in tests. Color is never the only signal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Maps                     | MapLibre GL with OpenFreeMap tiles (no key). The results list is the accessible path; the map is an enhancement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Geocoding                | US Census geocoder from a server route, results cached in Convex.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Compare                  | School list lives in the URL, no sign-in required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Boundaries               | Not shown. No current statewide dataset exists. The app shows distance only and links to the school or district site.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Enrollment process       | Not shown. Public data does not say whether a school uses a lottery, application, or assignment, so the app makes no claims about how to enroll. Same for tuition and program descriptions beyond the directory's magnet, multilingual, and virtual flags.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Validation and contracts | Zod is the single source of truth. Every domain object, filter, URL state, import row, API payload, and env var has one Zod schema in `src/lib/schemas/`. TypeScript types come from `z.infer`, Convex validators and function args from `convex-helpers` Zod adapters, and nothing parses untrusted input (query strings, CDE files, geocoder responses, env) without a schema.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Hosting                  | Vercel for the app, Convex cloud for the backend.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Imports                  | TypeScript scripts in `scripts/` that download, parse, and upsert through Convex actions. Run manually, later as a Convex cron. CDE files are never fetched on the request path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Testing                  | Vitest + Testing Library for units, `convex-test` for functions, Playwright for one end-to-end smoke test, axe in component tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## How parallel work is organized

Stage 0 is serial: one agent lays the foundation and writes the contracts. After that, workstreams run in parallel. Each workstream owns a set of directories and may not edit files outside them without noting it in the PR. Shared contracts change only through the Contracts workstream, with a note in this file.

Each workstream runs in its own git worktree on its own branch, rebases on `main` before opening a PR, and must pass `pnpm check` (typecheck, lint, test). Small PRs, merged often.

Orchestration: the lead agent dispatches workstreams, reviews PRs, merges, and updates this file. Workstream agents update only their own section's checkboxes.

### Contracts (written in Stage 0, frozen unless amended here)

All contracts are Zod schemas under `src/lib/schemas/`. Nothing else defines a shape by hand.

| Contract                | Location                                                                                                                                                                                                                                                                   | Derived from it                                                                        | Consumers                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Domain schemas          | `src/lib/schemas/school.ts` (`School`, `SchoolType`, `GradeSpan`, `DashboardIndicator`, `DashboardLevel`, `CaasppResult`, `Enrollment`, `PrivateSchool`)                                                                                                                   | TS types via `z.infer`; Convex table validators via `zodToConvex`; fixture validation  | all streams                                        |
| Convex schema           | `convex/schema.ts`, built from the domain schemas with `convex-helpers`                                                                                                                                                                                                    | table definitions and indexes                                                          | Data, Search, Detail, Compare                      |
| Query and mutation args | `src/lib/schemas/api.ts` (`SearchArgs`, `SchoolByCdsArgs`, `NearbyArgs`, `CompareArgs`)                                                                                                                                                                                    | Convex function arg validators via `zCustomQuery`; client-side arg checks              | Search, Detail, Compare, Data                      |
| Data-access API         | `src/lib/data/index.ts` exports `searchSchools`, `getSchool`, `getNearby`, `getSchoolsByCds`, each typed by Zod args and result schemas in `src/lib/schemas/api.ts`; `src/lib/data/convex.ts` is the adapter, `src/lib/data/fixtures.ts` is the stub used until Data lands | —                                                                                      | Search, Detail, Compare                            |
| URL state               | `src/lib/schemas/url-state.ts` (`SearchParams`, `CompareParams`) with `parse` and `serialize` helpers                                                                                                                                                                      | typed `useSearchParams` wrappers                                                       | Search, Detail, Compare                            |
| Import rows             | `src/lib/schemas/imports/*.ts`, one per source file (directory, dashboard, caaspp, enrollment, frpm, staff, affidavit, pss)                                                                                                                                                | row validation in `scripts/`; coercion of `No Data`, zero-padding, percent-as-fraction | Data                                               |
| External responses      | `src/lib/schemas/external.ts` (Census geocoder response)                                                                                                                                                                                                                   | geocode route handler                                                                  | Search                                             |
| Env                     | `src/lib/schemas/env.ts`, parsed once at startup on server and client                                                                                                                                                                                                      | typed `env` object                                                                     | all streams                                        |
| Fixture data            | `src/fixtures/schools.json` (about 25 real Sacramento-area schools, hand-checked), validated against the domain schemas in a test                                                                                                                                          | UI streams build and test against fixtures before real imports land                    | UI streams                                         |
| Route map               | `src/app/[locale]/(routes)`: `/`, `/school/[cds]`, `/compare`, `/styleguide`, `/about/data`                                                                                                                                                                                | —                                                                                      | all UI streams                                     |
| Component API           | `docs/design-system.md` lists each component's props                                                                                                                                                                                                                       | —                                                                                      | all UI streams                                     |
| Message namespaces      | `messages/en.json` keyed by `common`, `search`, `school`, `compare`, `data`; a Zod schema of the key tree checks `es.json` matches                                                                                                                                         | missing-key test                                                                       | all UI streams add keys only under their namespace |

Rules:

- Schemas use `.strict()` for objects we own and `.passthrough()` only for external responses.
- Enums are `z.enum` with the exact CDE code values, mapped to display labels in one place (`src/lib/labels.ts`), never inline.
- A schema change is a contract amendment: it is recorded at the bottom of this file and every consumer is notified.

### Directory ownership

| Workstream       | Owns                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lead (contracts) | `src/lib/schemas/**`, `src/lib/data/index.ts`, `convex/schema.ts`, `src/lib/labels.ts`, `docs/PLAN.md`, `AGENTS.md`                                                                                                                            |
| Design system    | `src/components/ui/**`, `src/styles/**`, `src/app/[locale]/styleguide/**`, `docs/design-system.md`                                                                                                                                             |
| Data             | `convex/**` except `convex/schema.ts`, `src/lib/data/convex.ts`, `src/lib/domain/**` (pure business rules), `scripts/**`, `src/fixtures/**` (after Stage 0), `src/lib/schemas/imports/**` (may add row schemas; domain schemas stay with Lead) |
| Search           | `src/app/[locale]/(routes)/page.tsx`, `src/features/search/**`, `src/app/api/geocode/**`                                                                                                                                                       |
| Detail           | `src/app/[locale]/school/**`, `src/features/school/**`                                                                                                                                                                                         |
| Compare          | `src/app/[locale]/compare/**`, `src/features/compare/**`                                                                                                                                                                                       |
| Quality          | `e2e/**`, `.github/**`, `src/app/[locale]/about/**`, `messages/es.json`, `README.md`                                                                                                                                                           |

## Stage 0 — Foundation and contracts (serial, one agent)

- [x] `git init`, `.gitignore`, `.nvmrc`, `pnpm` settings
- [x] Scaffold Next.js with TypeScript strict, ESLint, Prettier; `pnpm check` script
- [x] Add Convex, create the project, commit `convex/` folder
- [x] `AGENTS.md` at the root (symlinked as `CLAUDE.md`): conventions, commands, ownership rules, copy rules (neutral, data-only), a11y and i18n checklists
- [x] Design tokens in `src/styles/tokens.css`, light and dark sets; Tailwind v4 theme wired to them
- [x] Fonts via `next/font` (Google Sans Flex, Roboto fallback)
- [x] Theme provider with system default and manual toggle, no flash on load
- [x] `next-intl` with `en` and `es` message files and locale routing
- [x] Install `zod` and `convex-helpers`; `src/lib/schemas/` with domain, api, url-state, external, env schemas
- [x] `convex/schema.ts` generated from the domain schemas; thin queries in `convex/schools.ts` with Zod arg validators
- [x] Data-access API in `src/lib/data/` with the fixtures adapter wired in and the Convex adapter stubbed
- [x] Fixtures validated against the domain schemas in a test
- [x] `src/lib/labels.ts` mapping CDE codes to display strings, with message keys for i18n
- [x] Route map, URL state helpers, message namespaces and the key-tree check
- [x] Minimal `Button`, `TextLink`, `VisuallyHidden` so streams can start
- [x] Vitest, Testing Library, axe setup with one passing example test
- [x] Tag `v0.0.1-foundation`; dispatch Stage 1 workstreams
- [x] Fixture file: 39 real Sacramento-area schools (32 public, 7 private) with Dashboard, CAASPP, enrollment, FRPM, staff, and affidavit data, built by `scripts/build-fixtures.ts`

## Stage 1 — Parallel workstreams

### A. Design system

- [x] `TextField`, `Select`, `Checkbox`, `Menu` (Radix dropdown with checkbox items), `Popover`, `FilterBar` (text-tab row with hairline), `Table`, `Bar` (thin comparison bar), `LevelDot` (Dashboard level with text), `TypeDot` (district, charter, private), `StatRow`, `KeyValueList`, `Skeleton`, `EmptyState`; also `Radio`, `FilterButton`, `Dialog`, `ResultRow`
- [x] Every component: keyboard support, focus ring from tokens, axe test, dark mode check
- [x] `/styleguide` renders every component in both themes with sample props
- [x] `docs/design-system.md` with tokens, usage, and do/don't list (no pills, no cards, hairlines)

### B. Data

- [x] Shared parsing utilities: tab and caret delimited, XLSX header offsets, download cache in `.cache/`; every row passes through its Zod row schema, and rejected rows are counted and logged, never silently dropped
- [x] Row schemas in `src/lib/schemas/imports/` with coercions for `No Data`, CDS zero-padding, percent-as-fraction, thousands separators
- [x] `importRuns` table and a helper that records source URL, row count, and timestamp
- [x] Import: CDE public school directory (active only, drop district rows)
- [x] Import: Dashboard 2025 indicators (ELA, Math, Chronic Absenteeism, Suspension, Graduation, College/Career, ELPI, Science)
- [x] Import: CAASPP 2024-25 statewide file (all students, all grades, ELA and Math, with district and state rows)
- [x] Import: Census Day enrollment 2024-25 (totals and race/ethnicity)
- [x] Import: FRPM 2024-25
- [x] Import: student/staff ratios 2023-24
- [x] Import: CDE Private School Affidavit 2024-25
- [x] Import: NCES Private School Survey 2023-24, joined to affidavit by normalized name + county with a confidence score and `privateSchoolOverrides` table (the affidavit has no zip, so county replaces it)
- [x] Geospatial index populated for all schools with coordinates (kept in step by `upsertSchools`; `pnpm run import geo-index` rebuilds it)
- [x] Implement `src/lib/data/convex.ts` and the thin Convex functions behind it; pure rules in `src/lib/domain/` with unit tests
- [x] Radius query contract test passes against the Convex adapter (`CONVEX_CONTRACT_TESTS=1 pnpm test src/lib/data/convex.contract.test.ts`)
- [x] Spot-check script: fixture schools asserted against the Dashboard site (`pnpm tsx scripts/spot-check.ts`); results in [data-sources.md](data-sources.md#verification)
- [ ] Statewide import into the dev deployment (Sacramento County is loaded; `pnpm run import all` without `--county` does the state)
- [ ] Prune schools that left the directory (re-runs upsert but never delete)

### C. Search

- [~] Geocode route handler (Census) with Convex cache; request and response validated with the external schema (`src/app/api/geocode/route.ts` over `src/features/search/geocode.ts`; cache is an in-process Map until B lands the `geocodeCache` table)
- [x] Search page against stub queries: address field with radius, filter row (Type, Grades, Rating, Programs, Size, Reset, Sort)
- [x] Type filter: District (public), Charter (public), Private, multi-select
- [x] Programs filter: Magnet, Dual language, Virtual; private affiliation
- [x] Specialized placements hidden by default with a toggle to show (in the Type menu, plus a link under the summary)
- [x] Results list: numbered rows, type dot, Dashboard level dots, compare and details actions
- [x] Map with numbered pins, radius ring, home marker, hover sync with list
- [x] Phone layout: stacked map and list
- [x] URL holds address, radius, and filters (and the page; `compare` is carried along by filter changes)
- [x] Empty, loading, and error states

### D. Detail

- [x] Route `/school/[cds]` with metadata for sharing
- [x] Header, action links, stat row
- [x] Dashboard table with status and change
- [x] CAASPP bars against district and state
- [x] Students section from enrollment and FRPM
- [x] Facts list from directory
- [x] Nearby alternatives from the radius query
- [x] Private school variant: affidavit data, affiliation, no Dashboard rows

### E. Compare

- [x] Compare list in URL, max 5, helpers in `src/features/compare/` (`best.ts` best-in-row rules, `facts.ts` derived values, both pure and unit-tested)
- [x] `useCompareList` hook in `src/features/compare/use-compare-list.ts` (URL-backed, History API writes); Search and Detail call it. Writes pass a `null` state: Next skips the `useSearchParams` sync when the call carries its own `__NA` state
- [~] Add and remove from results and detail pages (Remove on the compare page is done; Search and Detail wire their own controls to the hook)
- [x] Compare table with grouped rows and best-in-row emphasis (`/[locale]/compare`, `CompareView` filters the server-fetched schools client-side so Remove and Clear all need no round trip)
- [x] Copy link, clear all (`CopyLinkButton` announces through a live region)
- [x] Phone layout with horizontal scroll
- [x] `CompareNavLink` in the header shows "Compare (n)" and keeps the list in the link

### F. Quality

- [x] CI workflow: typecheck, lint, unit tests on every PR (`.github/workflows/ci.yml`, plus a build and a Playwright job)
- [~] Playwright smoke test against fixtures: search, open detail, add to compare (`e2e/smoke.spec.ts` covers every page, both controls, and axe in both themes; the search → detail → compare steps are TODOs until C, D, and E land)
- [x] Spanish message file kept in sync; missing-key check in CI (`src/i18n/messages.test.ts` runs in `pnpm check`)
- [~] `/about/data` page listing sources and update dates from `importRuns` (page done; dates read from `fixtures.sources` until B lands `importRuns`, swap in `src/app/[locale]/about/data/updates.ts`)
- [x] README with setup and import instructions

## Stage 2 — Integration (serial, lead agent)

- [x] Switch UI streams from fixtures to real data once B lands (DATA_SOURCE=convex in .env.local; two counties loaded in the dev deployment; e2e stays on fixtures)
- [x] Statewide import into the dev deployment: 10,537 public schools, 1,574 private schools placed, zero rejected rows
- [x] Local end-to-end verification against live data (17 flow checks) plus back-navigation regression
- [~] Lighthouse and axe pass on the three main pages, both themes (axe passes in the smoke suite for four pages in both themes; Lighthouse not run)
- [ ] Deploy to Vercel and Convex production
- [ ] Tag `v0.1.0`

## Later

- [-] Attendance boundaries. Dropped 2026-10-11: the only statewide dataset is from 2015-16. Revisit if a current source appears.
- [ ] Address autocomplete
- [ ] Scheduled re-imports when new annual files post
- [ ] Sign-in and saved lists
- [ ] Historical trends per school (prior Dashboard years)

## Decisions made during Stage 1

- Unknown school codes render the localized 404 page with `noindex` but return HTTP 200, because the prerendered shell is sent before the lookup runs. Accepted: the fast shell matters more than the status code for a page nobody links to. Revisit if crawl hygiene becomes an issue.
- The compare list is filtered client-side after the server fetches every school in the URL, so Remove and Clear all are instant.
- Private schools match the federal survey by Dice similarity on normalized names within the same county, threshold 0.8, overrides table first. Roughly half of affidavit schools have a survey row; the rest are mostly very small schools.

- Search reads a precomputed summary stored on each school document (`summary`, rebuilt by `pnpm run import search-rows`, which runs automatically after any import). Without it a search cost about twelve reads per school and a 10-mile search in Los Angeles hit Convex's 4,096-read limit.
- A search examines at most the nearest 1,200 schools. Past that the result is marked `truncated` and the page says so. Only downtown Los Angeles beyond about 12 miles reaches it.
- Preschool-only programs are hidden by default with the other specialized placements. CDE codes many of them as elementary level, so the rule keys on an offered grade span that ends at preschool.

- Radius search uses a plain grid index on the schools table (`src/lib/domain/grid.ts`, index `by_geo`) instead of the `@convex-dev/geospatial` component, which was removed. The component's nearest-neighbor query cost about 1.2 seconds regardless of result size; the grid costs one indexed range read per grid row and answers in about 100 ms. Counts were verified identical to the component for five cities at three radii. It is also directly portable to Postgres.
- Pages read through cached wrappers in `src/lib/data/cached.ts` (`"use cache"`, hours, tag `schools`). For radii up to 5 miles the schools around an address are fetched once and filters, sorting, and paging are applied in the web process with the same `assembleSearchResult` the backend uses, so a filter change makes no backend call. `scripts/verify-local-filter.ts` proves the two paths agree on live data.
- Links to data-backed pages use `IntentLink`, which loads the destination on hover, focus, or touch so the click shows the page without a skeleton.

- The search box accepts a street address, a California city, or a ZIP code. Cities and ZIP codes resolve to their center from a bundled Census Gazetteer table; street addresses still go to the Census geocoder. The URL carries `loc=city|zip` so pages say "Search center" and "From Sacramento" rather than "home".

- The search box also accepts a school's name. Every word typed must begin a word of the school's name, city, or district, so "washington elementary sacramento" narrows 40 namesakes to one. Results are statewide, need no location, and show no map or distance. Text is interpreted in this order: city or ZIP code, street address (starts with a number), school name, then address without a number. `by=name` forces the name search, and a city search links to it when the city is also a school name.

- Hovering a map pin shows a preview card with the school's basic facts; tapping one on a touch screen pins the card open with a Details link. A mouse click still scrolls the list to that school.

## Contract amendments

Record each as: date, what changed, which streams were notified.

- 2026-10-11 (Data): `Enrollment.byRaceEthnicity` in `src/lib/schemas/enrollment.ts` is now `z.object({ RB: Count.optional(), ... }).strict()` instead of `z.partialRecord(RaceEthnicity, Count)`. The TypeScript type is unchanged (`Partial<Record<RaceEthnicity, number>>`), but `convex-helpers` 0.1.128 derives a Convex object with every key required from a partial record, so `convex/schema.ts` rejected any school missing a category (which is nearly all of them). No consumer changes. Streams notified: Lead (owns the file), Detail and Compare (read the field).

- 2026-10-11: `SearchSummary` added (the distance-independent part of `SchoolSummary`), stored as an optional `summary` field on the Convex `schools` table. `SearchResult` gained `truncated` (defaults to false). All streams merged before this; no one to notify.
- 2026-10-11: fifth data-access function `getSchoolsInRadius` (`RadiusArgs` → `RadiusRows`) added for local filtering. Convex `schools` table gained optional `geoRow`, `geoCol` and index `by_geo`.
- 2026-10-11: `GeocodeResult.kind` (address, city, zip; defaults to address) and URL parameter `loc` (city, zip) added for city and ZIP code search.
- 2026-10-11: sixth data-access function `findSchoolsByName` (`NameSearchArgs` → `NameMatch[]`). Convex `schools` gained optional `searchText` and search index `search_text`. URL parameter `by=name` added.
