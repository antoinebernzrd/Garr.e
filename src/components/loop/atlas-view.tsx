import type { FriendWithUpdate, Profile } from "@/lib/types";
import { findCityPreset, projectLatLng } from "@/lib/cities";
import { useMemo, useState } from "react";

type Pin = {
  id: string;
  name: string;
  city: string;
  color: string;
  x: number;
  y: number;
};

export function AtlasView({
  friends,
  onOpen,
  me,
}: {
  friends: FriendWithUpdate[];
  onOpen: (id: string) => void;
  me: Profile | null;
}) {
  const pins = useMemo<Pin[]>(() => {
    const list: Pin[] = [];
    for (const f of friends) {
      const cityName = f.latestUpdate?.city ?? f.profile.city;
      let lat = f.latestUpdate?.lat ?? null;
      let lng = f.latestUpdate?.lng ?? null;
      if ((lat == null || lng == null) && cityName) {
        const p = findCityPreset(cityName);
        if (p) {
          lat = p.lat;
          lng = p.lng;
        }
      }
      if (lat != null && lng != null) {
        const { x, y } = projectLatLng(lat, lng);
        list.push({
          id: f.profile.id,
          name: f.profile.name,
          city: cityName ?? "",
          color: f.profile.avatar_color,
          x,
          y,
        });
      }
    }
    return list;
  }, [friends]);

  const elsewhere = friends.filter((f) => {
    const c = f.latestUpdate?.city ?? f.profile.city;
    return !c || (!findCityPreset(c) && f.latestUpdate?.lat == null);
  });

  const [hover, setHover] = useState<Pin | null>(null);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <div className="absolute left-5 top-5 z-10">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">The atlas</p>
          <p className="font-display text-2xl">{pins.length} on the map</p>
        </div>

        <svg viewBox="0 0 1000 500" className="block h-auto w-full">
          {/* Subtle land mass silhouette via grid + dotted continents approximation */}
          <defs>
            <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="oklch(0.85 0.02 70)" />
            </pattern>
          </defs>
          <rect width="1000" height="500" fill="var(--paper)" />
          <rect width="1000" height="500" fill="url(#dots)" opacity="0.6" />

          {/* equator + meridian guides */}
          <line x1="0" y1="250" x2="1000" y2="250" stroke="oklch(0.8 0.02 70)" strokeDasharray="2 6" />
          <line x1="500" y1="0" x2="500" y2="500" stroke="oklch(0.8 0.02 70)" strokeDasharray="2 6" />

          {pins.map((p) => (
            <g
              key={p.id}
              transform={`translate(${p.x * 1000}, ${p.y * 500})`}
              className="cursor-pointer"
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onOpen(p.id)}
            >
              <circle r="14" fill={p.color} fillOpacity="0.18" />
              <circle r="6" fill={p.color} stroke="white" strokeWidth="2" />
            </g>
          ))}

          {hover && (
            <g transform={`translate(${hover.x * 1000 + 12}, ${hover.y * 500 - 10})`}>
              <rect x="0" y="-18" rx="6" ry="6" width={hover.name.length * 7 + 60} height="36" fill="var(--ink)" />
              <text x="10" y="-2" fill="white" fontSize="12" fontFamily="var(--font-sans)">
                {hover.name}
              </text>
              <text x="10" y="14" fill="white" fontSize="10" opacity="0.7">
                {hover.city}
              </text>
            </g>
          )}
        </svg>
      </div>

      {elsewhere.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Elsewhere</p>
          <p className="mt-1 text-sm text-ink-soft">
            These friends haven't placed themselves on a known city yet.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {elsewhere.map((f) => (
              <button
                key={f.profile.id}
                onClick={() => onOpen(f.profile.id)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
              >
                {f.profile.name}
                {f.profile.city ? <span className="ml-1 text-muted-foreground">· {f.profile.city}</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
