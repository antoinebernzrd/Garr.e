import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CITY_PRESETS, findCityPreset } from "@/lib/cities";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export function ComposeUpdateDialog({
  open,
  onClose,
  meId,
  onPosted,
}: {
  open: boolean;
  onClose: () => void;
  meId: string;
  onPosted: () => void;
}) {
  const [text, setText] = useState("");
  const [city, setCity] = useState("");
  const [items, setItems] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  function reset() {
    setText("");
    setCity("");
    setItems([""]);
  }

  async function submit() {
    if (!text.trim()) {
      toast.error("Write a quick update first");
      return;
    }
    setSaving(true);
    const preset = findCityPreset(city);
    const { data: up, error } = await supabase
      .from("updates")
      .insert({
        user_id: meId,
        text: text.trim(),
        city: city.trim() || null,
        lat: preset?.lat ?? null,
        lng: preset?.lng ?? null,
      })
      .select()
      .single();
    if (error || !up) {
      setSaving(false);
      toast.error(error?.message ?? "Couldn't post");
      return;
    }
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length) {
      await supabase.from("next_up_items").insert(
        cleaned.map((t, i) => ({ update_id: up.id, text: t, position: i })),
      );
    }
    // Update profile city too if changed and known
    if (city.trim()) {
      await supabase.from("profiles").update({ city: city.trim() }).eq("id", meId);
    }
    setSaving(false);
    toast.success("Posted");
    reset();
    onPosted();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden bg-background p-0">
        <div className="border-b border-border bg-card p-6">
          <DialogTitle className="font-display text-2xl">What's the update?</DialogTitle>
          <DialogDescription className="text-sm text-ink-soft">
            One short note. Where you are. What's coming up. That's it.
          </DialogDescription>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <Label>Update</Label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Just signed the apartment lease. Bit overwhelmed but happy."
              className="mt-1.5 w-full resize-none rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{text.length}/500</p>
          </div>

          <div>
            <Label>Where are you?</Label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Paris"
              list="cities"
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            />
            <datalist id="cities">
              {CITY_PRESETS.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
            {city && !findCityPreset(city) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Not in the atlas list — your card will still show it, but you won't appear on the map.
              </p>
            )}
          </div>

          <div>
            <Label>Next up</Label>
            <div className="mt-1.5 space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={it}
                    onChange={(e) => {
                      const c = [...items];
                      c[i] = e.target.value;
                      setItems(c);
                    }}
                    placeholder={i === 0 ? "Trip to Lisbon next month" : "Another thing"}
                    className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                  {items.length > 1 && (
                    <button
                      onClick={() => setItems(items.filter((_, j) => j !== i))}
                      className="rounded-full p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setItems([...items, ""])}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add another
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              className="h-10 rounded-full border border-border bg-card px-4 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="h-10 rounded-full bg-primary px-5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Posting…" : "Post update"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{children}</p>;
}
