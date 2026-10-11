import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * One smoke flow over the fixtures backend. Each page the app has today is
 * loaded once per theme and checked with axe. Keep this file small: things a
 * unit test can cover do not belong here (AGENTS.md, Testing).
 */

/** A real school from src/fixtures/schools.json. */
const SCHOOL_CDS = "34674396034292";
const SCHOOL_NAME = "Theodore Judah Elementary";

const PAGES = [
  { name: "search", path: "/en" },
  { name: "school detail", path: `/en/school/${SCHOOL_CDS}` },
  { name: "compare", path: "/en/compare" },
  { name: "data sources", path: "/en/about/data" },
] as const;

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

/** Pick a theme through the header control and wait for next-themes to apply it. */
async function setTheme(page: Page, theme: Theme) {
  await page.getByLabel("Theme").selectOption(theme);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target).join(", ")}`),
  ).toEqual([]);
}

test("search page renders the header and the search form", async ({ page }) => {
  await page.goto("/en");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "School Finder" })).toBeVisible();
  await expect(header.getByRole("navigation", { name: "School Finder" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel("Home address")).toBeVisible();
  await expect(page.getByRole("button", { name: "Find schools" })).toBeVisible();
});

test("language select switches to Spanish and keeps the page", async ({ page }) => {
  await page.goto("/en");
  await page.getByLabel("Language").selectOption("es");
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("navigation", { name: "Buscador de escuelas" })).toBeVisible();
  await expect(page).toHaveTitle(/Buscador de escuelas/);
});

test("theme select switches data-theme to dark and back", async ({ page }) => {
  await page.goto("/en");
  await setTheme(page, "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await setTheme(page, "light");
});

test("school detail page renders a fixture school", async ({ page }) => {
  await page.goto(`/en/school/${SCHOOL_CDS}`);
  await expect(page.getByRole("heading", { level: 1, name: SCHOOL_NAME })).toBeVisible();
  await expect(page.getByRole("main")).toContainText(SCHOOL_CDS);
});

test("compare page renders", async ({ page }) => {
  await page.goto("/en/compare");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Compar/);
});

test("data sources page lists every source with a link", async ({ page }) => {
  await page.goto("/en/about/data");
  await expect(page.getByRole("heading", { level: 1, name: "Data sources" })).toBeVisible();
  const rows = page.getByRole("table").locator("tbody tr");
  await expect(rows).toHaveCount(11);
  await expect(rows.first().getByRole("link")).toHaveAttribute("href", /cde\.ca\.gov/);
});

for (const theme of THEMES) {
  test.describe(`${theme} theme`, () => {
    for (const { name, path } of PAGES) {
      test(`${name} page has no serious axe violations`, async ({ page }) => {
        await page.goto(path);
        await setTheme(page, theme);
        await expectNoSeriousAxeViolations(page);
      });
    }
  });
}

// TODO(search): type a fixture address, submit, and assert numbered result rows.
// TODO(detail): open the first result's "Details" link and assert the school heading.
// TODO(compare): click "Add to compare" on a result, open /compare, and assert the
// school appears as a column. Enable once the Search, Detail, and Compare
// workstreams land their pages.
