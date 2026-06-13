import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { GROUP_PALETTE, type UserGroup } from "@/lib/groups";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/loop/avatar";
import { AppSubNav } from "@/components/loop/app-subnav";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Plus, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/groups")({
  component: GroupsPage,
});

type Assignment = { friend_id: string; group_id: string };

function GroupsPage() {
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
    queryKey: ["friends-profiles", user?.id],
    queryFn: async (): Promise<Profile[]> => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted");
      const friendIds = (fs ?? [])
        .map((f) => (f.requester_id === user!.id ? f.addressee_id : f.requester_id))
        .filter((id) => id !== user!.id);
      if (friendIds.length === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("*").in("id", friendIds);
      return ((profs ?? []) as Profile[]).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const { data: assignments = [] } = useQuery({
    enabled: !!user,
    queryKey: ["assignments-all", user?.id],
    queryFn: async (): Promise<Assignment[]> => {
      const { data } = await supabase
        .from("friend_assignments")
        .select("friend_id,group_id")
        .eq("owner_id", user!.id);
      return (data ?? []) as Assignment[];
    },
  });

  const membersByGroup = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const a of assignments) {
      const s = m.get(a.group_id) ?? new Set<string>();
      s.add(a.friend_id);
      m.set(a.group_id, s);
    }
    return m;
  }, [assignments]);

  const profileById = useMemo(() => new Map(friends.map((p) => [p.id, p])), [friends]);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(GROUP_PALETTE[0]);
  const [busy, setBusy] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["user_groups"] });
    qc.invalidateQueries({ queryKey: ["assignments-all"] });
    qc.invalidateQueries({ queryKey: ["friends-profiles"] });
    qc.invalidateQueries({ queryKey: ["friends-page"] });
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function addGroup() {
    if (!newName.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("user_groups").insert({
      owner_id: user!.id,
      name: newName.trim(),
      color: newColor,
      position: groups.length,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewName("");
    invalidate();
  }

  async function rename(g: UserGroup, name: string, color: string) {
    const { error } = await supabase.from("user_groups").update({ name: name.trim(), color }).eq("id", g.id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  async function remove(g: UserGroup) {
    if (!confirm(`Delete "${g.name}"? Friends in it will be unassigned.`)) return;
    setBusy(true);
    await supabase.from("friend_assignments").delete().eq("owner_id", user!.id).eq("group_id", g.id);
    const { error } = await supabase.from("user_groups").delete().eq("id", g.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    invalidate();
  }

  async function toggleMember(groupId: string, friendId: string, on: boolean) {
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
    invalidate();
  }

  return (
    <>
      <AppSubNav eyebrow="Organize" title="Groups" />
      <main className="mx-auto max-w-3xl space-y-4 px-6 py-8">
        {groups.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center text-sm text-muted-foreground">
            No groups yet — create one below to start organizing your friends.
          </p>
        )}

        {groups.map((g) => {
          const memberIds = membersByGroup.get(g.id) ?? new Set<string>();
          const members = [...memberIds].map((id) => profileById.get(id)).filter(Boolean) as Profile[];
          return (
            <GroupCard
              key={g.id}
              group={g}
              members={members}
              friends={friends}
              memberIds={memberIds}
              busy={busy}
              onRename={rename}
              onDelete={remove}
              onToggleMember={toggleMember}
            />
          );
        })}

        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">New group</p>
          <div className="flex flex-wrap items-center gap-2">
            <ColorDots value={newColor} onChange={setNewColor} />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. ESCP, Climbing, NYC…"
              onKeyDown={(e) => e.key === "Enter" && addGroup()}
              className="h-9 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={addGroup}
              disabled={busy || !newName.trim()}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-4 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function GroupCard({
  group,
  members,
  friends,
  memberIds,
  busy,
  onRename,
  onDelete,
  onToggleMember,
}: {
  group: UserGroup;
  members: Profile[];
  friends: Profile[];
  memberIds: Set<string>;
  busy: boolean;
  onRename: (g: UserGroup, name: string, color: string) => void;
  onDelete: (g: UserGroup) => void;
  onToggleMember: (groupId: string, friendId: string, on: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [color, setColor] = useState(group.color);

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <ColorDots value={color} onChange={setColor} />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 flex-1 rounded-full border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                onRename(group, name, color);
                setEditing(false);
              }}
              disabled={busy || !name.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink text-background hover:opacity-90 disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setName(group.name);
                setColor(group.color);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: group.color }} />
            <button onClick={() => setEditing(true)} className="flex-1 truncate text-left text-sm font-medium text-ink hover:underline">
              {group.name}
            </button>
            <span className="text-xs text-muted-foreground">{members.length}</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs text-ink-soft transition hover:text-ink">
                  <UserPlus className="h-3.5 w-3.5" /> Members
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2" align="end">
                <p className="px-1 pb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Add or remove members
                </p>
                {friends.length === 0 ? (
                  <p className="px-1 py-2 text-xs italic text-muted-foreground">No friends to add yet.</p>
                ) : (
                  <div className="max-h-64 space-y-0.5 overflow-y-auto">
                    {friends.map((p) => {
                      const on = memberIds.has(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => onToggleMember(group.id, p.id, on)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-accent"
                        >
                          <Avatar name={p.name} color={p.avatar_color} size={24} />
                          <span className="flex-1 truncate">{p.name}</span>
                          {on && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <button
              onClick={() => onDelete(group)}
              title="Delete group"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {!editing && members.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {members.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-0.5 pl-0.5 pr-2 text-xs text-ink-soft"
            >
              <Avatar name={p.name} color={p.avatar_color} size={20} />
              {p.name.split(" ")[0]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorDots({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex shrink-0 gap-0.5">
      {GROUP_PALETTE.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`h-4 w-4 rounded-full border-2 transition ${value === c ? "scale-110 border-ink" : "border-transparent"}`}
          style={{ background: c }}
          aria-label={`Pick ${c}`}
        />
      ))}
    </div>
  );
}
