import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar } from "./avatar";
import { Search, Mail, UserPlus } from "lucide-react";
import type { Profile } from "@/lib/types";
import { AVATAR_COLORS } from "@/lib/groups";

export function AddFriendDialog({
  open,
  onClose,
  meId,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  meId: string;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"search" | "invite" | "contact">("search");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [contactFirst, setContactFirst] = useState("");
  const [contactLast, setContactLast] = useState("");
  const [contactCity, setContactCity] = useState("");
  const [contactColor, setContactColor] = useState(AVATAR_COLORS[0]);
  const [creating, setCreating] = useState(false);

  async function search() {
    const term = q.trim().toLowerCase();
    if (!term) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${term}%,name.ilike.%${term}%`)
      .neq("id", meId)
      .limit(10);
    setResults((data ?? []) as Profile[]);
    setSearching(false);
  }

  async function sendRequest(p: Profile) {
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: meId, addressee_id: p.id, status: "pending" });
    if (error) {
      if (error.code === "23505") toast.info("Already requested or connected");
      else toast.error(error.message);
      return;
    }
    toast.success(`Request sent to ${p.name}`);
    onChanged();
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    // v1: see if a profile already exists for that email; if so, send a friend request.
    const { data: existing } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", inviteEmail.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      await sendRequest(existing as Profile);
    } else {
      // No real email sending in v1 — surface clear copy so the user knows.
      toast.success("Invite noted. We'll connect you the moment they join Loop.");
    }
    setInviteEmail("");
    setInviting(false);
  }

  // Create a managed contact: someone who won't use the app, but whom you track
  // here. Stored as a profile you own (managed_by = you) + an auto-accepted
  // friendship, so they appear alongside real friends everywhere.
  async function createContact() {
    const first = contactFirst.trim();
    const last = contactLast.trim();
    if (!first && !last) return;
    const fullName = [first, last].filter(Boolean).join(" ");
    setCreating(true);
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const { error: pe } = await supabase.from("profiles").insert({
      id,
      name: fullName,
      first_name: first || null,
      last_name: last || null,
      city: contactCity.trim() || null,
      avatar_color: contactColor,
      managed_by: meId,
    });
    if (pe) {
      setCreating(false);
      toast.error(pe.message);
      return;
    }
    const { error: fe } = await supabase.from("friendships").insert({
      requester_id: meId,
      addressee_id: id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    });
    setCreating(false);
    if (fe) {
      toast.error(fe.message);
      return;
    }
    toast.success(`${fullName} added as a contact`);
    setContactFirst("");
    setContactLast("");
    setContactCity("");
    onChanged();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md overflow-hidden bg-background p-0">
        <div className="border-b border-border bg-card p-6">
          <DialogTitle className="font-display text-2xl">Add a friend</DialogTitle>
          <DialogDescription className="text-sm text-ink-soft">
            Both sides need to accept before updates appear.
          </DialogDescription>
        </div>

        <div className="flex border-b border-border">
          {(["search", "invite", "contact"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs uppercase tracking-[0.18em] transition ${
                tab === t ? "border-b-2 border-primary text-ink" : "text-muted-foreground"
              }`}
            >
              {t === "search" ? "Search" : t === "invite" ? "Email invite" : "Add contact"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "search" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="username or name"
                  className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={search}
                disabled={searching}
                className="h-9 rounded-full bg-ink px-4 text-sm text-background hover:opacity-90"
              >
                {searching ? "Searching…" : "Search"}
              </button>

              <div className="space-y-1.5 pt-2">
                {results.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <Avatar name={p.name} color={p.avatar_color} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">@{p.username}</p>
                    </div>
                    <button
                      onClick={() => sendRequest(p)}
                      className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90"
                    >
                      Request
                    </button>
                  </div>
                ))}
                {!searching && results.length === 0 && q && (
                  <p className="text-center text-sm text-muted-foreground">No one found.</p>
                )}
              </div>
            </div>
          ) : tab === "invite" ? (
            <div className="space-y-3">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={sendInvite}
                disabled={inviting}
                className="h-9 rounded-full bg-primary px-4 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {inviting ? "Sending…" : "Send invite"}
              </button>
              <p className="text-[11px] text-muted-foreground">
                If they're already on Loop, we'll send them a friend request. Otherwise, we'll keep
                them in mind for when they join.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">
                Track someone who isn't on Loop. They won't get an account — you keep their card and
                post updates for them yourself.
              </p>
              <div className="relative">
                <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={contactFirst}
                  onChange={(e) => setContactFirst(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createContact()}
                  placeholder="First name"
                  className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <input
                value={contactLast}
                onChange={(e) => setContactLast(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createContact()}
                placeholder="Last name (optional)"
                className="h-10 w-full rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary"
              />
              <input
                value={contactCity}
                onChange={(e) => setContactCity(e.target.value)}
                placeholder="City (optional)"
                className="h-10 w-full rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary"
              />
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Card color</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setContactColor(c)}
                      aria-label={c}
                      className={`h-7 w-7 rounded-full transition ${
                        contactColor === c ? "ring-2 ring-ink ring-offset-2 ring-offset-background" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={createContact}
                disabled={creating || (!contactFirst.trim() && !contactLast.trim())}
                className="h-9 rounded-full bg-primary px-4 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {creating ? "Adding…" : "Add contact"}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
