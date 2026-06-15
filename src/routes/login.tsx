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

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const userCards = [pc1, pc2, pc3, pc4, pc5, pc6];
const allCards = Array.from({ length: 24 }, (_, i) => userCards[i % userCards.length]);

type Stage = "cards" | "falling" | "login";

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<Stage>("cards");
  const [fallenCards, setFallenCards] = useState<Set<number>>(new Set());

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
    window.setTimeout(() => setStage("login"), 1800);
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
    <div className="relative h-screen w-full overflow-hidden bg-[#161e2e]">

      {/* Cards grid */}
      <div className="absolute inset-0 grid grid-cols-3 gap-x-4 gap-y-2 p-6 sm:grid-cols-4 md:grid-cols-6 md:gap-x-5 md:gap-y-2.5 md:p-12">
        {allCards.map((src, i) => {
          const dur = 6 + ((i * 1.7) % 5);
          const xAmp = 4 + ((i * 3) % 7);
          const yAmp = 6 + ((i * 5) % 9);
          const rotAmp = 0.6 + ((i * 0.37) % 1.4);
          const fallen = fallenCards.has(i);

          return (
            <motion.div
              key={i}
              className="relative aspect-[3/2] bg-white p-[3px] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)] ring-1 ring-black/10"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={
                fallen
                  ? {
                      y: [0, 60, 220, 520, 1200],
                      x: [0, -10, 30, -20, 60],
                      rotate: [0, 25, -40, 90, 220],
                      opacity: [1, 1, 1, 0.9, 0],
                      zIndex: 60,
                    }
                  : {
                      opacity: 1,
                      scale: 1,
                      x: [0, xAmp, -xAmp * 0.6, xAmp * 0.4, 0],
                      y: [0, -yAmp, yAmp * 0.5, -yAmp * 0.3, 0],
                      rotate: [0, rotAmp, -rotAmp * 0.7, rotAmp * 0.4, 0],
                    }
              }
              transition={
                fallen
                  ? { duration: 1.6, ease: [0.55, 0, 0.85, 0.2] as const, times: [0, 0.15, 0.4, 0.7, 1] }
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
            className="absolute left-1/2 top-1/2 z-50 h-11 w-11 -translate-x-1/2 -translate-y-1/2 bg-red-500"
            style={{ borderRadius: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Login form */}
      <AnimatePresence>
        {stage === "login" && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(24px)", scale: 1.04 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center px-4"
          >
            <h1
              className="mb-8 text-4xl text-white"
              style={{ fontFamily: '"Geist", ui-sans-serif, sans-serif', fontWeight: 600, letterSpacing: "0.02em" }}
            >
              Garr.e
            </h1>

            <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-3">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full border border-white/20 bg-white/[0.06] px-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/50 transition"
                style={{ borderRadius: 0 }}
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full border border-white/20 bg-white/[0.06] px-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/50 transition"
                style={{ borderRadius: 0 }}
              />
              <button
                disabled={submitting}
                className="h-11 w-full border border-white/25 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-60"
                style={{ borderRadius: 0 }}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
              <p className="mt-1 text-center text-xs text-white/50">
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
  );
}
