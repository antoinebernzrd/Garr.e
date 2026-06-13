import type { Database } from "@/integrations/supabase/types";
import type { UserGroup } from "@/lib/groups";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UpdateRow = Database["public"]["Tables"]["updates"]["Row"];
export type NextUpItem = Database["public"]["Tables"]["next_up_items"]["Row"];
export type Friendship = Database["public"]["Tables"]["friendships"]["Row"];

export type UpdateWithItems = UpdateRow & { next_up_items: NextUpItem[] };

export type FriendWithUpdate = {
  profile: Profile;
  latestUpdate: UpdateWithItems | null;
  groups: UserGroup[];
};
