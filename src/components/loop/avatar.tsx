type Props = {
  name: string;
  color: string;
  size?: number;
  ring?: boolean;
  ringColor?: string | null;
};

export function Avatar({ name, color, size = 40, ring = false, ringColor = null }: Props) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const pad = ringColor ? 3 : 0;
  const inner = (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ${
        ring ? "ring-2 ring-background" : ""
      }`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: Math.max(11, size * 0.36),
        letterSpacing: "0.02em",
      }}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
  if (!ringColor) return inner;
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        padding: pad,
        background: `conic-gradient(${ringColor}, ${ringColor})`,
        width: size + pad * 2,
        height: size + pad * 2,
      }}
    >
      <div className="rounded-full" style={{ padding: 2, background: "var(--background)" }}>
        {inner}
      </div>
    </div>
  );
}
