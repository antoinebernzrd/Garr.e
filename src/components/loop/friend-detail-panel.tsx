import type { FriendWithUpdate } from "@/lib/types";
import { AVATAR_COLORS, primaryGroupColor, type UserGroup } from "@/lib/groups";
import { formatDistanceToNow, format } from "date-fns";
import { Hand, MapPin, Send, PenLine, Pencil, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CITY_PRESETS, findCityPreset } from "@/lib/cities";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

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
  const [noteText, setNoteText] = useState("");
  const [noteCity, setNoteCity] = useState("");
  const [logging, setLogging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [eFirst, setEFirst] = useState("");
  const [eLast, setELast] = useState("");
  const [eCity, setECity] = useState("");
  const [eColor, setEColor] = useState(AVATAR_COLORS[0]);
  const [savingEdit, setSavingEdit] = useState(false);

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

  async function toggleGroup(g: UserGroup) {
    if (assignedGroupIds.includes(g.id)) {
      await supabase.from("friend_assignments").delete().eq("owner_id", meId).eq("friend_id", friendId!).eq("group_id", g.id);
    } else {
      await supabase.from("friend_assignments").insert({ owner_id: meId, friend_id: friendId!, group_id: g.id });
    }
    qc.invalidateQueries({ queryKey: ["assignments", meId, friendId] });
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function sendWave(message?: string) {
    setSending(true);
    const { error } = await supabase.from("waves").insert({ from_user_id: meId, to_user_id: friendId!, message: message ?? null });
    setSending(false);
    if (error) toast.error(error.message);
    else { toast.success(message ? "Reply sent" : "👋 Wave sent"); setReply(""); }
  }

  async function logUpdate() {
    if (!noteText.trim()) return;
    setLogging(true);
    const preset = findCityPreset(noteCity);
    const { error } = await supabase.from("updates").insert({
      user_id: friendId!, text: noteText.trim(), city: noteCity.trim() || null,
      lat: preset?.lat ?? null, lng: preset?.lng ?? null,
    });
    if (!error && noteCity.trim()) await supabase.from("profiles").update({ city: noteCity.trim() }).eq("id", friendId!);
    setLogging(false);
    if (error) return toast.error(error.message);
    toast.success("Update logged");
    setNoteText(""); setNoteCity("");
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  function startEdit() {
    if (!friend) return;
    const p = friend.profile;
    setEFirst(p.first_name ?? p.name ?? ""); setELast(p.last_name ?? "");
    setECity(p.city ?? ""); setEColor(p.avatar_color); setEditing(true);
  }

  async function saveContact() {
    const first = eFirst.trim(); const last = eLast.trim();
    if (!first && !last) return;
    setSavingEdit(true);
    const { error } = await supabase.from("profiles").update({
      name: [first, last].filter(Boolean).join(" "), first_name: first || null,
      last_name: last || null, city: eCity.trim() || null, avatar_color: eColor,
    }).eq("id", friendId!);
    setSavingEdit(false);
    if (error) return toast.error(error.message);
    setEditing(false); toast.success("Contact updated");
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function deleteContact() {
    if (!confirm(`Delete ${friend?.profile.name}? This removes their card and all logged updates.`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", friendId!);
    if (error) return toast.error(error.message);
    toast.success("Contact deleted");
    qc.invalidateQueries({ queryKey: ["friends"] });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && friend && (() => {
        const { profile, latestUpdate } = friend;
        const city = latestUpdate?.city ?? profile.city;
        const isManaged = !!profile.managed_by;
        const accent = primaryGroupColor(friend.groups) ?? profile.avatar_color;

        return (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ pointerEvents: "none" }}
            >
              <div
                className="relative flex w-full max-w-xl flex-col overflow-hidden border border-white/10 bg-black shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
                style={{ pointerEvents: "auto", maxHeight: "90vh" }}
              >
                {/* Close */}
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 z-10 inline-flex h-7 w-7 items-center justify-center text-white/40 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Color block header */}
                <div
                  className="relative h-36 w-full shrink-0"
                  style={{ backgroundColor: accent }}
                />

                {/* Scrollable content */}
                <div className="overflow-y-auto">
                  {/* Name / meta */}
                  <div className="border-b border-white/8 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-display text-2xl font-bold tracking-tight text-white">{profile.name}</h2>
                        {city && (
                          <p className="mt-1 inline-flex items-center gap-1 text-sm text-white/50">
                            <MapPin className="h-3 w-3" /> {city}
                          </p>
                        )}
                      </div>
                      {isManaged && !editing && (
                        <button
                          onClick={startEdit}
                          className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center text-white/30 transition hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6 px-6 py-6">
                    {/* Edit form */}
                    {isManaged && editing && (
                      <section className="space-y-3 border border-white/10 bg-white/[0.03] p-4">
                        <Label>Edit contact</Label>
                        <div className="flex gap-2">
                          <input value={eFirst} onChange={(e) => setEFirst(e.target.value)} placeholder="First name"
                            className="h-10 flex-1 border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-white/30" style={{ borderRadius: 0 }} />
                          <input value={eLast} onChange={(e) => setELast(e.target.value)} placeholder="Last name"
                            className="h-10 flex-1 border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-white/30" style={{ borderRadius: 0 }} />
                        </div>
                        <input value={eCity} onChange={(e) => setECity(e.target.value)} list="edit-contact-cities" placeholder="City (optional)"
                          className="h-10 w-full border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-white/30" style={{ borderRadius: 0 }} />
                        <datalist id="edit-contact-cities">{CITY_PRESETS.map((c) => <option key={c.name} value={c.name} />)}</datalist>
                        <div className="flex flex-wrap gap-2">
                          {AVATAR_COLORS.map((c) => (
                            <button key={c} type="button" onClick={() => setEColor(c)}
                              className={`h-6 w-6 transition ${eColor === c ? "ring-2 ring-white ring-offset-1 ring-offset-black" : ""}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <button onClick={saveContact} disabled={savingEdit || (!eFirst.trim() && !eLast.trim())}
                              className="inline-flex h-9 items-center gap-1.5 bg-white px-4 text-sm text-black hover:opacity-90 disabled:opacity-40">
                              <Check className="h-3.5 w-3.5" /> {savingEdit ? "Saving…" : "Save"}
                            </button>
                            <button onClick={() => setEditing(false)}
                              className="inline-flex h-9 items-center gap-1.5 border border-white/20 px-4 text-sm text-white hover:bg-white/5">
                              <X className="h-3.5 w-3.5" /> Cancel
                            </button>
                          </div>
                          <button onClick={deleteContact} className="inline-flex h-9 items-center gap-1.5 px-3 text-sm text-white/30 transition hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </section>
                    )}

                    {/* Categories */}
                    <section>
                      <Label>Categories</Label>
                      {allGroups.length === 0 ? (
                        <p className="mt-2 text-xs italic text-white/30">Create categories to organize friends.</p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {allGroups.map((g) => {
                            const active = assignedGroupIds.includes(g.id);
                            return (
                              <button key={g.id} onClick={() => toggleGroup(g)}
                                className={`flex items-center gap-1.5 border px-3 py-1 text-xs transition ${active ? "border-transparent text-white" : "border-white/10 text-white/40 hover:text-white"}`}
                                style={active ? { backgroundColor: g.color } : undefined}>
                                <span className="h-2 w-2" style={{ background: active ? "#fff" : g.color }} />
                                {g.name}
                                {active && <span className="ml-0.5 opacity-60">×</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {/* Latest update */}
                    <section>
                      <Label>Latest update</Label>
                      {latestUpdate ? (
                        <div className="mt-2 border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-[15px] leading-relaxed text-white">{latestUpdate.text}</p>
                          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/30">
                            {format(new Date(latestUpdate.created_at), "MMM d, yyyy")} · {formatDistanceToNow(new Date(latestUpdate.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm italic text-white/30">Nothing posted yet.</p>
                      )}
                    </section>

                    {/* Next up */}
                    {(latestUpdate?.next_up_items.length ?? 0) > 0 && (
                      <section>
                        <Label>Next up</Label>
                        <ul className="mt-2 space-y-1.5 border border-white/8 bg-white/[0.03] p-4">
                          {latestUpdate!.next_up_items.map((it) => (
                            <li key={it.id} className="flex gap-2 text-sm text-white">
                              <span className="text-white/40">·</span> {it.text}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* Log / Say hi */}
                    {isManaged ? (
                      <section className="space-y-3 border border-white/8 bg-white/[0.03] p-4">
                        <Label>Log an update</Label>
                        <p className="text-[11px] text-white/30">
                          {profile.name.split(" ")[0]} isn't on Garr.e — jot down what they're up to.
                        </p>
                        <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} maxLength={500}
                          placeholder="Started a new job at…, moved to…"
                          className="w-full resize-none border border-white/10 bg-white/5 p-3 text-sm text-white outline-none focus:border-white/30" style={{ borderRadius: 0 }} />
                        <div className="flex items-center gap-2">
                          <input value={noteCity} onChange={(e) => setNoteCity(e.target.value)} list="contact-cities" placeholder="City (optional)"
                            className="h-10 flex-1 border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-white/30" style={{ borderRadius: 0 }} />
                          <datalist id="contact-cities">{CITY_PRESETS.map((c) => <option key={c.name} value={c.name} />)}</datalist>
                          <button onClick={logUpdate} disabled={!noteText.trim() || logging}
                            className="inline-flex h-10 items-center gap-1.5 bg-white px-4 text-sm text-black hover:opacity-90 disabled:opacity-40">
                            <PenLine className="h-3.5 w-3.5" /> {logging ? "Saving…" : "Log"}
                          </button>
                        </div>
                      </section>
                    ) : (
                      <section className="space-y-3 border border-white/8 bg-white/[0.03] p-4">
                        <Label>Say hi</Label>
                        <div className="flex gap-2">
                          <button onClick={() => sendWave()} disabled={sending}
                            className="inline-flex h-9 items-center gap-1.5 border border-white/15 px-3 text-sm text-white hover:bg-white/5 disabled:opacity-40">
                            <Hand className="h-3.5 w-3.5" /> Wave
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a quick reply…"
                            className="h-10 flex-1 border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-white/30" style={{ borderRadius: 0 }} />
                          <button onClick={() => reply.trim() && sendWave(reply.trim())} disabled={!reply.trim() || sending}
                            className="inline-flex h-10 items-center justify-center bg-white px-4 text-sm text-black hover:opacity-90 disabled:opacity-40">
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        );
      })()}
    </AnimatePresence>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/30">{children}</p>;
}
