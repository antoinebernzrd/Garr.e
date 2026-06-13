import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Profile, UpdateRow } from "@/lib/types";
import { Avatar } from "@/components/loop/avatar";
import { AppSubNav } from "@/components/loop/app-subnav";
import { formatDistanceToNow } from "date-fns";
import { Hand } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  component: NotificationsPage,
});

type Tab = "waves" | "requests" | "updates";

type WaveRow = { id: string; message: string | null; created_at: string; from: Profile | null };
type RequestRow = { id: string; created_at: string; profile: Profile | null };
type UpdateItem = { update: UpdateRow; author: Profile | null };

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("waves");

  const { data: waves = [] } = useQuery({
    enabled: !!user,
    queryKey: ["waves-received", user?.id],
    queryFn: async (): Promise<WaveRow[]> => {
      const { data: ws } = await supabase
        .from("waves")
        .select("id, message, created_at, from_user_id")
        .eq("to_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const ids = [...new Set((ws ?? []).map((w) => w.from_user_id))];
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [(p as Profile).id, p as Profile]));
      return (ws ?? []).map((w) => ({
        id: w.id,
        message: w.message,
        created_at: w.created_at,
        from: map.get(w.from_user_id) ?? null,
      }));
    },
    refetchInterval: 30000,
  });

  const { data: incoming = [] } = useQuery({
    enabled: !!user,
    queryKey: ["incoming-requests", user?.id],
    queryFn: async (): Promise<RequestRow[]> => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user!.id)
        .eq("status", "pending");
      const ids = (fs ?? []).map((f) => f.requester_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [(p as Profile).id, p as Profile]));
      return (fs ?? []).map((f) => ({ id: f.id, created_at: f.created_at, profile: map.get(f.requester_id) ?? null }));
    },
    refetchInterval: 30000,
  });

  const { data: updates = [] } = useQuery({
    enabled: !!user,
    queryKey: ["recent-updates", user?.id],
    queryFn: async (): Promise<UpdateItem[]> => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted");
      const friendIds = (fs ?? [])
        .map((f) => (f.requester_id === user!.id ? f.addressee_id : f.requester_id))
        .filter((id) => id !== user!.id);
      if (!friendIds.length) return [];
      const [{ data: ups }, { data: profs }] = await Promise.all([
        supabase
          .from("updates")
          .select("*")
          .in("user_id", friendIds)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("profiles").select("*").in("id", friendIds),
      ]);
      const map = new Map((profs ?? []).map((p) => [(p as Profile).id, p as Profile]));
      return ((ups ?? []) as UpdateRow[]).map((u) => ({ update: u, author: map.get(u.user_id) ?? null }));
    },
  });

  async function accept(id: string) {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Friend added");
    qc.invalidateQueries();
  }

  async function decline(id: string) {
    await supabase.from("friendships").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["incoming-requests"] });
  }

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "waves", label: "Waves", count: waves.length },
    { id: "requests", label: "Friend requests", count: incoming.length },
    { id: "updates", label: "Recent updates", count: updates.length },
  ];

  return (
    <>
      <AppSubNav eyebrow="Activity" title="Notifications" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                tab === t.id
                  ? "border-primary text-ink"
                  : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              {t.label}
              {t.count > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span>}
            </button>
          ))}
        </div>

        {tab === "waves" && (
          <div className="space-y-2">
            {waves.length === 0 ? (
              <Empty>No waves yet. When friends wave or reply, they show up here.</Empty>
            ) : (
              waves.map((w) => (
                <div key={w.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card/50 p-3">
                  {w.from ? (
                    <Avatar name={w.from.name} color={w.from.avatar_color} size={40} />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Hand className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">
                      <span className="font-medium">{w.from?.name ?? "Someone"}</span>{" "}
                      {w.message ? "replied" : "waved at you"} 👋
                    </p>
                    {w.message && <p className="mt-0.5 text-sm text-ink-soft">“{w.message}”</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "requests" && (
          <div className="space-y-2">
            {incoming.length === 0 ? (
              <Empty>No friend requests right now.</Empty>
            ) : (
              incoming.map((r) =>
                r.profile ? (
                  <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 p-3">
                    <Avatar name={r.profile.name} color={r.profile.avatar_color} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{r.profile.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        @{r.profile.username} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={() => accept(r.id)}
                      className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs text-primary-foreground hover:opacity-90"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => decline(r.id)}
                      className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs text-muted-foreground hover:text-destructive"
                    >
                      Decline
                    </button>
                  </div>
                ) : null,
              )
            )}
          </div>
        )}

        {tab === "updates" && (
          <div className="space-y-2">
            {updates.length === 0 ? (
              <Empty>No recent updates from your friends.</Empty>
            ) : (
              updates.map(({ update, author }) => (
                <div key={update.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card/50 p-4">
                  {author && <Avatar name={author.name} color={author.avatar_color} size={40} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium text-ink">{author?.name ?? "A friend"}</span>
                      {update.city && <span className="text-muted-foreground"> · {update.city}</span>}
                    </p>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink">{update.text}</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
