<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# School Finder — rules for agents

A California school finder: search by home address within a radius, filter by school type (district, charter, private) and programs, open a school's detail page, compare up to five schools. Read `docs/PLAN.md` for the game plan, the workstream you are in, and what you own. Read `docs/data-sources.md` before touching anything that imports data.

## Commands

```bash
pnpm dev              # Next.js dev server (http://localhost:3000, redirects to /en)
pnpm check            # typecheck + lint + test + format check. Must pass before every PR.
pnpm test             # Vitest, one run
pnpm test:watch
pnpm format           # Prettier, writes
pnpm convex           # Convex dev (pushes convex/ to the dev deployment, regenerates types)
pnpm convex:codegen   # regenerate convex/_generated without a dev loop
npx next typegen      # regenerate .next/types after adding or moving a route
```

Node 22 or newer, pnpm. `.env.local` holds the Convex deployment and `DATA_SOURCE`. Default is `DATA_SOURCE=fixtures`, which needs no backend.

## Architecture in one paragraph

Next.js App Router, TypeScript strict, Tailwind v4 with design tokens, next-intl for `en` and `es`, Convex for storage. Pages are server components that fetch through the data-access API in `src/lib/data/` and render. Business rules live in `src/lib/domain/` as pure functions. Every shape is a Zod schema in `src/lib/schemas/`. Convex functions in `convex/` are thin: validate args with the Zod schema, load documents, call domain functions. Imports run as scripts in `scripts/` on a developer machine or CI, never during a request.

## Rules that are not negotiable

1. **Zod is the source of truth.** A type is `z.infer` of a schema in `src/lib/schemas/`. Never write an interface or type alias that describes data; derive it. Untrusted input (query strings, env, source files, external responses) is parsed with a schema before use. Objects we own are `.strict()`.
2. **Convex is behind the boundary.** UI code imports from `@/lib/data`, never from `convex/` or `convex/react`. No `useQuery` subscriptions in pages. The seven functions in `src/lib/data/index.ts` are the whole API; add another only as a contract amendment in `docs/PLAN.md`. Pages call the cached wrappers in `src/lib/data/cached.ts`, never the adapters.
3. **Convex functions stay thin.** No filtering, sorting, or scoring logic inside `convex/*.ts`. Put it in `src/lib/domain/` with a unit test and call it from the function.
4. **Copy is factual and neutral.** The app shows what public files say and nothing else. No descriptions of what a school type is like, no claims about how to enroll (lottery, application, boundaries), no tuition, no program descriptions beyond the directory's magnet, multilingual, and virtual flags. If context is needed, link to the source.
5. **Charter schools are public.** Labels read "District · public", "Charter · public", "Private". Never present charter as not public.
6. **Nothing fetches CDE at request time.** CDE's site rate-limits and CAPTCHAs automated traffic. Source files are downloaded by scripts, cached under `.cache/`, and loaded into Convex in batches.
7. **Stay in your lane.** Each workstream owns directories listed in `docs/PLAN.md`. Edits outside them go in a separate PR or are called out at the top of the PR description.

## Compare list

The compare list lives in the browser's local storage, read through `useCompareList()` (`src/features/compare/`). Do not read it from the URL: only the compare page looks at its `compare` parameter, to load data and to adopt a link opened directly. A link that should set a specific comparison calls `compare.set(list)` on click. Server-rendered HTML cannot know the list, so compare buttons settle after hydration.

## My schools

A list of up to 50 schools a visitor keeps to follow, shown at `/my-schools` as one row per school with each Dashboard indicator's level, result, and change from the year before. It lives in the browser's local storage. Components reach it only through `useMySchools()` or `MySchoolsToggle` (`src/features/my-schools/`), and the hook reads and writes through the `SavedSchoolsStore` interface in `store.ts`. Moving the list to accounts means a second implementation of that interface; do not read storage anywhere else. The page address carries the list (`?schools=`) only so the server can load the rows: the browser's list always decides what is shown, and a school in the address that is not in the list is ignored. Rows come from `getSchoolBriefs`, one stored document per school.

## Search state

A search is its page address: location, radius, filters, sort and page are all query parameters, so results can be bookmarked and shared. The header's Search link (`SearchNavLink` in `src/features/search/`) remembers the last address the search page showed, in session storage, and leads back to it from any other page. On the search page itself the link is plain and starts a new search. Do not add a second copy of the search state anywhere else.

## Design system

Tokens are in `src/styles/tokens.css` and exposed to Tailwind in `src/app/globals.css`. Use token utilities (`bg-bg`, `text-fg-muted`, `border-hairline`, `text-accent`, `rounded-md`); never a raw hex value or an arbitrary color. The look is Google search results: white ground, hairline separators, link-blue titles, gray meta text, text tabs and dropdown-style filters. Specifically:

- No cards with borders around every item, no pill chips for categories, no shadows except the popover token, no gradients, no emoji, no icon-only buttons without an accessible name.
- Lists are rows separated by `border-b border-hairline`. Tables are plain with hairline rows and bold for emphasis.
- Categories and Dashboard levels are a small colored dot plus the word. Color never carries meaning alone.
- Three button variants only (`Button` in `src/components/ui`): primary filled pill for the one main action, secondary outlined pill, text for inline actions.
- `/styleguide` renders every component in both themes. Add yours there.
- Document a new component's props in `docs/design-system.md`.

## Dark mode

Both themes are complete sets of the same tokens. `next-themes` sets `data-theme` on `<html>`; tokens switch there, and `@media (prefers-color-scheme: dark)` covers the no-JavaScript case. Never use `dark:` utilities for colors; pick the right token and both themes follow. Check every component in both themes before opening a PR.

## Accessibility checklist (WCAG 2.2 AA)

- Semantic elements: `<button>` for actions, `<a>` for navigation, `<label>` for every input, headings in order, one `<main>` per page, lists are `<ul>`/`<ol>`.
- Everything works with the keyboard: Tab reaches it, Enter or Space activates it, Escape closes it, arrow keys move within menus. Focus is visible (the global `:focus-visible` style) and never trapped.
- Radix primitives for menus, popovers, dialogs, tabs. Do not hand-roll these.
- Icon-only controls carry `aria-label`. Decorative SVG carries `aria-hidden="true"`.
- The results list is the accessible path; the map is an enhancement and offers nothing the list does not.
- Text contrast at least 4.5:1 (3:1 at 24px+). Token pairs are pre-checked; do not invent pairs.
- Every component test runs `runAxe` from `src/test/a11y.ts` and asserts no violations.
- Respect `prefers-reduced-motion`.

## Internationalization

- Every user-facing string goes through `next-intl`: `useTranslations` in components, `getTranslations` in server code. No literal UI text in JSX, including punctuation like "·" that joins translated pieces (use a message with placeholders).
- Add keys to `messages/en.json` and `messages/es.json` in the same change, under your workstream's namespace (`search`, `school`, `compare`, `mySchools`, `data`, `common`). Codes become labels only through `src/lib/labels.ts` and the `labels` namespace. `src/i18n/messages.test.ts` fails if the two files drift.
- Numbers, dates, and plurals use ICU formatting (`{count, number}`, `{count, plural, ...}`), never string concatenation.
- Links use `Link` from `@/i18n/navigation`, never `next/link`, so the locale prefix is kept.
- Source data (school names, districts, addresses) stays in English as published.

## Testing

- Pure logic: Vitest in `*.test.ts` next to the module. Table-driven where it helps.
- Components: `*.test.tsx` with Testing Library, user-event, and `runAxe`.
- Data adapters: the fixtures adapter is the reference. The Convex adapter must pass the same contract tests with the same fixture data loaded.
- End-to-end: Playwright in `e2e/`, one smoke flow. Do not add e2e tests for things a unit test covers.
- Tests must be deterministic. No network. Fixtures in `src/fixtures/` are real schools from real files; do not invent values.

## Git workflow

- One branch per workstream, in its own worktree, named `ws/<stream>` (`ws/search`, `ws/data`). Rebase on `main` before opening a PR.
- Small PRs, merged often. `pnpm check` green is the bar. The PR description says what changed, what was tested, and lists any file touched outside the stream's ownership.
- Update your workstream's checkboxes in `docs/PLAN.md` in the same PR as the work.
- Commit messages: short imperative subject, body only when the why is not obvious.

## Next.js 16 notes

- Middleware is `src/proxy.ts`. Route types come from `npx next typegen`; use `PageProps<"/[locale]/...">` and `LayoutProps<...>`.
- Cache Components is on. Pages that read `searchParams` are dynamic; wrap the dynamic part in `<Suspense>` with a skeleton. Prefer `"use cache"` with `cacheLife` for data that changes yearly (which is all of it).
- Fonts via `next/font/google`. The sans font is Google Sans Flex with Roboto fallback, exposed as `--font-sans`.

## Convex notes

- The web app and Convex deploy separately. A new field on a result schema must have a `.default(...)` so an older backend still parses, and a removed field must stay optional for one release. Deploy Convex first, then the web app.
- `convex/schema.ts` is derived from the Zod domain schemas with `zodToConvexFields`. Add fields in `src/lib/schemas/`, not here. Indexes are decided here.
- Field names must start with a letter or underscore; that is why per-grade counts are arrays of `{ grade, count }` rather than records.
- Queries use `zCustomQuery` from `convex-helpers/server/zod4` with `args: Schema.shape`.
- Radius search uses the grid in `src/lib/domain/grid.ts` and the `by_geo` index on `schools`: one range read per grid row, then an exact distance check. Never a full table scan, and no spatial component.
- `dashboard` and `caaspp` hold several years per school. Never pick a year yourself: use `currentDashboard`, `currentCaaspp` and `statusUnit` from `src/lib/domain/history.ts`, and read `SchoolDetail.history` for anything by year.
- The deployment is on Convex's free plan, where database bandwidth (bytes read plus bytes written) is the tight limit. Read "What an import costs" in `docs/data-sources.md` before touching imports or queries. Do not add a statewide read to a routine path, do not read rows a screen does not show, and do not verify changes by running imports or repeated searches against the live deployment: use `src/lib/data/convex-functions.test.ts`, which runs the Convex functions in memory.
- Import mutations return `{ written, changed }`. `changed` is how the script knows which schools to refresh; keep it truthful.
- Which schools are a school's "nearby alternatives" is decided by `isAlternativeTo` in `src/lib/domain/nearby.ts` (same grades, ordinary choice). Both adapters call it; do not filter nearby rows anywhere else.
- A search row is one document: the `summary` stored on each school at import time. Do not add per-row lookups to search; extend the summary and `rebuildSummaries` instead.
- `pnpm convex` must be running (or `pnpm convex:codegen` run) after changing functions so `_generated` is current. Commit `_generated`.
