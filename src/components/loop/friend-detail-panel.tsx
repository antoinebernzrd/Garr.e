import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { FriendWithUpdate } from "@/lib/types";
import { Avatar } from "./avatar";
import type { UserGroup } from "@/lib/groups";
import { formatDistanceToNow, format } from "date-fns";
import { Hand, MapPin, ImageIcon, Send, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function FriendDetailPanel({
  friend,
  meId,
  open,
  onClose,
  allGroups,
}: {
  friend: FriendWithUpdate | null;
  meId: string;
  open: boolean;
  onClose: () => void;
  allGroups: UserGroup[];
}) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const friendId = friend?.profile.id;

  const { data: assignedGroupIds = [] } = useQuery({
    enabled: !!friendId,
    queryKey: ["assignments", meId, friendId],
    queryFn: async () => {
      const { data } = await supabase
        .from("friend_assignments")
        .select("group_id")
        .eq("owner_id", meId)
        .eq("friend_id", friendId!);
      return (data ?? []).map((d) => d.group_id);
    },
  });

  if (!friend) return null;

  const { profile, latestUpdate } = friend;
  const city = latestUpdate?.city ?? profile.city;

  async function toggleGroup(g: UserGroup) {
    if (assignedGroupIds.includes(g.id)) {
      await supabase
        .from("friend_assignments")
        .delete()
        .eq("owner_id", meId)
        .eq("friend_id", friendId!)
        .eq("group_id", g.id);
    } else {
      await supabase
        .from("friend_assignments")
        .insert({ owner_id: meId, friend_id: friendId!, group_id: g.id });
    }
    qc.invalidateQueries({ queryKey: ["assignments", meId, friendId] });
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function sendWave(message?: string) {
    setSending(true);
    const { error } = await supabase.from("waves").insert({
      from_user_id: meId,
      to_user_id: friendId!,
      message: message ?? null,
    });
    setSending(false);
    if (error) toast.error(error.message);
    else {
      toast.success(message ? "Reply sent" : "👋 Wave sent");
      setReply("");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { setFullscreen(false); onClose(); } }}>
      <SheetContent
        side="right"
        className={`overflow-y-auto bg-background p-0 font-sans transition-[max-width] duration-300 ${
          fullscreen ? "w-screen max-w-none" : "w-full sm:max-w-lg"
        }`}
      >
        <SheetTitle className="sr-only">{profile.name}</SheetTitle>
        <SheetDescription className="sr-only">Friend detail</SheetDescription>

        <div className="relative border-b border-border bg-card p-6">
          <button
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? "Exit full screen" : "Full screen"}
            className="absolute right-14 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-ink"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <div className="flex items-start gap-4">
            <Avatar name={profile.name} color={profile.avatar_color} size={64} />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold tracking-tight leading-tight">{profile.name}</h2>
              <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                @{profile.username}
              </p>
              {city && (
                <p className="mt-2 inline-flex items-center gap-1 text-sm text-ink-soft">
                  <MapPin className="h-3.5 w-3.5" /> {city}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-7 p-6">
          <section>
            <Label>Categories</Label>
            {allGroups.length === 0 ? (
              <p className="mt-2 text-xs italic text-muted-foreground">
                Create categories from the sidebar to organize friends.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {allGroups.map((g) => {
                  const active = assignedGroupIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGroup(g)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                        active
                          ? "border-transparent text-white"
                          : "border-border bg-card text-ink-soft hover:bg-accent"
                      }`}
                      style={active ? { backgroundColor: g.color } : undefined}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: active ? "#fff" : g.color }}
                      />
                      {g.name}
                      {active && <span className="ml-0.5 opacity-70">×</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Tap to add or remove {profile.name.split(" ")[0]} from a category.
            </p>
          </section>

          <section>
            <Label>Latest update</Label>
            {latestUpdate ? (
              <div className="mt-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
                <p className="text-[15px] leading-relaxed text-ink">{latestUpdate.text}</p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {format(new Date(latestUpdate.created_at), "MMM d, yyyy")} ·{" "}
                  {formatDistanceToNow(new Date(latestUpdate.created_at), { addSuffix: true })}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm italic text-muted-foreground">Nothing posted yet.</p>
            )}
          </section>

          <section>
            <Label>Photos</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground"
                >
                  <ImageIcon className="h-5 w-5 opacity-40" />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Photos coming soon.</p>
          </section>

          {(latestUpdate?.next_up_items.length ?? 0) > 0 && (
            <section>
              <Label>Next up</Label>
              <ul className="mt-2 space-y-1.5 rounded-2xl border border-border bg-card p-4">
                {latestUpdate!.next_up_items.map((it) => (
                  <li key={it.id} className="flex gap-2 text-sm text-ink">
                    <span className="text-primary">·</span> {it.text}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <Label>Say hi</Label>
            <div className="flex gap-2">
              <button
                onClick={() => sendWave()}
                disabled={sending}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm hover:bg-accent disabled:opacity-50"
              >
                <Hand className="h-3.5 w-3.5" /> Wave
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a quick reply…"
                className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => reply.trim() && sendWave(reply.trim())}
                disabled={!reply.trim() || sending}
                className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{children}</p>
  );
}
