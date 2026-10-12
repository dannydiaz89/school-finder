import { describe, expect, it } from "vitest";
import { matchesName, nameRank, normalizeName, rankByName } from "./names";

describe("matchesName", () => {
  it.each([
    ["Theodore Judah Elementary", "judah"],
    ["Theodore Judah Elementary", "Theodore Judah"],
    ["Theodore Judah Elementary", "judah elem"],
    ["Theodore Judah Elementary", "JUDAH ELEMENTARY"],
    ["C. K. McClatchy High", "mcclatchy"],
    ["C. K. McClatchy High", "ck mcclatchy".replace("ck", "c k")],
    ["St. Francis of Assisi Elementary School", "st francis"],
    ["La Cañada High", "la canada"],
    ["Crocker/Riverside Elementary", "crocker riverside"],
  ])("%j matches %j", (name, query) => {
    expect(matchesName(name, query)).toBe(true);
  });

  it.each([
    ["Theodore Judah Elementary", "washington"],
    ["Theodore Judah Elementary", "judah high"],
    ["Theodore Judah Elementary", "udah"],
    ["Theodore Judah Elementary", ""],
    ["Theodore Judah Elementary", "  "],
  ])("%j does not match %j", (name, query) => {
    expect(matchesName(name, query)).toBe(false);
  });
});

describe("ranking", () => {
  const names = [
    "East Washington Academy",
    "Washington Elementary",
    "Washington",
    "George Washington Carver High",
    "Lincoln Elementary",
  ];
  it("puts exact, then starts-with, then the rest, and drops non-matches", () => {
    expect(rankByName(names, "washington", (n) => n)).toEqual([
      "Washington",
      "Washington Elementary",
      "East Washington Academy",
      "George Washington Carver High",
    ]);
  });
  it("ranks an exact name ahead of a longer one", () => {
    expect(nameRank("Washington", "washington")).toBeLessThan(
      nameRank("Washington Elementary", "washington"),
    );
  });
  it("breaks ties with the second key", () => {
    const rows = [
      { name: "Washington Elementary", city: "Sacramento" },
      { name: "Washington Elementary", city: "Bakersfield" },
    ];
    expect(
      rankByName(
        rows,
        "washington elementary",
        (r) => r.name,
        (r) => r.city,
      ).map((r) => r.city),
    ).toEqual(["Bakersfield", "Sacramento"]);
  });
});

describe("narrowing by city or district", () => {
  const rows = [
    { name: "Washington Elementary", city: "Bellflower", district: "Bellflower Unified" },
    { name: "Washington Elementary", city: "Sacramento", district: "Sacramento City Unified" },
    { name: "Sacramento Charter High", city: "Sacramento", district: "Sacramento City Unified" },
    { name: "Lincoln Elementary", city: "Sacramento", district: "Twin Rivers Unified" },
  ];
  const find = (query: string) =>
    rankByName(
      rows,
      query,
      (r) => r.name,
      (r) => `${r.city} ${r.district}`,
    ).map((r) => `${r.name}, ${r.city}`);

  it("uses extra words to pick the namesake in that city", () => {
    expect(find("washington elementary sacramento")).toEqual(["Washington Elementary, Sacramento"]);
    expect(find("washington bellflower")).toEqual(["Washington Elementary, Bellflower"]);
  });
  it("matches on district words too", () => {
    expect(find("lincoln twin rivers")).toEqual(["Lincoln Elementary, Sacramento"]);
  });
  it("ranks a school named for the word ahead of schools merely located there", () => {
    expect(find("sacramento")[0]).toBe("Sacramento Charter High, Sacramento");
    expect(find("sacramento")).toHaveLength(3);
  });
  it("still requires every word to match something", () => {
    expect(find("washington elementary fresno")).toEqual([]);
  });
});

describe("normalizeName", () => {
  it("drops case, accents, and punctuation", () => {
    expect(normalizeName("St. Mary's — Cañada")).toBe("st mary s canada");
  });
});
