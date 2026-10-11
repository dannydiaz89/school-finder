# Design system

The look is Google search results: white ground, hairline separators, link-blue titles, gray meta text, text tabs and dropdown-style filters. Modern, quiet, no decoration that does not carry information. Approved mockups: https://claude.ai/artifact/2kRKrcg2CHREiXbpRUbQMs

Live reference: `/en/styleguide` renders every token and component in both themes.

## Tokens

Defined in `src/styles/tokens.css`, exposed as Tailwind utilities in `src/app/globals.css`. Light and dark are complete, parallel sets.

| Group            | Tokens                                                                      | Utilities                                                   |
| ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Surfaces         | `--bg`, `--bg-subtle`, `--bg-raised`, `--bg-map`                            | `bg-bg`, `bg-bg-subtle`, ...                                |
| Text             | `--fg`, `--fg-secondary`, `--fg-muted`, `--fg-on-accent`                    | `text-fg`, `text-fg-muted`, ...                             |
| Links and accent | `--link`, `--link-visited`, `--accent`, `--accent-hover`, `--accent-subtle` | `text-link`, `text-accent`, `bg-accent`, `bg-accent-subtle` |
| Lines            | `--hairline`, `--border`, `--border-strong`                                 | `border-hairline`, `border-border`                          |
| Focus            | `--focus`                                                                   | global `:focus-visible`                                     |
| Dashboard levels | `--level-red` ... `--level-blue`, `--level-none`                            | `bg-level-green`, `text-level-blue`                         |
| School types     | `--type-district`, `--type-charter`, `--type-private`                       | `bg-type-charter`                                           |
| Charts           | `--bar-track`, `--bar-primary`, `--bar-secondary`                           | `bg-bar-primary`                                            |
| Type scale       | `--text-xs` 12 to `--text-5xl` 30                                           | `text-sm`, `text-base`, `text-2xl`, ...                     |
| Radii            | `--radius-sm` 4, `--radius-md` 8, `--radius-lg` 12, `--radius-full`         | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`    |
| Layout           | `--content-width` 652, `--panel-width` 460, `--left-offset`                 | `max-w-[var(--content-width)]`, `pl-[var(--left-offset)]`   |

Contrast pairs checked at 4.5:1 or better: `fg`, `fg-secondary`, `fg-muted`, `link`, `accent` on `bg` and `bg-subtle`, in both themes. `fg-on-accent` on `accent`. Level and type colors are for dots and bars next to text, not for text on their own.

## Type

Google Sans Flex (variable) with Roboto and system-ui fallback, loaded with `next/font`. Weights: 400 for body and titles, 500 for labels and section headings, 700 only for the best-in-row emphasis in compare tables.

| Use                                          | Size     | Weight    |
| -------------------------------------------- | -------- | --------- |
| School name on detail page                   | 30       | 400       |
| Page title                                   | 22       | 400       |
| Result title (link blue)                     | 20       | 400       |
| Section heading                              | 18       | 500       |
| Stat number                                  | 26       | 400       |
| Body, table, list                            | 14       | 400       |
| Meta, captions, hairline-list secondary text | 13       | 400, gray |
| Uppercase small labels                       | not used |           |

## Layout

- Content column 652px wide, starting at `--left-offset` from the left edge (Google's offset on desktop, 28px on phones). A right panel of up to 460px holds the map or the facts list, and wraps under the content on narrow screens.
- Vertical rhythm from the row padding: list rows `py-[18px]`, table rows `py-2.5`, sections `py-5`.
- Phone: everything stacks, the filter row scrolls horizontally, tables scroll inside an `overflow-x-auto` box.

## Patterns

- **Row list.** `<ul>` of `<li class="border-b border-hairline py-[18px]">`. Title is a `TextLink tone="link"` at 20px; meta line in `text-fg-secondary` 14px; indicators as `LevelDot` + word.
- **Filter row.** Text buttons with a caret, `border-b-[3px]` accent underline on the active one, sitting on a hairline. Opens a Radix dropdown with checkbox items and Apply/Cancel.
- **Key/value list.** `<dl>` in a two-column grid, `dt` gray, hairline between rows.
- **Stat row.** Up to four numbers, 26px, labels 13px gray, vertical hairlines between.
- **Bar.** 8px track in `bar-track`, fill in `bar-primary` for the subject and `bar-secondary` for comparisons.
- **Compare table.** No outer border, hairline rows, bold for the best value, gray "Not rated" for private schools.
- **Map.** Rounded 12px box with a `border` hairline. Pins are type-colored with white numbers matching the list.

## Components

Props are the contract. Add a row when you add a component.

| Component        | File                                    | Props                                                                        | Notes                                                      |
| ---------------- | --------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Button`         | `src/components/ui/button.tsx`          | `variant: primary \| secondary \| text`, `size: sm \| md`, button attributes | Always `type="button"` unless submitting a form.           |
| `TextLink`       | `src/components/ui/text-link.tsx`       | `tone: link \| accent \| muted`, Link props                                  | Locale-aware. Underline on hover only.                     |
| `ExternalLink`   | `src/components/ui/external-link.tsx`   | anchor attributes                                                            | New tab, `rel` set, announces "website" to screen readers. |
| `VisuallyHidden` | `src/components/ui/visually-hidden.tsx` | `as`, element attributes                                                     | Screen-reader-only text.                                   |
| `ThemeToggle`    | `src/components/theme-toggle.tsx`       | `className`                                                                  | Labelled select: system, light, dark.                      |
| `LocaleSwitch`   | `src/components/locale-switch.tsx`      | `className`                                                                  | Labelled select: English, Español. Keeps the path.         |
| `SiteHeader`     | `src/components/site-header.tsx`        | none                                                                         | Wordmark, nav, language, theme.                            |

Planned by the Design system workstream: `TextField`, `Select`, `Checkbox`, `Menu`, `Popover`, `FilterBar`, `Table`, `Bar`, `LevelDot`, `TypeDot`, `StatRow`, `KeyValueList`, `Skeleton`, `EmptyState`.

## Do and don't

- Do separate with hairlines. Don't wrap list items in bordered cards.
- Do use text buttons inline. Don't use pill chips for categories or filters.
- Do show a dot and a word. Don't rely on color alone.
- Do write neutral, factual copy. Don't describe or characterize school types.
- Do keep one primary button per view. Don't stack filled buttons.
- Do use the popover shadow token for menus. Don't add shadows anywhere else.
