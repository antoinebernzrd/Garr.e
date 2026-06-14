import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { AVATAR_COLORS } from "@/lib/groups";
import { PostcardBackdrop } from "@/components/loop/postcard-backdrop";

export const Route = createFileRoute("/signup")({
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [loading, user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const first = firstName.trim();
    const last = lastName.trim();
    const fullName = [first, last].filter(Boolean).join(" ");
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          name: fullName,
          first_name: first,
          last_name: last,
          username: cleanUsername,
          city: city.trim(),
          avatar_color: color,
        },
      },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    localStorage.setItem("loop:onboarding", "pending");
    toast.success("Welcome to Loop");
    navigate({ to: "/app" });
  }

  const inputCls =
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
        <div className="flex gap-3">
          <input required placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
        </div>
        <input required placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} />
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        <input type="password" minLength={8} required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        <input placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              aria-label={c}
              className={`h-6 w-6 rounded-full transition ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#161e2e]" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <button
          disabled={submitting}
          className="mt-1 h-11 w-full rounded-full border border-white/25 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white/15 disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
        <p className="text-center text-xs text-white/55">
          Already on Loop?{" "}
          <Link to="/login" className="text-white underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </motion.form>
    </PostcardBackdrop>
  );
}
