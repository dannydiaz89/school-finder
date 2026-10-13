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
  { name: "my schools", path: "/en/my-schools" },
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

test("the suite runs on the bundled sample data, never a real backend", async ({ page }) => {
  // The app reads Convex whenever it is given an address, and a developer's .env.local usually
  // has one. playwright.config.ts blanks it. If that ever stops working this suite would spend
  // a real deployment's usage allowance, so check with a school that exists in California's
  // data but not in the 40 sample schools: here it must be unknown.
  await page.goto("/en/school/19644856013080");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Murphy Ranch/);
  await expect(page.getByRole("main")).not.toContainText("East Whittier City Elementary");
  // And a sample school is known.
  await page.goto(`/en/school/${SCHOOL_CDS}`);
  await expect(page.getByRole("heading", { level: 1, name: SCHOOL_NAME })).toBeVisible();
});

test("home screen shows the name, the search form, and ways to start", async ({ page }) => {
  await page.goto("/en");
  const header = page.getByRole("banner");
  const main = page.getByRole("main");
  // The name is the page's heading, shown large; screen readers hear what the page is for.
  await expect(page.getByRole("heading", { level: 1, name: "Find a school" })).toBeVisible();
  await expect(main.getByText("SchoolFinder")).toBeVisible();
  // So the small wordmark in the header steps aside here.
  await expect(header.getByRole("link", { name: /SchoolFinder/ })).toHaveCount(0);
  await expect(header.getByRole("navigation", { name: "California School Finder" })).toBeVisible();
  // A first visit has nothing to pick up, only the examples.
  await expect(main.getByRole("link", { name: /My schools|Compare/ })).toHaveCount(0);
  await main.getByRole("link", { name: "95816" }).click();
  await expect(page).toHaveURL(/loc=zip/);
  await expect(main.locator("ol > li").first()).toBeVisible();
  // With results showing, the header wordmark is back and leads home.
  await expect(header.getByRole("link", { name: /SchoolFinder\s*California/ })).toBeVisible();
  // Home again: the search just run is offered.
  await header.getByRole("link", { name: /SchoolFinder\s*California/ }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(main.getByRole("link", { name: /95816 · within 3 mi/ })).toBeVisible();
});

test("search page renders the header and the search form", async ({ page }) => {
  await page.goto("/en");
  const header = page.getByRole("banner");
  await expect(header.getByRole("navigation", { name: "California School Finder" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel("Address, city, ZIP code, or school")).toBeVisible();
  await expect(page.getByRole("button", { name: "Find schools" })).toBeVisible();
});

test("language select switches to Spanish and keeps the page", async ({ page }) => {
  await page.goto("/en");
  await page.getByLabel("Language").selectOption("es");
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page.getByRole("navigation", { name: "Buscador de escuelas de California" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Buscador de escuelas de California/);
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

test("school detail page shows ratings and test scores by year", async ({ page }) => {
  await page.goto(`/en/school/${SCHOOL_CDS}`);
  const ratings = page.locator("#dashboard").getByRole("table", { name: "By year" });
  await expect(ratings.getByRole("columnheader")).toHaveText(["Indicator", "2023", "2024", "2025"]);
  await expect(ratings.getByRole("row", { name: /English Language Arts/ })).toContainText(
    "20.2 pts above",
  );
  const scores = page.locator("#tests").getByRole("table", { name: "By year" });
  await expect(scores.getByRole("row", { name: /Mathematics/ })).toHaveText(/57%.*56%.*57%/);
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
  // Wait for the first to register: the first row's button then reads "In compare list",
  // which makes nth(0) the second row.
  await expect(page.getByRole("link", { name: /Compare \(1\)/ })).toBeVisible();
  await toggles.nth(0).click();
  // The list lives in the browser, not the address, so the search address is unchanged.
  await expect(page).not.toHaveURL(/compare=/);
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
  // No location was given, so there is no distance. The map frames the matches themselves:
  // one pin here, and no home marker or search circle.
  const map = page.getByRole("region", { name: "Map of results" });
  await expect(map.locator(".maplibregl-map")).toBeVisible();
  await expect(map.locator(".maplibregl-marker")).toHaveCount(1);
  await expect(map.getByText(/Dashed ring/)).toHaveCount(0);
  await expect(main.locator("ol > li").first()).not.toContainText(/\d mi\b/);
  await main.getByRole("link", { name: "Theodore Judah Elementary" }).click();
  await expect(page).toHaveURL(/\/en\/school\/34674396034292/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Theodore Judah Elementary" }),
  ).toBeVisible();
});

test("a name shared by several schools puts each of them on the map", async ({ page }) => {
  await page.goto("/en?address=elementary");
  const map = page.getByRole("region", { name: "Map of results" });
  const rows = page.getByRole("main").locator("ol > li");
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThan(5);
  // Every match has coordinates in the fixtures, so there is a pin per row.
  await expect(map.locator(".maplibregl-marker")).toHaveCount(count);
  // A pin opens its school, as on any results map.
  await map.locator(".maplibregl-marker").first().click();
  await expect(page).toHaveURL(/\/en\/school\/\d{14}/);
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

test("hovering a map pin shows that school's basic facts", async ({ page }) => {
  await page.goto(SEARCH_URL);
  const pins = page.locator(".maplibregl-marker span.cursor-pointer");
  await expect(pins.first()).toBeVisible();
  const rows = page.getByRole("main").locator("ol > li");
  const name = (await rows.nth(1).getByRole("link").first().innerText()).trim();
  await pins.nth(1).hover();
  const card = page.locator(".maplibregl-map").locator("xpath=..").locator("div.absolute.z-10");
  await expect(card).toContainText(name);
  await expect(card).toContainText(/public|Private/);
  await expect(card).toContainText(/ mi/);
  // The matching row is highlighted, and leaving the pin removes the card.
  await expect(rows.nth(1)).toHaveClass(/bg-bg-subtle/);
  await page.mouse.move(5, 5);
  await expect(card).toHaveCount(0);
});

test("the pin card never covers its pin, at any window width", async ({ page }) => {
  // Regression: on a short map the card docked over the bottom pins, took the hover away
  // from the pin under the pointer, and flickered.
  for (const width of [700, 1000, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(SEARCH_URL);
    const pins = page.locator(".maplibregl-marker span.cursor-pointer");
    await expect(pins.first()).toBeVisible();
    const card = page.locator(".maplibregl-map").locator("xpath=..").locator("div.absolute.z-10");
    const count = await pins.count();
    for (let index = 0; index < count; index += 3) {
      const pin = await pins.nth(index).boundingBox();
      if (!pin) continue;
      const x = pin.x + pin.width / 2;
      const y = pin.y + pin.height / 2;
      await page.mouse.move(5, 5);
      await page.mouse.move(x, y);
      await expect(card).toHaveCount(1);
      const box = await card.boundingBox();
      const covers =
        box !== null && x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height;
      expect(covers, `card covers pin ${index + 1} at width ${width}`).toBe(false);
      // Still showing after a moment: it did not flicker away.
      await page.waitForTimeout(150);
      await expect(card).toHaveCount(1);
    }
  }
});

test("clicking a map pin opens that school's page", async ({ page }) => {
  await page.goto(SEARCH_URL);
  const pins = page.locator(".maplibregl-marker span.cursor-pointer");
  await expect(pins.first()).toBeVisible();
  const name = (
    await page.getByRole("main").locator("ol > li").nth(1).getByRole("link").first().innerText()
  ).trim();
  await pins.nth(1).click();
  await expect(page).toHaveURL(/\/en\/school\/\d{14}/);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  // The search travels with the visitor, so Back and "distance from" keep working.
  await expect(page).toHaveURL(/lat=/);
});

test("the compare list survives a new search, the header links, and a reload", async ({ page }) => {
  // Regression: the list lived only in the address, so searching somewhere else emptied it.
  const header = page.getByRole("banner");
  const box = page.getByLabel("Address, city, ZIP code, or school");
  const firstAdd = page.getByRole("main").getByRole("button", { name: "Add to compare" }).first();

  await page.goto("/en");
  await box.fill("Sacramento");
  await page.getByRole("button", { name: "Find schools" }).click();
  await expect(page).toHaveURL(/loc=city/);
  await firstAdd.click();
  await expect(header.getByRole("link", { name: "Compare (1)" })).toBeVisible();

  // A different search.
  await box.fill("95816");
  await page.getByRole("button", { name: "Find schools" }).click();
  await expect(page).toHaveURL(/loc=zip/);
  await expect(header.getByRole("link", { name: "Compare (1)" })).toBeVisible();
  await firstAdd.click();
  await expect(header.getByRole("link", { name: "Compare (2)" })).toBeVisible();

  // A link that carries nothing, then a full reload.
  await header.getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(header.getByRole("link", { name: "Compare (2)" })).toBeVisible();
  await page.reload();
  await expect(header.getByRole("link", { name: "Compare (2)" })).toBeVisible();

  // And the compare page shows both, with the list in its address for sharing.
  await header.getByRole("link", { name: "Compare (2)" }).click();
  await expect(page).toHaveURL(/\/en\/compare\?compare=\d{14},\d{14}/);
  await expect(page.getByRole("table").locator("thead a")).toHaveCount(2);
});

test("the header Search link returns to the last results from other pages", async ({ page }) => {
  // Regression: Compare, then Search, landed on an empty search page.
  const header = page.getByRole("banner");
  const rows = page.getByRole("main").locator("ol > li");

  await page.goto("/en");
  await page.getByLabel("Address, city, ZIP code, or school").fill("Sacramento");
  await page.getByRole("button", { name: "Find schools" }).click();
  await expect(page).toHaveURL(/loc=city/);
  await expect(rows.first()).toBeVisible();
  const results = page.url();

  await header.getByRole("link", { name: /^Compare/ }).click();
  await expect(page).toHaveURL(/\/en\/compare/);
  await header.getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL(results);
  await expect(rows.first()).toBeVisible();

  // A page whose address carries nothing about the search.
  await header.getByRole("link", { name: "Data sources" }).click();
  await expect(page).toHaveURL(/\/en\/about\/data$/);
  await header.getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL(results);

  // On the search page the link starts over, and that is remembered too.
  await header.getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await header.getByRole("link", { name: "Data sources" }).click();
  await header.getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/en$/);
});

test("My schools keeps a list across pages and a reload, and removes from it", async ({ page }) => {
  const header = page.getByRole("banner");
  const table = page.getByRole("table", { name: "My schools" });

  // Empty to start with.
  await page.goto("/en/my-schools");
  await expect(page.getByText("No schools saved yet")).toBeVisible();

  // Save one from its own page, then a different one from search results.
  await page.goto(`/en/school/${SCHOOL_CDS}`);
  await page.getByRole("main").getByRole("button", { name: "Add to My schools" }).first().click();
  await expect(header.getByRole("link", { name: "My schools (1)" })).toBeVisible();
  await page.goto(SEARCH_URL);
  // The school already saved reads "In My schools", so the first "Add" is another school.
  await page.getByRole("button", { name: "Add to My schools" }).first().click();
  await expect(header.getByRole("link", { name: "My schools (2)" })).toBeVisible();

  // The header link opens the list with a row per school.
  await header.getByRole("link", { name: "My schools (2)" }).click();
  await expect(page).toHaveURL(/\/en\/my-schools\?schools=\d{14},\d{14}/);
  await expect(table.getByRole("link", { name: SCHOOL_NAME })).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(table.getByRole("row", { name: new RegExp(SCHOOL_NAME) })).toContainText(
    "31.5 pts above standard",
  );

  // A bookmark without the list in its address still shows it, as does a reload.
  await page.goto("/en/my-schools");
  await expect(table.getByRole("link", { name: SCHOOL_NAME })).toBeVisible();
  await page.reload();
  await expect(table.getByRole("link", { name: SCHOOL_NAME })).toBeVisible();

  // Removing is immediate and the header follows.
  await page.getByRole("button", { name: `Remove ${SCHOOL_NAME} from My schools` }).click();
  await expect(table.getByRole("link", { name: SCHOOL_NAME })).toHaveCount(0);
  await expect(header.getByRole("link", { name: "My schools (1)" })).toBeVisible();
  await expect(table.getByRole("row")).toHaveCount(2);
});

test("a compare link opened directly shows that comparison and removing a school updates it", async ({
  page,
}) => {
  await page.goto("/en/compare?compare=34674396034292,34674390102038,34674393435419");
  const columns = page.getByRole("table").locator("thead a");
  await expect(columns).toHaveCount(3);
  await expect(page.getByRole("banner").getByRole("link", { name: "Compare (3)" })).toBeVisible();
  await page
    .getByRole("table")
    .getByRole("button", { name: /Remove/ })
    .first()
    .click();
  await expect(columns).toHaveCount(2);
  await expect(page).toHaveURL(/compare=34674390102038,34674393435419/);
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page).not.toHaveURL(/compare=/);
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Compare", exact: true }),
  ).toBeVisible();
});

test("wide tables scroll inside themselves on a phone, not the page", async ({ page }) => {
  // Regression: screen-reader text inside a table cell escaped the scrolling box and
  // made the whole page scroll sideways.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`/en/compare?compare=${SCHOOL_CDS},34674390102038,34674396034326`);
  await expect(page.getByRole("table")).toBeVisible();
  const overflows = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  expect(await overflows()).toBe(false);
  await page.goto(`/en/school/${SCHOOL_CDS}`);
  await expect(page.getByRole("table", { name: "By year" }).first()).toBeVisible();
  expect(await overflows()).toBe(false);
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
