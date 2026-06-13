import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { PostcardBackdrop } from "@/components/loop/postcard-backdrop";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [loading, user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/app" });
  }

  const input =
    "h-11 w-full rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm text-white placeholder:text-white/40 outline-none backdrop-blur-md transition focus:border-white/40";

  return (
    <PostcardBackdrop>
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="flex w-full flex-col gap-3"
      >
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />
        <button
          disabled={submitting}
          className="h-11 w-full rounded-full border border-white/25 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white/15 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-1 text-center text-xs text-white/55">
          New here?{" "}
          <Link to="/signup" className="text-white underline underline-offset-2">
            Make an account
          </Link>
        </p>
      </motion.form>
    </PostcardBackdrop>
  );
}
