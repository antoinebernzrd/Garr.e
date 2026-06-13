import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

const TABS = [
  { to: "/app/friends", label: "Friends" },
  { to: "/app/groups", label: "Groups" },
  { to: "/app/notifications", label: "Notifications" },
  { to: "/app/profile", label: "Profile" },
] as const;

/**
 * Shared header for the /app/* sub-pages. Gives a way back to the dashboard
 * and tabs between the sub-pages. (The full sidebar from the plan is a larger
 * refactor; this keeps the new pages reachable with the same visual language.)
 */
export function AppSubNav({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-6 py-3">
        <Link
          to="/app"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm text-ink transition hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition"
              activeProps={{ className: "bg-ink text-background" }}
              inactiveProps={{ className: "text-ink-soft hover:bg-accent hover:text-ink" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {(eyebrow || title) && (
        <div className="mx-auto max-w-3xl px-6 pb-5 pt-2">
          {eyebrow && (
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
          )}
          <h1 className="mt-2 font-display text-4xl tracking-tight">{title}</h1>
        </div>
      )}
    </header>
  );
}
