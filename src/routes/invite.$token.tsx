import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { PostcardBackdrop } from "@/components/loop/postcard-backdrop";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Stash the invite token so signup/login can pick it up post-auth.
  useEffect(() => {
    if (typeof window !== "undefined" && token) {
      localStorage.setItem("loop:invite-token", token);
    }
  }, [token]);

  // If already logged in, send them to the app — token is in localStorage for
  // future invite-redemption logic.
  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [loading, user, navigate]);

  return (
    <PostcardBackdrop>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="flex w-full flex-col items-center gap-5 text-center"
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">You've been invited</p>
        <h1 className="font-display text-4xl text-white md:text-5xl">
          Someone wants you in their Loop.
        </h1>
        <p className="max-w-sm text-sm text-white/65">
          Loop is a quiet friend dashboard. One card per person. No feed, no algorithm.
          Make an account to accept the invite.
        </p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <Link
            to="/signup"
            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/30 bg-white/15 px-5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/25"
          >
            Make an account
          </Link>
          <Link
            to="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm text-white/85 backdrop-blur-md transition hover:bg-white/10"
          >
            I already have one
          </Link>
        </div>
      </motion.div>
    </PostcardBackdrop>
  );
}
