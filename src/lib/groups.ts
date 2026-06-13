import type { Database } from "@/integrations/supabase/types";

export type UserGroup = Database["public"]["Tables"]["user_groups"]["Row"];

// Palette of 8 distinct colors offered when creating/editing a group
export const GROUP_PALETTE = [
  "#C2410C", // amber
  "#0F766E", // teal
  "#1E3A8A", // navy
  "#9D174D", // wine
  "#4D7C0F", // olive
  "#7C2D12", // umber
  "#475569", // slate
  "#B45309", // ochre
];

// Same palette doubles as default avatar colors
export const AVATAR_COLORS = GROUP_PALETTE;

export const primaryGroupColor = (groups: UserGroup[]): string | null =>
  groups.length > 0 ? groups[0].color : null;
