import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Profile } from "@/lib/types";
import type { UserGroup } from "@/lib/groups";
import { Avatar } from "@/components/loop/avatar";
import { AppSubNav } from "@/components/loop/app-subnav";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Link2, Tag, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/friends")({
  component: FriendsPage,
});

type FriendRow = { profile: Profile; groupIds: string[] };
type RequestRow = { id: string; created_at: string; profile: Profile | null };

function FriendsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: groups = [] } = useQuery({
    enabled: !!user,
    queryKey: ["user_groups", user?.id],
    queryFn: async (): Promise<UserGroup[]> => {
      const { data } = await supabase
        .from("user_groups")
        .select("*")
        .eq("owner_id", user!.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      return (data ?? []) as UserGroup[];
    },
  });

  const { data: friends = [] } = useQuery({
    enabled: !!user,
    queryKey: ["friends-page", user?.id],
    queryFn: async (): Promise<FriendRow[]> => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted");
      const friendIds = (fs ?? [])
        .map((f) => (f.requester_id === user!.id ? f.addressee_id : f.requester_id))
        .filter((id) => id !== user!.id);
      if (friendIds.length === 0) return [];
      const [{ data: profs }, { data: assigns }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", friendIds),
        supabase.from("friend_assignments").select("friend_id,group_id").eq("owner_id", user!.id),
      ]);
      const byFriend = new Map<string, string[]>();
      for (const a of assigns ?? []) {
        const arr = byFriend.get(a.friend_id) ?? [];
        arr.push(a.group_id);
        byFriend.set(a.friend_id, arr);
      }
      return (profs ?? [])
        .map((p) => ({ profile: p as Profile, groupIds: byFriend.get((p as Profile).id) ?? [] }))
        .sort((a, b) => a.profile.name.localeCompare(b.profile.name));
    },
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

  const { data: sent = [] } = useQuery({
    enabled: !!user,
    queryKey: ["sent-requests", user?.id],
    queryFn: async (): Promise<RequestRow[]> => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("id, addressee_id, created_at")
        .eq("requester_id", user!.id)
        .eq("status", "pending");
      const ids = (fs ?? []).map((f) => f.addressee_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [(p as Profile).id, p as Profile]));
      return (fs ?? []).map((f) => ({ id: f.id, created_at: f.created_at, profile: map.get(f.addressee_id) ?? null }));
    },
  });

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  async function toggleAssignment(friendId: string, groupId: string, on: boolean) {
    if (on) {
      await supabase
        .from("friend_assignments")
        .delete()
        .eq("owner_id", user!.id)
        .eq("friend_id", friendId)
        .eq("group_id", groupId);
    } else {
      const { error } = await supabase
        .from("friend_assignments")
        .insert({ owner_id: user!.id, friend_id: friendId, group_id: groupId });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["friends-page"] });
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

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

  async function cancel(id: string) {
    await supabase.from("friendships").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sent-requests"] });
  }

  async function copyInvite() {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/invite/${user!.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied");
    } catch {
      toast.message(link);
    }
  }

  return (
    <>
      <AppSubNav eyebrow="Your people" title="Friends" />
      <main className="mx-auto max-w-3xl space-y-10 px-6 py-8">
        <Section title="Friends" count={friends.length}>
          {friends.length === 0 ? (
            <Empty>No friends yet — send a request to get started.</Empty>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div
                  key={f.profile.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 p-3"
                >
                  <Avatar name={f.profile.name} color={f.profile.avatar_color} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{f.profile.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {f.profile.username ? `@${f.profile.username}` : "Contact"}
                      {f.profile.city ? ` · ${f.profile.city}` : ""}
                    </p>
                  </div>
                  <div className="hidden items-center gap-1 sm:flex">
                    {f.groupIds.slice(0, 3).map((gid) => {
                      const g = groupById.get(gid);
                      if (!g) return null;
                      return (
                        <span
                          key={gid}
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                          style={{ backgroundColor: g.color }}
                        >
                          {g.name}
                        </span>
                      );
                    })}
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs text-ink-soft transition hover:text-ink">
                        <Tag className="h-3.5 w-3.5" /> Groups
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                      <p className="px-1 pb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Assign to groups
                      </p>
                      {groups.length === 0 ? (
                        <p className="px-1 py-2 text-xs italic text-muted-foreground">
                          No groups yet — create one on the Groups page.
                        </p>
                      ) : (
                        <div className="space-y-0.5">
                          {groups.map((g) => {
                            const on = f.groupIds.includes(g.id);
                            return (
                              <button
                                key={g.id}
                                onClick={() => toggleAssignment(f.profile.id, g.id, on)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-accent"
                              >
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                                <span className="flex-1 truncate">{g.name}</span>
                                {on && <Check className="h-3.5 w-3.5 text-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Pending requests" count={incoming.length}>
          {incoming.length === 0 ? (
            <Empty>No incoming requests.</Empty>
          ) : (
            <div className="space-y-2">
              {incoming.map((r) =>
                r.profile ? (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 p-3"
                  >
                    <Avatar name={r.profile.name} color={r.profile.avatar_color} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{r.profile.name}</p>
                      <p className="text-[11px] text-muted-foreground">@{r.profile.username}</p>
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
              )}
            </div>
          )}
        </Section>

        <Section
          title="Sent invites"
          count={sent.length}
          action={
            <button
              onClick={copyInvite}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs text-ink-soft transition hover:text-ink"
            >
              <Link2 className="h-3.5 w-3.5" /> Copy invite link
            </button>
          }
        >
          {sent.length === 0 ? (
            <Empty>No pending invites. Share your invite link to add people.</Empty>
          ) : (
            <div className="space-y-2">
              {sent.map((r) =>
                r.profile ? (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 p-3"
                  >
                    <Avatar name={r.profile.name} color={r.profile.avatar_color} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{r.profile.name}</p>
                      <p className="text-[11px] text-muted-foreground">@{r.profile.username} · awaiting reply</p>
                    </div>
                    <button
                      onClick={() => cancel(r.id)}
                      title="Cancel request"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </Section>
      </main>
    </>
  );
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {title}
          {typeof count === "number" && <span className="ml-2 text-muted-foreground/70">{count}</span>}
        </p>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
