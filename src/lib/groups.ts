import type { Database } from "@/integrations/supabase/types";

export type UserGroup = Database["public"]["Tables"]["user_groups"]["Row"] & {
  parent_id?: string | null;
};

// Palette — bold saturated primaries (reference: personal site color blocks)
export const GROUP_PALETTE = [
  "#1a1a1a", // near-black
  "#C41E3A", // crimson
  "#C8E000", // chartreuse
  "#E8390E", // orange-red
  "#1B3A8C", // cobalt navy
  "#D4A017", // warm ochre
  "#006B54", // deep green
  "#8B1A3A", // burgundy
];

// Same palette doubles as default avatar colors
export const AVATAR_COLORS = GROUP_PALETTE;

export const primaryGroupColor = (groups: UserGroup[]): string | null =>
  groups.length > 0 ? groups[0].color : null;
