import { describe, expect, it } from "vitest";
import { CITY_PRESETS, findCityPreset, projectLatLng } from "./cities";

describe("findCityPreset", () => {
  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(findCityPreset("  pARis ")?.name).toBe("Paris");
    expect(findCityPreset("new york")?.name).toBe("New York");
  });

  it("returns null for unknown, empty or missing cities", () => {
    expect(findCityPreset("Atlantis")).toBeNull();
    expect(findCityPreset("")).toBeNull();
    expect(findCityPreset(null)).toBeNull();
    expect(findCityPreset(undefined)).toBeNull();
  });
});

describe("projectLatLng", () => {
  it("maps the corners and centre of the world onto the unit square", () => {
    expect(projectLatLng(90, -180)).toEqual({ x: 0, y: 0 });
    expect(projectLatLng(-90, 180)).toEqual({ x: 1, y: 1 });
    expect(projectLatLng(0, 0)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("puts the northern hemisphere above the southern one", () => {
    const paris = findCityPreset("Paris")!;
    const sydney = findCityPreset("Sydney")!;
    expect(projectLatLng(paris.lat, paris.lng).y).toBeLessThan(projectLatLng(sydney.lat, sydney.lng).y);
  });
});

describe("CITY_PRESETS", () => {
  it("has unique names and valid coordinates", () => {
    const names = CITY_PRESETS.map((c) => c.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const c of CITY_PRESETS) {
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lng)).toBeLessThanOrEqual(180);
    }
  });
});
