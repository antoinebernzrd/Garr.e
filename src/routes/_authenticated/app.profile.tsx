import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/types";
import { AVATAR_COLORS } from "@/lib/groups";
import { Avatar } from "@/components/loop/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const { data: me } = useQuery({
    enabled: !!user,
    queryKey: ["me", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data as Profile | null;
    },
  });

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [city, setCity] = useState("");
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [notifWaves, setNotifWaves] = useState(true);
  const [notifRequests, setNotifRequests] = useState(true);

  useEffect(() => {
    if (me) {
      // Fall back to the existing combined name if first/last aren't set yet.
      setFirst(me.first_name ?? me.name ?? "");
      setLast(me.last_name ?? "");
      setCity(me.city ?? "");
      setColor(me.avatar_color);
    }
  }, [me]);

  const fullName = [first.trim(), last.trim()].filter(Boolean).join(" ");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotifWaves(localStorage.getItem("loop:notif-waves") !== "false");
      setNotifRequests(localStorage.getItem("loop:notif-requests") !== "false");
    }
  }, []);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: fullName,
        first_name: first.trim() || null,
        last_name: last.trim() || null,
        city: city.trim() || null,
        avatar_color: color,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    localStorage.setItem("loop:notif-waves", String(notifWaves));
    localStorage.setItem("loop:notif-requests", String(notifRequests));
    qc.invalidateQueries({ queryKey: ["me"] });
    toast.success("Profile saved");
  }

  if (!me) return <div className="p-10 text-muted-foreground">…</div>;

  const input = "h-10 w-full rounded-full border border-border bg-card px-4 text-sm text-ink outline-none focus:border-ink/30";
  const label = "text-xs uppercase tracking-[0.18em] text-muted-foreground";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">You</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Profile</h1>

      <div className="mt-8 flex items-center gap-4">
        <Avatar name={fullName || me.name} color={color} size={64} />
        <div>
          <p className="text-lg text-ink">{fullName || me.name}</p>
          <p className="text-sm text-muted-foreground">@{me.username}</p>
        </div>
      </div>

      <section className="mt-10 space-y-4 rounded-3xl border border-border bg-card/50 p-6">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={label}>First name</label>
            <input value={first} onChange={(e) => setFirst(e.target.value)} className={`${input} mt-2`} />
          </div>
          <div className="flex-1">
            <label className={label}>Last name</label>
            <input value={last} onChange={(e) => setLast(e.target.value)} className={`${input} mt-2`} />
          </div>
        </div>
        <div>
          <label className={label}>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={`${input} mt-2`} placeholder="Where are you?" />
        </div>
        <div>
          <label className={label}>Avatar color</label>
          <div className="mt-3 flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                className={`h-7 w-7 rounded-full transition ${color === c ? "ring-2 ring-ink ring-offset-2 ring-offset-background" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-3xl border border-border bg-card/50 p-6">
        <p className={label}>Notifications</p>
        <Toggle label="New waves from friends" value={notifWaves} onChange={setNotifWaves} />
        <Toggle label="Friend requests" value={notifRequests} onChange={setNotifRequests} />
      </section>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={() => signOut()}
          className="inline-flex h-11 items-center rounded-full border border-border bg-card px-5 text-sm text-ink-soft transition hover:text-destructive"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm text-ink hover:bg-accent/40"
    >
      {label}
      <span className={`relative h-5 w-9 rounded-full transition ${value ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition ${value ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
