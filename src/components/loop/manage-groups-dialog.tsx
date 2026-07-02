import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { GROUP_PALETTE, type UserGroup } from "@/lib/groups";
import { Plus, Trash2, Check, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export function ManageGroupsDialog({
  open,
  onClose,
  meId,
  groups,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  meId: string;
  groups: UserGroup[];
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(GROUP_PALETTE[1]);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(GROUP_PALETTE[1]);
  const [busy, setBusy] = useState(false);

  // Only top-level groups can be parents
  const topLevel = groups.filter((g) => !g.parent_id);
  const subgroups = groups.filter((g) => g.parent_id);

  async function addGroup() {
    if (!newName.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("user_groups").insert({
      owner_id: meId,
      name: newName.trim(),
      color: newColor,
      position: groups.length,
      parent_id: newParentId ?? null,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewName("");
    setNewParentId(null);
    onChanged();
  }

  async function saveEdit(id: string) {
    setBusy(true);
    const { error } = await supabase
      .from("user_groups")
      .update({ name: editName.trim(), color: editColor } as any)
      .eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setEditingId(null);
    onChanged();
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Friends in it will be unassigned.`)) return;
    setBusy(true);
    // Also remove subgroups
    const childIds = groups.filter((g) => g.parent_id === id).map((g) => g.id);
    for (const cid of childIds) {
      await supabase.from("friend_assignments").delete().eq("owner_id", meId).eq("group_id", cid);
      await supabase.from("user_groups").delete().eq("id", cid);
    }
    await supabase.from("friend_assignments").delete().eq("owner_id", meId).eq("group_id", id);
    const { error } = await supabase.from("user_groups").delete().eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChanged();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="relative w-full max-w-md border border-white/10 bg-black text-white shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
              style={{ pointerEvents: "auto", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
                <div>
                  <h2 className="font-display text-lg font-bold">Categories</h2>
                  <p className="mt-0.5 text-[11px] text-white/40">Create groups and subgroups to organise friends.</p>
                </div>
                <button onClick={onClose} className="text-white/30 transition hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-0.5">
                {groups.length === 0 && (
                  <p className="text-sm italic text-white/30">No categories yet.</p>
                )}
                {topLevel.map((g) => {
                  const children = subgroups.filter((s) => s.parent_id === g.id);
                  const isEditing = editingId === g.id;
                  return (
                    <div key={g.id}>
                      <GroupRow
                        group={g}
                        isEditing={isEditing}
                        editName={editName}
                        editColor={editColor}
                        busy={busy}
                        onEdit={() => { setEditingId(g.id); setEditName(g.name); setEditColor(g.color); }}
                        onSave={() => saveEdit(g.id)}
                        onCancel={() => setEditingId(null)}
                        onDelete={() => remove(g.id, g.name)}
                        setEditName={setEditName}
                        setEditColor={setEditColor}
                      />
                      {/* Subgroups */}
                      {children.map((child) => {
                        const isEditingChild = editingId === child.id;
                        return (
                          <div key={child.id} className="flex items-center pl-5">
                            <ChevronRight className="mr-1 h-3 w-3 shrink-0 text-white/20" />
                            <div className="flex-1">
                              <GroupRow
                                group={child}
                                isEditing={isEditingChild}
                                editName={editName}
                                editColor={editColor}
                                busy={busy}
                                onEdit={() => { setEditingId(child.id); setEditName(child.name); setEditColor(child.color); }}
                                onSave={() => saveEdit(child.id)}
                                onCancel={() => setEditingId(null)}
                                onDelete={() => remove(child.id, child.name)}
                                setEditName={setEditName}
                                setEditColor={setEditColor}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* New category */}
              <div className="border-t border-white/8 px-6 py-4 space-y-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">New category</p>
                {/* Parent selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/40 w-14 shrink-0">Parent</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setNewParentId(null)}
                      className={`px-2 py-0.5 text-[11px] border transition ${newParentId === null ? "border-white bg-white text-black" : "border-white/15 text-white/50 hover:text-white"}`}
                    >
                      None
                    </button>
                    {topLevel.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setNewParentId(g.id)}
                        className={`px-2 py-0.5 text-[11px] border transition ${newParentId === g.id ? "border-white bg-white text-black" : "border-white/15 text-white/50 hover:text-white"}`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Color + name + add */}
                <div className="flex items-center gap-2">
                  <ColorDots value={newColor} onChange={setNewColor} />
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. ESCP, Climbing, NYC…"
                    className="h-9 flex-1 border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/40"
                    style={{ borderRadius: 0 }}
                    onKeyDown={(e) => e.key === "Enter" && addGroup()}
                  />
                  <button
                    onClick={addGroup}
                    disabled={busy || !newName.trim()}
                    className="inline-flex h-9 items-center gap-1 bg-white px-3 text-sm text-black hover:opacity-90 disabled:opacity-40"
                    style={{ borderRadius: 0 }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function GroupRow({
  group, isEditing, editName, editColor, busy,
  onEdit, onSave, onCancel, onDelete, setEditName, setEditColor,
}: {
  group: UserGroup; isEditing: boolean; editName: string; editColor: string; busy: boolean;
  onEdit: () => void; onSave: () => void; onCancel: () => void; onDelete: () => void;
  setEditName: (v: string) => void; setEditColor: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-white/5">
      {isEditing ? (
        <>
          <ColorDots value={editColor} onChange={setEditColor} />
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8 flex-1 border border-white/15 bg-white/5 px-2 text-sm text-white outline-none focus:border-white/40"
            style={{ borderRadius: 0 }}
            autoFocus
          />
          <button onClick={onSave} disabled={busy || !editName.trim()}
            className="p-1.5 bg-white text-black hover:opacity-80 disabled:opacity-40">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={onCancel} className="p-1.5 border border-white/15 text-white/60 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="h-2.5 w-2.5 shrink-0" style={{ background: group.color }} />
          <button onClick={onEdit} className="flex-1 truncate text-left text-sm text-white hover:text-white/70 transition">
            {group.name}
          </button>
          <button onClick={onDelete} className="p-1.5 text-white/20 hover:text-red-400 transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function ColorDots({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex shrink-0 gap-1">
      {GROUP_PALETTE.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`h-4 w-4 shrink-0 transition ${value === c ? "ring-2 ring-white ring-offset-1 ring-offset-black" : ""}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
