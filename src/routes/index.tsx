import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { PostcardBackdrop } from "@/components/loop/postcard-backdrop";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  return (
    <PostcardBackdrop>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="flex w-full flex-col items-center gap-5"
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">
          A friend dashboard, not a feed
        </p>
        <p className="max-w-sm text-center text-sm leading-relaxed text-white/75">
          One card per person. One map of where everyone is. No infinite scroll,
          no algorithm — just your people, in one quiet view.
        </p>
        <div className="mt-2 flex w-full flex-col gap-3">
          <Link
            to="/signup"
            className="flex h-11 w-full items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white/15"
          >
            Start your loop
          </Link>
          <Link
            to="/login"
            className="flex h-11 w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm text-white/80 backdrop-blur-md transition hover:border-white/30 hover:text-white"
          >
            I already have an account
          </Link>
        </div>
      </motion.div>
    </PostcardBackdrop>
  );
}
