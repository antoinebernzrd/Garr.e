import { describe, expect, it } from "vitest";
import { AVATAR_COLORS, GROUP_PALETTE, primaryGroupColor, type UserGroup } from "./groups";

const group = (color: string) => ({ color }) as UserGroup;

describe("primaryGroupColor", () => {
  it("is the first group's colour, or null without groups", () => {
    expect(primaryGroupColor([group("#111111"), group("#222222")])).toBe("#111111");
    expect(primaryGroupColor([])).toBeNull();
  });
});

describe("palette", () => {
  it("is made of unique hex colours shared with avatars", () => {
    expect(new Set(GROUP_PALETTE).size).toBe(GROUP_PALETTE.length);
    for (const c of GROUP_PALETTE) expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(AVATAR_COLORS).toBe(GROUP_PALETTE);
  });
});
