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
- **Filter row.** `FilterBar` of `FilterButton`s: text, caret, 44px tall, `border-b-[3px]` accent underline on the active or open one, sitting on a hairline. Each opens a `Menu`: a Radix Popover with native checkbox or radio rows and Apply/Cancel. Choices are a draft until Apply; Cancel, Escape, and outside clicks discard it. The row scrolls sideways on phones.
- **Result row.** `ResultRow` inside an `<ol>`: number badge, `TypeDot` line with district or affiliation, grade span, and distance; link-blue title; gray meta line (address, students, student-teacher); `LevelDot` row; text actions. Private schools show "Not rated".
- **Floating surfaces.** `Popover`, `Menu`, and `Dialog` use `bg-bg-raised`, a `border` line, and `shadow-popover`. Nothing else has a shadow. `Dialog` is a bottom sheet on phones and a centered panel from `sm` up.
- **Forms.** `TextField`, `Select`, `Checkbox`, and `Radio` are native controls, 44px tall, labelled through a shared `Field` wrapper that wires hint and error with `aria-describedby`. Error text is `fg` at medium weight, not red: there is no error color token and level colors are not for text.
- **Loading and empty.** `Skeleton` bars (hidden from assistive technology) while a region loads; `EmptyState` (title, one line, optional action) when a list has nothing.
- **Key/value list.** `<dl>` in a two-column grid, `dt` gray, hairline between rows.
- **Stat row.** Up to four numbers, 26px, labels 13px gray, vertical hairlines between.
- **Bar.** 8px track in `bar-track`, fill in `bar-primary` for the subject and `bar-secondary` for comparisons.
- **Compare table.** No outer border, hairline rows, bold for the best value, gray "Not rated" for private schools.
- **Map.** Rounded 12px box with a `border` hairline. Pins are type-colored with white numbers matching the list.

## Components

Props are the contract. Add a row when you add a component.

| Component        | File                                    | Props                                                                                                                                                                                                                                    | Notes                                                                                                                                     |
| ---------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`         | `src/components/ui/button.tsx`          | `variant: primary \| secondary \| text`, `size: sm \| md`, button attributes                                                                                                                                                             | Always `type="button"` unless submitting a form.                                                                                          |
| `TextLink`       | `src/components/ui/text-link.tsx`       | `tone: link \| accent \| muted`, Link props                                                                                                                                                                                              | Locale-aware. Underline on hover only.                                                                                                    |
| `IntentLink`     | `src/components/ui/intent-link.tsx`     | same as `TextLink`                                                                                                                                                                                                                       | Loads the destination on hover, focus, or touch so the click is instant. Use for links to data-backed pages (a school, compare, results). |
| `ExternalLink`   | `src/components/ui/external-link.tsx`   | anchor attributes                                                                                                                                                                                                                        | New tab, `rel` set, announces "website" to screen readers.                                                                                |
| `TextField`      | `src/components/ui/text-field.tsx`      | `label`, `hideLabel`, `hint`, `error`, `leadingIcon`, `wrapperClassName`, input attributes                                                                                                                                               | Native input, 44px. Error sets `aria-invalid`.                                                                                            |
| `Select`         | `src/components/ui/select.tsx`          | `label`, `hideLabel`, `hint`, `error`, `options: {value, label, disabled}[]`, `wrapperClassName`, select attributes                                                                                                                      | Native select with a caret.                                                                                                               |
| `Checkbox`       | `src/components/ui/checkbox.tsx`        | `label`, `description`, `inputClassName`, input attributes                                                                                                                                                                               | The row is the label. Native.                                                                                                             |
| `Radio`          | `src/components/ui/radio.tsx`           | same as `Checkbox`                                                                                                                                                                                                                       | Group with `name` inside a `<fieldset>` with a `<legend>`.                                                                                |
| `FilterButton`   | `src/components/ui/filter-button.tsx`   | `active`, `caret`, button attributes                                                                                                                                                                                                     | Text tab, 44px, accent underline when active or open.                                                                                     |
| `FilterBar`      | `src/components/ui/filter-bar.tsx`      | `label`, `children`, `onReset`, `resetDisabled`, `sort`                                                                                                                                                                                  | Group on a hairline; Reset when `onReset`; `sort` right.                                                                                  |
| `Menu`           | `src/components/ui/menu.tsx`            | `label`, `groupLabel`, `options: {value, label, description, disabled}[]`, `active`, `align`, `portal`, and `mode: "multiple"` with `value: string[]` / `onApply(string[])` or `mode: "single"` with `value: string` / `onApply(string)` | Filter dropdown with Apply/Cancel. Client component.                                                                                      |
| `Popover`        | `src/components/ui/popover.tsx`         | `trigger`, `children`, `label`, `align`, `side`, `open`, `defaultOpen`, `onOpenChange`, `portal`, `className`                                                                                                                            | Radix. `PopoverClose` closes from inside. Client.                                                                                         |
| `Dialog`         | `src/components/ui/dialog.tsx`          | `trigger`, `title`, `description`, `children`, `footer`, `open`, `defaultOpen`, `onOpenChange`, `className`                                                                                                                              | Radix modal, sheet on phones. `DialogClose` for Apply.                                                                                    |
| `Table`          | `src/components/ui/table.tsx`           | `Table` (`minWidth`, `wrapperClassName`), `TableHead`, `TableBody`, `TableRow` (`header`), `TableHeaderCell` (`scope: col \| row`), `TableCell` (`emphasis`, `muted`), `TableGroupRow` (`colSpan`)                                       | Hairline rows in an `overflow-x-auto` box. Use an empty `TableCell` for the corner, never an empty header.                                |
| `Bar`            | `src/components/ui/bar.tsx`             | `label`, `value`, `max`, `valueLabel`, `tone: primary \| secondary`, `emphasis`, `labelWidth`                                                                                                                                            | 8px bar; the value text is the accessible value.                                                                                          |
| `LevelDot`       | `src/components/ui/level-dot.tsx`       | `level: DashboardLevel \| null`, `indicator?: DashboardIndicatorId`                                                                                                                                                                      | Dot + word from `labels`; "ELA Green" with an indicator.                                                                                  |
| `TypeDot`        | `src/components/ui/type-dot.tsx`        | `type: SchoolType`, `detail?: string`                                                                                                                                                                                                    | "District · public", "Charter · public", "Private".                                                                                       |
| `Dot`            | `src/components/ui/dot.tsx`             | `size: sm \| md`, `className` (a token `bg-*`)                                                                                                                                                                                           | The decorative dot behind both of the above.                                                                                              |
| `StatRow`        | `src/components/ui/stat-row.tsx`        | `stats: {key, value, label}[]` (up to four)                                                                                                                                                                                              | `<dl>`; two columns on phones, one row from `sm`.                                                                                         |
| `KeyValueList`   | `src/components/ui/key-value-list.tsx`  | `items: {key, label, value}[]`, `labelWidth`                                                                                                                                                                                             | Two-column `<dl>` with hairline rows.                                                                                                     |
| `Skeleton`       | `src/components/ui/skeleton.tsx`        | `lines`, `className`                                                                                                                                                                                                                     | `aria-hidden`; pulse stops under reduced motion.                                                                                          |
| `EmptyState`     | `src/components/ui/empty-state.tsx`     | `title`, `body`, `action`, `titleAs: h2 \| h3 \| p`                                                                                                                                                                                      | Plain, left-aligned, no box.                                                                                                              |
| `ResultRow`      | `src/components/ui/result-row.tsx`      | `number`, `summary: SchoolSummary`, `href`, `inCompare`, `onToggleCompare(cds)`, `compareDisabled`, `indicators`, `note`                                                                                                                 | Renders an `<li>`; put it in an `<ol>`. Client component.                                                                                 |
| `Caret`          | `src/components/ui/caret.tsx`           | `direction: down \| up`                                                                                                                                                                                                                  | Decorative triangle after menu triggers.                                                                                                  |
| `VisuallyHidden` | `src/components/ui/visually-hidden.tsx` | `as`, element attributes                                                                                                                                                                                                                 | Screen-reader-only text.                                                                                                                  |
| `ThemeToggle`    | `src/components/theme-toggle.tsx`       | `className`                                                                                                                                                                                                                              | Labelled select: system, light, dark.                                                                                                     |
| `LocaleSwitch`   | `src/components/locale-switch.tsx`      | `className`                                                                                                                                                                                                                              | Labelled select: English, Español. Keeps the path.                                                                                        |
| `SiteHeader`     | `src/components/site-header.tsx`        | none                                                                                                                                                                                                                                     | Wordmark, nav, language, theme.                                                                                                           |

Shared helpers in `src/components/ui`: `cx` joins class names; `Field` (`field.tsx`) is the label/hint/error wrapper behind `TextField` and `Select`; `Choice` (`choice.tsx`) is the row behind `Checkbox` and `Radio`; `test-utils.tsx` exports `renderWithIntl` (English messages loaded, jsdom stubs for Radix).

### Using the components

- Components without handlers (`LevelDot`, `TypeDot`, `Table`, `StatRow`, `KeyValueList`, `Bar`, `Skeleton`, `EmptyState`, `TextField`, `Select`, `Checkbox`) work in server components. `Menu`, `Popover`, `Dialog`, and `ResultRow` are client components; a server component may still render them with serializable props.
- `LevelDot` and `TypeDot` translate through the `labels` namespace; `ResultRow`, `FilterBar`, `Menu`, and `Dialog` use `common`. Everything else takes its text as props.
- Message keys the components rely on, under `common`: `join` ("{a} · {b}"), `gradeSpan`, `addressShort`, `students`, `studentTeacher`, `ratio`, `indicatorLevel`, `filterValue` ("{label}: {value}"), `actions.close`.
- Compose a `Menu` trigger label with `filterValue` and `useFormatter().list(values, { type: "unit" })`: "Type: District, Charter". Leave it at the bare label when nothing is narrowed and pass `active={false}`.
- Tests: every component has a `*.test.tsx` that runs `runAxe` and, where relevant, drives it with the keyboard. Tests that render `TextLink` mock `@/i18n/navigation`, because next-intl's `Link` needs the Next router.

## Do and don't

- Do separate with hairlines. Don't wrap list items in bordered cards.
- Do use text buttons inline. Don't use pill chips for categories or filters.
- Do show a dot and a word. Don't rely on color alone.
- Do write neutral, factual copy. Don't describe or characterize school types.
- Do keep one primary button per view. Don't stack filled buttons.
- Do use the popover shadow token for menus. Don't add shadows anywhere else.
