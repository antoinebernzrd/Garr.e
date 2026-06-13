type Props = {
  color: string;
  size?: number;
  ring?: boolean;
  walking?: boolean;
  swimming?: boolean;
  facing?: "left" | "right";
  angle?: number; // degrees, used while swimming (0 = facing right)
  tilt?: number; // degrees, body lean while walking (in unmirrored frame)
  label?: string;
};

export function CharacterAvatar({
  color,
  size = 24,
  ring = false,
  walking = false,
  swimming = false,
  facing = "right",
  angle = 0,
  tilt = 0,
  label,
}: Props) {
  const w = size;
  const h = size * (32 / 24);
  const stroke = color;
  const sw = 2;
  const filter = ring
    ? `drop-shadow(0 0 6px ${color}cc) drop-shadow(0 1px 1px rgba(0,0,0,.6))`
    : "drop-shadow(0 1px 1px rgba(0,0,0,.6))";

  return (
    <div
      className="relative inline-flex flex-col items-center"
      style={{ width: w }}
      aria-label={label}
    >
      <svg width={w} height={h} viewBox="0 0 24 32" style={{ filter }}>
        {swimming ? (
          // Rotate the swim pose to face the movement direction.
          <g
            style={{
              transformOrigin: "12px 22px",
              transform: `rotate(${angle}deg)`,
              transition: "transform 220ms ease-out",
            }}
          >
            <SwimmingPose stroke={stroke} sw={sw} />
          </g>
        ) : (
          // Mirror horizontally based on facing, then apply walking lean.
          <g
            style={{
              transformOrigin: "12px 20px",
              transform: facing === "left" ? "scaleX(-1)" : "none",
              transition: "transform 120ms ease-out",
            }}
          >
            <g
              style={{
                transformOrigin: "12px 22px",
                transform: `rotate(${tilt}deg)`,
                transition: "transform 180ms ease-out",
              }}
            >
              <StandingPose stroke={stroke} sw={sw} walking={walking} />
            </g>
          </g>
        )}
      </svg>

      <style>{`
        @keyframes stickLegL { 0%,100% { transform: rotate(-18deg);} 50% { transform: rotate(18deg);} }
        @keyframes stickLegR { 0%,100% { transform: rotate(18deg);}  50% { transform: rotate(-18deg);} }
        @keyframes stickArmL { 0%,100% { transform: rotate(14deg);}  50% { transform: rotate(-14deg);} }
        @keyframes stickArmR { 0%,100% { transform: rotate(-14deg);} 50% { transform: rotate(14deg);} }
        .stick-leg-l { animation: stickLegL 380ms ease-in-out infinite; }
        .stick-leg-r { animation: stickLegR 380ms ease-in-out infinite; }
        .stick-arm-l { animation: stickArmL 380ms ease-in-out infinite; }
        .stick-arm-r { animation: stickArmR 380ms ease-in-out infinite; }

        @keyframes swimArm  { 0%,100% { transform: rotate(-30deg);} 50% { transform: rotate(40deg);} }
        @keyframes swimArm2 { 0%,100% { transform: rotate(40deg);}  50% { transform: rotate(-30deg);} }
        @keyframes swimKick { 0%,100% { transform: rotate(-10deg);} 50% { transform: rotate(10deg);} }
        @keyframes swimBob  { 0%,100% { transform: translateY(0);}  50% { transform: translateY(1px);} }
        @keyframes ripple   { 0% { opacity:.6; transform: scale(.7);} 100% { opacity:0; transform: scale(1.4);} }
        .swim-arm-a { animation: swimArm  600ms ease-in-out infinite; }
        .swim-arm-b { animation: swimArm2 600ms ease-in-out infinite; }
        .swim-leg-a { animation: swimKick 300ms ease-in-out infinite; }
        .swim-leg-b { animation: swimKick 300ms ease-in-out infinite reverse; }
        .swim-body  { animation: swimBob  900ms ease-in-out infinite; }
        .swim-ripple{ animation: ripple   1200ms ease-out infinite; transform-origin: 12px 26px; }
      `}</style>
    </div>
  );
}

function StandingPose({
  stroke,
  sw,
  walking,
}: {
  stroke: string;
  sw: number;
  walking: boolean;
}) {
  return (
    <>
      <ellipse cx="12" cy="30.5" rx="5" ry="1" fill="rgba(0,0,0,0.45)" />
      <circle cx="12" cy="6" r="4" fill="none" stroke={stroke} strokeWidth={sw} />
      <line x1="12" y1="10" x2="12" y2="20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <g className={walking ? "stick-arm-l" : ""} style={{ transformOrigin: "12px 13px" }}>
        <line x1="12" y1="13" x2="6" y2="17" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </g>
      <g className={walking ? "stick-arm-r" : ""} style={{ transformOrigin: "12px 13px" }}>
        <line x1="12" y1="13" x2="18" y2="17" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </g>
      <g className={walking ? "stick-leg-l" : ""} style={{ transformOrigin: "12px 20px" }}>
        <line x1="12" y1="20" x2="7" y2="29" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </g>
      <g className={walking ? "stick-leg-r" : ""} style={{ transformOrigin: "12px 20px" }}>
        <line x1="12" y1="20" x2="17" y2="29" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </g>
    </>
  );
}

function SwimmingPose({ stroke, sw }: { stroke: string; sw: number }) {
  // Pose points to the right by default (head at x=19).
  return (
    <>
      <ellipse
        cx="12"
        cy="26"
        rx="6"
        ry="1.5"
        fill="none"
        stroke="rgba(125,200,255,0.65)"
        strokeWidth="0.8"
        className="swim-ripple"
      />
      <ellipse
        cx="12"
        cy="28"
        rx="7"
        ry="1.2"
        fill="none"
        stroke="rgba(125,200,255,0.4)"
        strokeWidth="0.6"
      />

      <g className="swim-body" style={{ transformOrigin: "12px 22px" }}>
        <circle cx="19" cy="22" r="3" fill="none" stroke={stroke} strokeWidth={sw} />
        <line x1="17" y1="22" x2="7" y2="22" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <g className="swim-arm-a" style={{ transformOrigin: "16px 22px" }}>
          <line x1="16" y1="22" x2="22" y2="19" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
        <g className="swim-arm-b" style={{ transformOrigin: "16px 22px" }}>
          <line x1="16" y1="22" x2="20" y2="25" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
        <g className="swim-leg-a" style={{ transformOrigin: "8px 22px" }}>
          <line x1="8" y1="22" x2="3" y2="20" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
        <g className="swim-leg-b" style={{ transformOrigin: "8px 22px" }}>
          <line x1="8" y1="22" x2="3" y2="24" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
      </g>
    </>
  );
}
