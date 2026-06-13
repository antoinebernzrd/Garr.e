import type { FriendWithUpdate } from "@/lib/types";
import { Avatar } from "./avatar";
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
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-12 text-center font-sans">
        <p className="text-base text-white/60">No friends match this view.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.06] bg-[#0f0f0f] font-sans">
      {sorted.map((f) => (
        <FriendRow key={f.profile.id} friend={f} onOpen={() => onOpen(f.profile.id)} />
      ))}
    </ul>
  );
}

function FriendRow({ friend, onOpen }: { friend: FriendWithUpdate; onOpen: () => void }) {
  const { profile, latestUpdate, groups } = friend;
  const city = latestUpdate?.city ?? profile.city;
  const accent = primaryGroupColor(groups);
  const primaryGroup = groups[0];

  return (
    <li>
      <button
        onClick={onOpen}
        className="group relative flex w-full items-center gap-5 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
      >
        {/* Left color accent */}
        {accent && (
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-[3px]"
            style={{ background: accent }}
          />
        )}

        <Avatar name={profile.name} color={profile.avatar_color} size={56} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <p className="truncate text-[15px] font-medium text-white">{profile.name}</p>
            {primaryGroup && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-white/80"
                style={{ background: `${primaryGroup.color}22`, color: primaryGroup.color }}
              >
                {primaryGroup.name}
              </span>
            )}
            <span className="text-[12px] text-white/30">@{profile.username}</span>
          </div>
          <p className="mt-1 truncate text-[13px] text-white/55">
            {city && <span className="text-white/70">{city}</span>}
            {city && latestUpdate && <span className="mx-2 text-white/20">·</span>}
            {latestUpdate ? (
              latestUpdate.text
            ) : (
              <span className="italic text-white/30">No update yet</span>
            )}
          </p>
        </div>

        <div className="hidden flex-shrink-0 text-right sm:block">
          {latestUpdate ? (
            <span className="text-[12px] tabular-nums text-white/45">
              {daysAgo(latestUpdate.created_at)}
            </span>
          ) : (
            <span className="text-[12px] text-white/25">—</span>
          )}
        </div>
      </button>
    </li>
  );
}
