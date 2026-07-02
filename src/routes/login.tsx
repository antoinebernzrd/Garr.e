import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import pc1 from "@/assets/postcards/pc-1.jpg";
import pc2 from "@/assets/postcards/pc-2.jpg";
import pc3 from "@/assets/postcards/pc-3.jpg";
import pc4 from "@/assets/postcards/pc-4.jpg";
import pc5 from "@/assets/postcards/pc-5.jpg";
import pc6 from "@/assets/postcards/pc-6.jpg";
import pcArch from "@/assets/postcards/30506627.jpeg";
import pcDevil from "@/assets/postcards/av_85584 copy 2.png";
import pcGiac from "@/assets/postcards/Man-Pointing.jpg";
import pcIMG0 from "@/assets/postcards/IMG_0680.jpeg";
import pcIMG3 from "@/assets/postcards/IMG_3231.jpeg";
import pcB from "@/assets/postcards/8c90831c831c7a10d5700e143721c2ef.jpg";
import pcNNG from "@/assets/postcards/ignant-architecture-neue-nationalgalerie-08-2880x2259.jpg.webp";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const sourceCards = [
  pc1, pc2, pc3, pc4, pc5, pc6,
  pcArch, pcDevil, pcGiac, pcIMG0, pcIMG3, pcB, pcNNG,
];
const allCards = Array.from({ length: 30 }, (_, i) => sourceCards[i % sourceCards.length]);

// Pre-bake randomness so each card always has unique fall trajectory
const cardFallData = allCards.map(() => ({
  xMid: (Math.random() - 0.5) * 120,
  xEnd: (Math.random() - 0.5) * 300,
  yMid: 150 + Math.random() * 200,
  yEnd: 600 + Math.random() * 600,
  rotMid: (Math.random() - 0.5) * 120,
  rotEnd: (Math.random() - 0.5) * 540,
  dur: 1.1 + Math.random() * 0.8,
}));

type Stage = "cards" | "falling" | "login";

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<Stage>("cards");
  const [fallenCards, setFallenCards] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [loading, user, navigate]);

  function handleRedClick() {
    setStage("falling");
    allCards.forEach((_, i) => {
      const delay = i * 25 + Math.random() * 40;
      window.setTimeout(() => {
        setFallenCards((prev) => new Set(prev).add(i));
      }, delay);
    });
    window.setTimeout(() => setStage("login"), 300);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/app" });
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">

      {/* Cards grid */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-10 gap-x-4 gap-y-2 p-6 sm:grid-cols-4 sm:grid-rows-8 md:grid-cols-6 md:grid-rows-5 md:gap-x-5 md:gap-y-2.5 md:p-12">
        {allCards.map((src, i) => {
          const dur = 6 + ((i * 1.7) % 5);
          const xAmp = 4 + ((i * 3) % 7);
          const yAmp = 6 + ((i * 5) % 9);
          const rotAmp = 0.6 + ((i * 0.37) % 1.4);
          const fallen = fallenCards.has(i);
          const fd = cardFallData[i];

          return (
            <motion.div
              key={i}
              className="relative bg-white p-[3px] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)] ring-1 ring-black/10"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={
                fallen
                  ? { y: [0, fd.yMid, fd.yEnd], x: [0, fd.xMid, fd.xEnd], rotate: [0, fd.rotMid, fd.rotEnd], opacity: [1, 1, 0], zIndex: 60 }
                  : { opacity: 1, scale: 1, x: [0, xAmp, -xAmp * 0.6, xAmp * 0.4, 0], y: [0, -yAmp, yAmp * 0.5, -yAmp * 0.3, 0], rotate: [0, rotAmp, -rotAmp * 0.7, rotAmp * 0.4, 0] }
              }
              transition={
                fallen
                  ? { duration: fd.dur, ease: [0.4, 0, 0.9, 0.6] as const, times: [0, 0.4, 1] }
                  : {
                      opacity: { delay: i * 0.03, duration: 0.7, ease: "easeOut" },
                      scale: { delay: i * 0.03, duration: 0.7, ease: "easeOut" },
                      x: { delay: i * 0.13, duration: dur, repeat: Infinity, ease: "easeInOut" },
                      y: { delay: i * 0.11, duration: dur + 1.3, repeat: Infinity, ease: "easeInOut" },
                      rotate: { delay: i * 0.17, duration: dur + 2.1, repeat: Infinity, ease: "easeInOut" },
                    }
              }
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </motion.div>
          );
        })}
      </div>

      {/* Red square */}
      <AnimatePresence>
        {stage === "cards" && (
          <motion.button
            onClick={handleRedClick}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ delay: 0.9, duration: 0.35, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 z-50 h-4 w-4 -translate-x-1/2 -translate-y-1/2 bg-red-500"
            style={{ borderRadius: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Login form */}
      <AnimatePresence>
        {stage === "login" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 z-50 flex items-center"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif" }}
          >
            {/* Left — login */}
            <div className="flex h-full w-full flex-col items-center justify-center md:w-1/2">
              <h1 className="mb-8 text-4xl font-semibold tracking-tight text-white">
                Garr.e
              </h1>
              <AnimatePresence mode="wait">
                {!showForm ? (
                  <motion.button
                    key="block"
                    onClick={() => setShowForm(true)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.1, 1, 0.3, 1] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, times: [0, 0.12, 0.25, 0.45, 0.65, 1], ease: "linear" }}
                    className="flex w-full max-w-xs items-center justify-center bg-white py-10 text-sm font-medium tracking-widest text-black uppercase"
                    style={{ borderRadius: 0 }}
                  >
                    Sign in
                  </motion.button>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.1, 1, 0.3, 1] }}
                    transition={{ duration: 0.7, times: [0, 0.12, 0.25, 0.45, 0.65, 1], ease: "linear" }}
                    className="w-full max-w-xs border border-white p-6"
                  >
                    <form onSubmit={onSubmit} autoComplete="off" className="flex w-full flex-col gap-3">
                      <input
                        type="email"
                        required
                        autoComplete="off"
                        placeholder="Email"
                        readOnly
                        onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 w-full bg-zinc-700 px-4 text-sm text-white placeholder:text-white/40 outline-none focus:bg-zinc-600 transition"
                        style={{ borderRadius: 0, border: "none" }}
                      />
                      <input
                        type="password"
                        required
                        autoComplete="off"
                        placeholder="Password"
                        readOnly
                        onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 w-full bg-zinc-700 px-4 text-sm text-white placeholder:text-white/40 outline-none focus:bg-zinc-600 transition"
                        style={{ borderRadius: 0, border: "none" }}
                      />
                      <button
                        disabled={submitting}
                        className="h-11 w-full bg-zinc-600 px-4 text-sm font-medium text-white transition hover:bg-zinc-500 disabled:opacity-60"
                        style={{ borderRadius: 0, border: "none" }}
                      >
                        {submitting ? "Signing in…" : "Sign in"}
                      </button>
                      <p className="mt-1 text-xs text-white/50">
                        New here?{" "}
                        <Link to="/signup" className="text-white underline underline-offset-2">
                          Make an account
                        </Link>
                      </p>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right — quote */}
            <div className="hidden h-full w-1/2 flex-col items-center justify-center md:flex">
              <p className="max-w-xs text-2xl font-light leading-snug tracking-tight text-white/70 italic">
                "I keep cards for shared moments that matter"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
