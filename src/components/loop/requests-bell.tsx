import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { Avatar } from "./avatar";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";

type PendingRow = {
  id: string;
  requester_id: string;
  created_at: string;
  requester: Profile | null;
};

export function RequestsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: pending = [] } = useQuery({
    enabled: !!user,
    queryKey: ["pending-requests", user?.id],
    queryFn: async (): Promise<PendingRow[]> => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user!.id)
        .eq("status", "pending");
      const ids = (fs ?? []).map((f) => f.requester_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p as Profile]));
      return (fs ?? []).map((f) => ({ ...f, requester: map.get(f.requester_id) ?? null }));
    },
    refetchInterval: 30000,
  });

  async function accept(id: string) {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Friend added");
      qc.invalidateQueries();
    }
  }

  async function decline(id: string) {
    await supabase.from("friendships").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["pending-requests"] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-accent">
          <Bell className="h-4 w-4" />
          {pending.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {pending.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-border p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Friend requests</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {pending.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">All caught up.</p>
          ) : (
            pending.map((r) =>
              r.requester ? (
                <div key={r.id} className="flex items-center gap-3 border-b border-border p-3 last:border-0">
                  <Avatar name={r.requester.name} color={r.requester.avatar_color} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.requester.name}</p>
                    <p className="text-[11px] text-muted-foreground">@{r.requester.username}</p>
                  </div>
                  <button
                    onClick={() => accept(r.id)}
                    className="rounded-full bg-primary px-2.5 py-1 text-[11px] text-primary-foreground hover:opacity-90"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => decline(r.id)}
                    className="text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    Decline
                  </button>
                </div>
              ) : null,
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
