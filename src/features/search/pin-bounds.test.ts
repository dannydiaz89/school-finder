import { describe, expect, it } from "vitest";
import { CALIFORNIA, boundsOf } from "./pin-bounds";

describe("boundsOf", () => {
  it("frames every point", () => {
    // Lincoln High in Stockton, San Jose, and San Diego.
    const box = boundsOf([
      { latitude: 38.02, longitude: -121.33 },
      { latitude: 37.33, longitude: -121.92 },
      { latitude: 32.7, longitude: -117.1 },
    ]);
    expect(box).toEqual({ west: -121.92, south: 32.7, east: -117.1, north: 38.02 });
  });

  it("gives a single school some map around it", () => {
    const box = boundsOf([{ latitude: 38.5, longitude: -121.5 }]);
    expect(box.east - box.west).toBeCloseTo(0.04);
    expect(box.north - box.south).toBeCloseTo(0.04);
    expect((box.east + box.west) / 2).toBeCloseTo(-121.5);
    expect((box.north + box.south) / 2).toBeCloseTo(38.5);
  });

  it("shows the whole state when there is nothing to frame", () => {
    expect(boundsOf([])).toEqual(CALIFORNIA);
  });
});
