import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gamepad2, Film, Store, Search, User, Volume2, Bell, Settings,
  Download, BatteryFull, Users, Trophy, Power, Wifi, ChevronUp,
} from "lucide-react";
import bg1 from "@/assets/ps5/bg-1.jpg";
import bg2 from "@/assets/ps5/bg-2.jpg";
import bg3 from "@/assets/ps5/bg-3.jpg";
import bg4 from "@/assets/ps5/bg-4.jpg";
import bg5 from "@/assets/ps5/bg-5.jpg";

export const Route = createFileRoute("/ps5")({
  component: PS5Dashboard,
  head: () => ({
    meta: [
      { title: "Nova OS — Console Dashboard" },
      { name: "description", content: "A cinematic next-gen console interface inspired by the PS5 dashboard." },
    ],
  }),
});

type Tile = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  progress?: number;
  bg: string;
  accent: string;
};

const TILES: Tile[] = [
  { id: "neon", title: "NEON DRIFT", subtitle: "Open World · Cyberpunk", meta: "Continue · Chapter 4 · 12h played", progress: 64, bg: bg1, accent: "from-cyan-400/40 to-indigo-500/10" },
  { id: "hollow", title: "HOLLOW WOODS", subtitle: "Survival · Atmospheric", meta: "New episode available", progress: 28, bg: bg2, accent: "from-teal-300/30 to-slate-900/10" },
  { id: "voyager", title: "VOYAGER ∞", subtitle: "Sci-Fi · Single Player", meta: "Quick Resume · Mission 7", progress: 81, bg: bg3, accent: "from-violet-400/40 to-fuchsia-500/10" },
  { id: "apex", title: "APEX VELOCITY", subtitle: "Racing · Online", meta: "8 friends online", progress: 12, bg: bg4, accent: "from-cyan-300/40 to-rose-500/10" },
  { id: "ronin", title: "RONIN: LAST SUN", subtitle: "Action · Story", meta: "New trophy unlocked", progress: 47, bg: bg5, accent: "from-rose-400/40 to-purple-600/10" },
];

const NAV = [
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "media", label: "Media", icon: Film },
  { id: "store", label: "Store", icon: Store },
  { id: "search", label: "Search", icon: Search },
  { id: "profile", label: "Profile", icon: User },
] as const;

const CONTROLS = [
  { id: "audio", label: "Audio", icon: Volume2 },
  { id: "noti", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "profile", label: "Profile", icon: User },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "battery", label: "Controller", icon: BatteryFull },
  { id: "parties", label: "Parties", icon: Users },
  { id: "trophies", label: "Trophies", icon: Trophy },
  { id: "network", label: "Network", icon: Wifi },
  { id: "power", label: "Power", icon: Power },
] as const;

function PS5Dashboard() {
  const [navIndex, setNavIndex] = useState(0);
  const [tileIndex, setTileIndex] = useState(0);
  const [ccOpen, setCcOpen] = useState(false);
  const [focusedControl, setFocusedControl] = useState(0);
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setCcOpen(false);
      if (e.key.toLowerCase() === "c") return setCcOpen((v) => !v);
      if (ccOpen) {
        if (e.key === "ArrowRight") setFocusedControl((i) => (i + 1) % CONTROLS.length);
        if (e.key === "ArrowLeft") setFocusedControl((i) => (i - 1 + CONTROLS.length) % CONTROLS.length);
        return;
      }
      if (e.key === "ArrowRight") setTileIndex((i) => Math.min(TILES.length - 1, i + 1));
      if (e.key === "ArrowLeft") setTileIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowUp") setNavIndex((i) => (i - 1 + NAV.length) % NAV.length);
      if (e.key === "ArrowDown") setNavIndex((i) => (i + 1) % NAV.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ccOpen]);

  const focused = TILES[tileIndex];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05060a] text-white antialiased">
      {/* Animated cinematic background */}
      <CinematicBackground tile={focused} />

      {/* Top nav */}
      <header className="relative z-30 flex items-center justify-between px-10 pt-8 md:px-16 md:pt-10">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_2px] shadow-cyan-300/70" />
          Nova OS
        </div>
        <nav className="flex items-center gap-10 md:gap-14">
          {NAV.map((item, i) => {
            const Icon = item.icon;
            const active = i === navIndex;
            return (
              <button
                key={item.id}
                onClick={() => setNavIndex(i)}
                className="group relative flex flex-col items-center gap-2 outline-none"
              >
                <motion.div
                  animate={{ scale: active ? 1.15 : 0.9, opacity: active ? 1 : 0.45 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className="relative grid h-12 w-12 place-items-center"
                >
                  {active && (
                    <motion.span
                      layoutId="nav-glow"
                      className="absolute inset-0 rounded-full bg-cyan-300/15 blur-xl"
                    />
                  )}
                  <Icon className="relative h-6 w-6" strokeWidth={1.4} />
                </motion.div>
                <span
                  className={`text-[11px] uppercase tracking-[0.32em] transition ${
                    active ? "text-white" : "text-white/40"
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-2 h-px w-8 bg-gradient-to-r from-transparent via-cyan-300 to-transparent"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-5 text-[11px] uppercase tracking-[0.32em] text-white/60">
          <span>{time}</span>
          <span className="hidden md:inline">Online</span>
        </div>
      </header>

      {/* Hero + carousel */}
      <main className="relative z-20 flex h-[calc(100vh-9rem)] flex-col justify-between px-10 pt-14 md:px-16">
        <AnimatePresence mode="wait">
          <motion.section
            key={focused.id}
            initial={{ opacity: 0, x: -40, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -20, filter: "blur(8px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[62%]"
          >
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-[11px] uppercase tracking-[0.5em] text-cyan-200/80"
            >
              {focused.subtitle}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 text-6xl font-extralight leading-[0.95] tracking-tight md:text-8xl"
              style={{ textShadow: "0 8px 40px rgba(0,0,0,0.55)" }}
            >
              {focused.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 0.85, y: 0 }}
              transition={{ delay: 0.22 }}
              className="mt-6 text-sm font-light tracking-wide text-white/70 md:text-base"
            >
              {focused.meta}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex items-center gap-3"
            >
              <button className="group relative overflow-hidden rounded-full bg-white px-8 py-3 text-xs font-medium uppercase tracking-[0.3em] text-black transition hover:scale-[1.03]">
                <span className="relative z-10">Resume</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-cyan-200 to-white transition-transform duration-500 group-hover:translate-x-0" />
              </button>
              <button className="rounded-full border border-white/20 bg-white/5 px-7 py-3 text-xs font-medium uppercase tracking-[0.3em] text-white/85 backdrop-blur-md transition hover:border-white/40 hover:bg-white/10">
                Details
              </button>
              {typeof focused.progress === "number" && (
                <div className="ml-4 hidden items-center gap-3 md:flex">
                  <div className="h-px w-32 overflow-hidden rounded-full bg-white/15">
                    <motion.div
                      key={focused.id + "p"}
                      initial={{ width: 0 }}
                      animate={{ width: `${focused.progress}%` }}
                      transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-cyan-300 to-indigo-400"
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/55">
                    {focused.progress}% complete
                  </span>
                </div>
              )}
            </motion.div>
          </motion.section>
        </AnimatePresence>

        {/* Carousel */}
        <Carousel tiles={TILES} index={tileIndex} setIndex={setTileIndex} />
      </main>

      {/* Bottom system bar */}
      <footer className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-10 pb-6 md:px-16">
        <button
          onClick={() => setCcOpen(true)}
          className="group flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-[10px] uppercase tracking-[0.32em] text-white/70 backdrop-blur-xl transition hover:border-cyan-300/40 hover:text-white"
        >
          <ChevronUp className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5" />
          Control Center
          <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] tracking-widest text-white/50">
            C
          </span>
        </button>
        <div className="flex items-center gap-6 text-[10px] uppercase tracking-[0.32em] text-white/45">
          <span>← → navigate</span>
          <span>↑ ↓ menu</span>
          <span>esc close</span>
        </div>
      </footer>

      {/* Control center overlay */}
      <ControlCenter
        open={ccOpen}
        onClose={() => setCcOpen(false)}
        focused={focusedControl}
        setFocused={setFocusedControl}
      />
    </div>
  );
}

/* ============================================================ */

function CinematicBackground({ tile }: { tile: Tile }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.div
          key={tile.id}
          initial={{ opacity: 0, scale: 1.12, filter: "blur(20px)" }}
          animate={{ opacity: 1, scale: 1.0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(14px)" }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <motion.img
            src={tile.bg}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
            animate={{ scale: [1.0, 1.08, 1.0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#05060a]/50 via-[#05060a]/35 to-[#05060a]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#05060a]/85 via-[#05060a]/30 to-transparent" />
      <div className={`absolute inset-0 bg-gradient-to-tr ${tile.accent}`} />
      {/* Ambient noise */}
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px]" />
    </div>
  );
}

/* ============================================================ */

function Carousel({
  tiles, index, setIndex,
}: { tiles: Tile[]; index: number; setIndex: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const offsets = useMemo(() => tiles.map((_, i) => i - index), [tiles, index]);

  return (
    <div className="relative pb-16 pt-10">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.45em] text-white/55">Your Library</h2>
        <span className="text-[10px] uppercase tracking-[0.4em] text-white/35">
          {String(index + 1).padStart(2, "0")} / {String(tiles.length).padStart(2, "0")}
        </span>
      </div>
      <div ref={ref} className="relative h-56">
        {tiles.map((t, i) => {
          const offset = offsets[i];
          const abs = Math.abs(offset);
          const isFocus = offset === 0;
          return (
            <motion.button
              key={t.id}
              onClick={() => setIndex(i)}
              animate={{
                x: offset * 280,
                scale: isFocus ? 1.0 : 0.82,
                opacity: abs > 3 ? 0 : isFocus ? 1 : 0.4 - abs * 0.05,
                filter: isFocus ? "blur(0px)" : `blur(${abs * 1.2}px)`,
                zIndex: 10 - abs,
              }}
              transition={{ type: "spring", stiffness: 220, damping: 28, mass: 0.8 }}
              className="absolute left-0 top-0 h-52 w-72 origin-left overflow-hidden rounded-[28px] border border-white/10 bg-white/5 text-left shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md outline-none"
              style={{ transformStyle: "preserve-3d" }}
            >
              <img
                src={t.bg}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className={`absolute inset-0 bg-gradient-to-tr ${t.accent} mix-blend-overlay`} />
              {isFocus && (
                <motion.div
                  layoutId="card-glow"
                  className="absolute -inset-px rounded-[28px] ring-1 ring-cyan-300/40"
                  style={{ boxShadow: "0 0 60px -10px rgba(103,232,249,0.55)" }}
                />
              )}
              <div className="absolute inset-x-5 bottom-4">
                <p className="text-[9px] uppercase tracking-[0.35em] text-white/65">{t.subtitle}</p>
                <p className="mt-1 truncate text-base font-light tracking-wide text-white">{t.title}</p>
                {typeof t.progress === "number" && (
                  <div className="mt-2 h-px w-full overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-300 to-indigo-400"
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {/* inner highlight */}
              <div className="pointer-events-none absolute inset-0 rounded-[28px] [background:linear-gradient(135deg,rgba(255,255,255,0.18),transparent_40%)] opacity-70" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================ */

function ControlCenter({
  open, onClose, focused, setFocused,
}: {
  open: boolean;
  onClose: () => void;
  focused: number;
  setFocused: (i: number) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/40 backdrop-blur-2xl"
          />
          <motion.div
            initial={{ y: 240, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            className="absolute inset-x-0 bottom-0 z-50 px-8 pb-10 pt-8 md:px-16"
          >
            <div className="mx-auto max-w-6xl rounded-[36px] border border-white/12 bg-white/[0.04] p-8 shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.45em] text-white/55">Control Center</p>
                <button
                  onClick={onClose}
                  className="text-[10px] uppercase tracking-[0.32em] text-white/45 hover:text-white"
                >
                  Close · esc
                </button>
              </div>
              <div className="grid grid-cols-5 gap-4 md:grid-cols-10">
                {CONTROLS.map((c, i) => {
                  const Icon = c.icon;
                  const active = i === focused;
                  return (
                    <motion.button
                      key={c.id}
                      onClick={() => setFocused(i)}
                      animate={{
                        scale: active ? 1.08 : 1,
                        opacity: active ? 1 : 0.65,
                      }}
                      transition={{ type: "spring", stiffness: 280, damping: 22 }}
                      className="group relative flex flex-col items-center gap-3"
                    >
                      <div
                        className={`relative grid h-16 w-16 place-items-center rounded-full border transition ${
                          active
                            ? "border-cyan-300/60 bg-white/15"
                            : "border-white/12 bg-white/5"
                        }`}
                      >
                        {active && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                            transition={{ duration: 2.4, repeat: Infinity }}
                            className="absolute inset-0 rounded-full bg-cyan-300/15 blur-lg"
                          />
                        )}
                        <Icon className="relative h-6 w-6 text-white" strokeWidth={1.3} />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.28em] text-white/70">
                        {c.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-white/8 pt-5 text-[10px] uppercase tracking-[0.32em] text-white/45">
                <span>Profile · Player_01</span>
                <span>Storage · 612 GB free</span>
                <span>Wi-Fi · Aurora 5G</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
