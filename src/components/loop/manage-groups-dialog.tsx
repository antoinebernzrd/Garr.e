import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { GROUP_PALETTE, type UserGroup } from "@/lib/groups";
import { Plus, Trash2, Check, X } from "lucide-react";
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
  const [newColor, setNewColor] = useState(GROUP_PALETTE[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(GROUP_PALETTE[0]);
  const [busy, setBusy] = useState(false);

  async function addGroup() {
    if (!newName.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("user_groups").insert({
      owner_id: meId,
      name: newName.trim(),
      color: newColor,
      position: groups.length,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewName("");
    onChanged();
  }

  async function saveEdit(id: string) {
    setBusy(true);
    const { error } = await supabase
      .from("user_groups")
      .update({ name: editName.trim(), color: editColor })
      .eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setEditingId(null);
    onChanged();
  }

  async function remove(id: string) {
    if (!confirm("Delete this category? Friends in it will be unassigned.")) return;
    setBusy(true);
    await supabase.from("friend_assignments").delete().eq("owner_id", meId).eq("group_id", id);
    const { error } = await supabase.from("user_groups").delete().eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Manage categories</DialogTitle>
        <DialogDescription>Create your own groups, pick a color, rename or delete.</DialogDescription>

        <div className="mt-2 space-y-2">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No categories yet — create one below.</p>
          )}
          {groups.map((g) => {
            const isEditing = editingId === g.id;
            return (
              <div
                key={g.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
              >
                {isEditing ? (
                  <>
                    <ColorDots value={editColor} onChange={setEditColor} />
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => saveEdit(g.id)}
                      disabled={busy || !editName.trim()}
                      className="rounded-md bg-ink p-1.5 text-background hover:opacity-90 disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-border p-1.5 hover:bg-accent"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} />
                    <button
                      onClick={() => {
                        setEditingId(g.id);
                        setEditName(g.name);
                        setEditColor(g.color);
                      }}
                      className="flex-1 truncate text-left text-sm hover:underline"
                    >
                      {g.name}
                    </button>
                    <button
                      onClick={() => remove(g.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl border border-dashed border-border bg-card/40 p-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">New category</p>
          <div className="flex items-center gap-2">
            <ColorDots value={newColor} onChange={setNewColor} />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. ESCP, Climbing, NYC…"
              className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && addGroup()}
            />
            <button
              onClick={addGroup}
              disabled={busy || !newName.trim()}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColorDots({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex shrink-0 gap-0.5">
      {GROUP_PALETTE.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`h-4 w-4 rounded-full border-2 transition ${
            value === c ? "border-ink scale-110" : "border-transparent"
          }`}
          style={{ background: c }}
          aria-label={`Pick ${c}`}
        />
      ))}
    </div>
  );
}
