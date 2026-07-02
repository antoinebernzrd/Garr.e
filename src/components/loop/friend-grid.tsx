import type { FriendWithUpdate } from "@/lib/types";
import { primaryGroupColor } from "@/lib/groups";

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60 * 60 * 1000) return "just now";
  if (diff < DAY) return `${Math.max(1, Math.floor(diff / (60 * 60 * 1000)))}h ago`;
  const d = Math.floor(diff / DAY);
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function FriendGrid({
  friends,
  onOpen,
}: {
  friends: FriendWithUpdate[];
  onOpen: (id: string) => void;
}) {
  const sorted = [...friends].sort((a, b) => {
    const aT = a.latestUpdate ? new Date(a.latestUpdate.created_at).getTime() : 0;
    const bT = b.latestUpdate ? new Date(b.latestUpdate.created_at).getTime() : 0;
    return bT - aT;
  });

  if (sorted.length === 0) {
    return (
      <div className="border border-white/5 bg-white/[0.02] p-12 text-center">
        <p className="text-base text-white/60">No friends match this view.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {sorted.map((f) => (
        <FriendCard key={f.profile.id} friend={f} onOpen={() => onOpen(f.profile.id)} />
      ))}
    </ul>
  );
}

function FriendCard({ friend, onOpen }: { friend: FriendWithUpdate; onOpen: () => void }) {
  const { profile, latestUpdate, groups } = friend;
  const accent = primaryGroupColor(groups) ?? profile.avatar_color;

  return (
    <li>
      <button
        onClick={onOpen}
        className="group w-full text-left transition-opacity hover:opacity-80"
      >
        {/* Color block */}
        <div
          className="relative flex aspect-[3/2] w-full items-end overflow-hidden p-3"
          style={{ backgroundColor: accent }}
        >
          {/* update dot */}
          {latestUpdate && (
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 bg-white" />
          )}
        </div>

        {/* Label */}
        <div className="mt-2">
          <p className="truncate text-[13px] font-medium text-foreground">{profile.name}</p>
          {latestUpdate ? (
            <p className="mt-0.5 truncate text-[11px] text-ink-soft">
              {daysAgo(latestUpdate.created_at)}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] italic text-ink-soft opacity-50">no update</p>
          )}
        </div>
      </button>
    </li>
  );
}
