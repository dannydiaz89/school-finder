import { describe, expect, it } from "vitest";
import { haversineMeters } from "@/lib/domain/geo";
import { locatePlace, normalizePlaceName, PLACE_COUNTS } from "./places";

const near = (
  match: { latitude: number; longitude: number } | null,
  latitude: number,
  longitude: number,
  km: number,
) => match !== null && haversineMeters(match, { latitude, longitude }) < km * 1000;

describe("locatePlace", () => {
  it("covers the state", () => {
    expect(PLACE_COUNTS.places).toBeGreaterThan(1500);
    expect(PLACE_COUNTS.zips).toBeGreaterThan(1700);
  });

  it.each([
    ["Sacramento", "Sacramento, CA"],
    ["sacramento", "Sacramento, CA"],
    ["  Sacramento,  CA ", "Sacramento, CA"],
    ["Sacramento, California", "Sacramento, CA"],
    ["Sacramento CA 95814", "Sacramento, CA"],
    ["City of Fresno", "Fresno, CA"],
    ["san francisco", "San Francisco, CA"],
    ["La Canada Flintridge", "La Cañada Flintridge, CA"],
    ["La Cañada Flintridge", "La Cañada Flintridge, CA"],
    ["Ventura", "Ventura, CA"],
    ["San Buenaventura", "Ventura, CA"],
    ["Paso Robles", "Paso Robles, CA"],
    ["Arden-Arcade", "Arden-Arcade, CA"],
    ["arden arcade", "Arden-Arcade, CA"],
  ])("finds the city in %j", (query, label) => {
    const match = locatePlace(query);
    expect(match).toMatchObject({ kind: "city", label });
  });

  it("puts cities where they are", () => {
    expect(near(locatePlace("Sacramento"), 38.58, -121.49, 8)).toBe(true);
    expect(near(locatePlace("San Diego"), 32.72, -117.16, 20)).toBe(true);
    expect(near(locatePlace("Redding"), 40.59, -122.39, 8)).toBe(true);
  });

  it("prefers an incorporated city over a same-named community", () => {
    // El Cerrito the city is on San Francisco Bay; the community is in Riverside County.
    expect(near(locatePlace("El Cerrito"), 37.92, -122.31, 5)).toBe(true);
  });

  it.each(["95816", " 95816 ", "95816-1234"])("finds the ZIP code in %j", (query) => {
    const match = locatePlace(query);
    expect(match).toMatchObject({ kind: "zip", label: "95816" });
    expect(near(match, 38.575, -121.465, 4)).toBe(true);
  });

  it("falls back to the ZIP code when the name is unknown", () => {
    expect(locatePlace("Midtown, CA 95816")).toMatchObject({ kind: "zip", label: "95816" });
  });

  it.each([
    "1430 N Street, Sacramento, CA 95814",
    "915 L Street",
    "Main Street, Sacramento",
    "Midtown",
    "00501",
    "10001",
    "Portland, OR",
    "",
    "   ",
  ])("leaves %j to the street geocoder", (query) => {
    expect(locatePlace(query)).toBeNull();
  });
});

describe("normalizePlaceName", () => {
  it("drops case, accents, and punctuation", () => {
    expect(normalizePlaceName(" La Cañada-Flintridge ")).toBe("la canada flintridge");
    expect(normalizePlaceName("St. Helena")).toBe("st helena");
  });
});
