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
  // Let color transitions finish before axe samples computed colors.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );
  await page.waitForTimeout(350);
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
  await expect(page.getByLabel("Address, city, ZIP code, or school")).toBeVisible();
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
  await expect(rows).toHaveCount(12);
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

/** A search URL with coordinates already resolved, so no geocoder call is needed. */
const SEARCH_URL =
  "/en?address=1420+J+Street%2C+Sacramento%2C+CA+95814&lat=38.57871&lng=-121.48766&radius=3";

test("search results lead to a school page and the compare list", async ({ page }) => {
  await page.goto(SEARCH_URL);
  const rows = page.getByRole("main").getByRole("list").first().getByRole("listitem");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(5);

  // Add two schools to the compare list; the URL carries the list.
  const toggles = page.getByRole("button", { name: /Add to compare/ });
  await toggles.nth(0).click();
  await toggles.nth(0).click(); // the first row's button is now "In compare list", so nth(0) is the second row
  await expect(page).toHaveURL(/compare=\d{14}(%2C|,)\d{14}/);
  await expect(page.getByRole("link", { name: /Compare \(2\)/ })).toBeVisible();

  // Open the first result's details.
  await page.getByRole("link", { name: "Details" }).first().click();
  await expect(page).toHaveURL(/\/en\/school\/\d{14}/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/compare=/);

  // The compare page shows both schools as columns.
  await page.getByRole("link", { name: /Compare \(2\)/ }).click();
  await expect(page).toHaveURL(/\/en\/compare\?compare=/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/2/);
  const columns = page.getByRole("table").locator("thead a");
  await expect(columns).toHaveCount(2);
});

test("going back from a school page restores the results and the map", async ({ page }) => {
  // Regression: the map is recreated when the page is restored from history, and
  // drawing the radius ring before its style loaded threw "Style is not done loading".
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(SEARCH_URL);
  await expect(page.locator(".maplibregl-marker").first()).toBeVisible();
  for (const index of [0, 1]) {
    await page.getByRole("link", { name: "Details" }).nth(index).click();
    await expect(page).toHaveURL(/\/en\/school\/\d{14}/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/en\?/);
    await expect(page.locator(".maplibregl-marker").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Details" }).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

for (const { query, loc } of [
  { query: "Sacramento", loc: "city" },
  { query: "95816", loc: "zip" },
] as const) {
  test(`searching by ${loc} lists schools around its center`, async ({ page }) => {
    // Cities and ZIP codes resolve from the bundled Census table, so this needs no network.
    await page.goto("/en");
    await page.getByLabel("Address, city, ZIP code, or school").fill(query);
    await page.getByRole("button", { name: "Find schools" }).click();
    await expect(page).toHaveURL(new RegExp(`loc=${loc}.*lat=|lat=.*loc=${loc}`));
    const rows = page.getByRole("main").getByRole("list").first().getByRole("listitem");
    await expect(rows.first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Search center")).toBeVisible();
  });
}

test("searching by school name lists matching schools and opens one", async ({ page }) => {
  await page.goto("/en");
  await page.getByLabel("Address, city, ZIP code, or school").fill("theodore judah");
  await page.getByRole("button", { name: "Find schools" }).click();
  const main = page.getByRole("main");
  await expect(main.getByText(/1 school matching/)).toBeVisible();
  // No location was given, so there is no map and no distance.
  await expect(page.locator(".maplibregl-map")).toHaveCount(0);
  await main.getByRole("link", { name: "Theodore Judah Elementary" }).click();
  await expect(page).toHaveURL(/\/en\/school\/34674396034292/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Theodore Judah Elementary" }),
  ).toBeVisible();
});

test("a school name can be narrowed with its city", async ({ page }) => {
  await page.goto("/en?address=elementary+sacramento");
  // Direct children only: each row holds a nested list of rating dots.
  const rows = page.getByRole("main").locator("ol > li");
  await expect(rows.first()).toBeVisible();
  for (const text of await rows.allInnerTexts()) expect(text).toMatch(/Elementary/);
});

test("an unknown place says so", async ({ page }) => {
  // A ZIP code outside California is answered from the bundled table; no geocoder call.
  await page.goto("/en?address=00000");
  await expect(page.getByRole("heading", { name: "Nothing found" })).toBeVisible();
});

test("type filter narrows results and is reflected in the URL", async ({ page }) => {
  await page.goto(SEARCH_URL);
  await page.getByRole("button", { name: /^Type/ }).click();
  const dialog = page.getByRole("dialog").or(page.locator("[data-radix-popper-content-wrapper]"));
  await dialog.getByLabel(/District/).uncheck();
  await dialog.getByLabel(/Private/).uncheck();
  await dialog.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/types=charter/);
  await expect(page.getByRole("button", { name: /^Type: Charter/ })).toBeVisible();
});
