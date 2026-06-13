import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserGroup } from "@/lib/groups";
import { FriendGrid } from "@/components/loop/friend-grid";
const MapView = lazy(() => import("@/components/loop/map-view").then((m) => ({ default: m.MapView })));
const GraphView = lazy(() => import("@/components/loop/graph-view").then((m) => ({ default: m.GraphView })));
import { FriendDetailPanel } from "@/components/loop/friend-detail-panel";
import { ComposeUpdateDialog } from "@/components/loop/compose-update-dialog";
import { AddFriendDialog } from "@/components/loop/add-friend-dialog";
import { ManageGroupsDialog } from "@/components/loop/manage-groups-dialog";
import type { FriendWithUpdate, Profile } from "@/lib/types";
import { LayoutGrid, Globe, Share2, Search, Users, Clock, Settings2 } from "lucide-react";
import { Avatar } from "@/components/loop/avatar";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

type View = "grid" | "map" | "graph";

function Dashboard() {
  const { user } = useAuth();
  
  const qc = useQueryClient();
  const [view, setView] = useState<View>("grid");
  const [activeGroupIds, setActiveGroupIds] = useState<Set<string>>(new Set());
  const [recentOnly, setRecentOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [openFriendId, setOpenFriendId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("loop:onboarding") === "pending") {
      setOnboarding(true);
      localStorage.removeItem("loop:onboarding");
    }
  }, []);

  const { data: me } = useQuery({
    enabled: !!user,
    queryKey: ["me", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data as Profile | null;
    },
  });

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
    enabled: !!user && groups !== undefined,
    queryKey: ["friends", user?.id, groups.map((g) => g.id).join(",")],
    queryFn: async (): Promise<FriendWithUpdate[]> => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted");
      const friendIds = (fs ?? [])
        .map((f) => (f.requester_id === user!.id ? f.addressee_id : f.requester_id))
        .filter((id) => id !== user!.id);
      if (friendIds.length === 0) return [];

      const [{ data: profs }, { data: ups }, { data: assigns }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", friendIds),
        supabase.from("updates").select("*, next_up_items(*)").in("user_id", friendIds).order("created_at", { ascending: false }),
        supabase.from("friend_assignments").select("*").eq("owner_id", user!.id),
      ]);

      const groupById = new Map(groups.map((g) => [g.id, g]));
      const latestByUser = new Map<string, any>();
      for (const u of ups ?? []) if (!latestByUser.has(u.user_id)) latestByUser.set(u.user_id, u);
      const groupsByFriend = new Map<string, UserGroup[]>();
      for (const a of assigns ?? []) {
        const g = groupById.get(a.group_id);
        if (!g) continue;
        const arr = groupsByFriend.get(a.friend_id) ?? [];
        arr.push(g);
        groupsByFriend.set(a.friend_id, arr);
      }
      return (profs ?? []).map((p: any) => ({
        profile: p as Profile,
        latestUpdate: latestByUser.get(p.id) ?? null,
        groups: groupsByFriend.get(p.id) ?? [],
      }));
    },
  });

  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const isRecent = (f: FriendWithUpdate) =>
    !!f.latestUpdate && Date.now() - new Date(f.latestUpdate.created_at).getTime() < SEVEN_DAYS;

  const groupCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of friends) for (const g of f.groups) m.set(g.id, (m.get(g.id) ?? 0) + 1);
    return m;
  }, [friends]);
  const recentCount = useMemo(() => friends.filter(isRecent).length, [friends]);

  const filtered = useMemo(() => {
    let list = friends;
    if (activeGroupIds.size > 0) list = list.filter((f) => f.groups.some((g) => activeGroupIds.has(g.id)));
    if (recentOnly) list = list.filter(isRecent);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (f) =>
          f.profile.name.toLowerCase().includes(q) ||
          f.profile.username.toLowerCase().includes(q) ||
          (f.profile.city ?? "").toLowerCase().includes(q) ||
          (f.latestUpdate?.text ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [friends, activeGroupIds, recentOnly, search]);

  const openFriend = openFriendId ? friends.find((f) => f.profile.id === openFriendId) ?? null : null;
  const allOn = activeGroupIds.size === 0;
  const setOnlyGroup = (id: string) =>
    setActiveGroupIds((prev) => (prev.size === 1 && prev.has(id) ? new Set() : new Set([id])));
  const toggleGroup = (id: string) =>
    setActiveGroupIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (!user) return null;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl tracking-tight"
              style={{ fontFamily: '"Geist", ui-sans-serif, sans-serif', letterSpacing: "0.02em", fontWeight: 600 }}
            >
              Garr.e
            </h1>
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "friend" : "friends"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdding(true)}
              className="hidden h-9 items-center rounded-full border border-border bg-card px-3 text-sm text-ink hover:bg-accent sm:inline-flex"
            >
              Add friend
            </button>
            <button
              onClick={() => setComposing(true)}
              className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Post update
            </button>
            {me && (
              <Link
                to="/app/profile"
                title="Profile & settings"
                className="ml-1 inline-flex items-center rounded-full p-0.5 transition hover:bg-accent"
              >
                <Avatar name={me.name} color={me.avatar_color} size={32} />
              </Link>
            )}
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col gap-3 px-6 pb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends…"
              className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground outline-none focus:border-ink/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip
              active={allOn && !recentOnly}
              onClick={() => {
                setActiveGroupIds(new Set());
                setRecentOnly(false);
              }}
            >
              <Users className="h-3 w-3" />
              All <span className="text-muted-foreground">{friends.length}</span>
            </Chip>
            <Chip
              active={recentOnly}
              onClick={() => {
                setRecentOnly((v) => !v);
                setActiveGroupIds(new Set());
              }}
            >
              <Clock className="h-3 w-3" />
              Recent <span className="text-muted-foreground">{recentCount}</span>
            </Chip>
            {groups.map((g) => {
              const isolated = activeGroupIds.size === 1 && activeGroupIds.has(g.id);
              return (
                <Chip key={g.id} active={isolated} onClick={() => { setOnlyGroup(g.id); setRecentOnly(false); }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                  {g.name}
                  <span className="text-muted-foreground">{groupCounts.get(g.id) ?? 0}</span>
                </Chip>
              );
            })}
            <button
              onClick={() => setManaging(true)}
              title="Manage groups"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-ink"
            >
              <Settings2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </header>

      <main className={view === "grid" ? "px-6 py-8 pb-28" : "p-4 sm:p-6 pb-28"}>
        {friends.length === 0 ? (
          <EmptyState onAdd={() => setAdding(true)} />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {view === "grid" ? (
                <FriendGrid friends={filtered} onOpen={(id) => setOpenFriendId(id)} />
              ) : view === "map" ? (
                <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-3xl bg-card" />}>
                  <MapView
                    friends={friends}
                    groups={groups}
                    onOpen={(id) => setOpenFriendId(id)}
                    activeGroupIds={activeGroupIds}
                    onToggleGroup={toggleGroup}
                    meId={user.id}
                    meName={me?.name ?? "You"}
                    meColor={me?.avatar_color ?? "#eab308"}
                    meCity={me?.city ?? null}
                  />
                </Suspense>
              ) : (
                <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-3xl bg-card" />}>
                  <GraphView friends={friends} groups={groups} onOpen={(id) => setOpenFriendId(id)} activeGroupIds={activeGroupIds} />
                </Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Bottom view toggle */}
      <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border bg-card/95 p-1 shadow-soft backdrop-blur">
        {([
          { v: "grid" as View, icon: LayoutGrid, label: "Grid" },
          { v: "map" as View, icon: Globe, label: "Globe" },
          { v: "graph" as View, icon: Share2, label: "Graph" },
        ]).map((it) => {
          const Icon = it.icon;
          const active = view === it.v;
          return (
            <button
              key={it.v}
              onClick={() => setView(it.v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition ${
                active ? "bg-ink text-background" : "text-ink-soft hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </button>
          );
        })}
      </div>

      <FriendDetailPanel friend={openFriend} meId={user.id} open={!!openFriend} onClose={() => setOpenFriendId(null)} allGroups={groups} />
      <ComposeUpdateDialog open={composing} onClose={() => setComposing(false)} meId={user.id} onPosted={() => qc.invalidateQueries({ queryKey: ["friends"] })} />
      <AddFriendDialog open={adding} onClose={() => setAdding(false)} meId={user.id} onChanged={() => qc.invalidateQueries()} />
      <ManageGroupsDialog
        open={managing}
        onClose={() => setManaging(false)}
        meId={user.id}
        groups={groups}
        onChanged={() => {
          qc.invalidateQueries({ queryKey: ["user_groups"] });
          qc.invalidateQueries({ queryKey: ["friends"] });
        }}
      />

      {/* Onboarding overlay */}
      <AnimatePresence>
        {onboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setOnboarding(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md rounded-3xl border border-border bg-background p-8 shadow-soft"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-primary">Welcome</p>
              <h2 className="mt-3 font-display text-3xl">Welcome to your Loop.</h2>
              <p className="mt-3 text-sm text-ink-soft">
                Add friends, post your first update, and group people however you think of them.
                No feed, no algorithm — just the people that matter.
              </p>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => { setOnboarding(false); setAdding(true); }}
                  className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Add your first friend
                </button>
                <button
                  onClick={() => setOnboarding(false)}
                  className="inline-flex h-10 items-center rounded-full border border-border bg-card px-5 text-sm text-ink hover:bg-accent"
                >
                  Look around first
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/50 p-16 text-center shadow-soft">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Quiet here</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Add a friend to begin.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
        Loop only shows updates from people you've both added. Send a request, wait for them to
        accept, and they'll appear in your grid, map, and graph.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm text-primary-foreground hover:opacity-90"
      >
        Add your first friend
      </button>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs transition ${
        active ? "border-ink/40 bg-ink text-background" : "border-border bg-card text-ink-soft hover:border-ink/30 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
