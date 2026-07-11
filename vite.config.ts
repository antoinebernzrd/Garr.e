// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { readFileSync } from "node:fs";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// wrangler.jsonc `vars` is the single source of truth for the (public) Supabase
// config. Inject it as VITE_* here so builds need no .env file in the repo.
const wranglerText = readFileSync(new URL("./wrangler.jsonc", import.meta.url), "utf8");
const wranglerVars = Object.fromEntries(
  [...wranglerText.matchAll(/"(SUPABASE_\w+)":\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
);

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env.VITE_SUPABASE_URL ?? wranglerVars.SUPABASE_URL,
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? wranglerVars.SUPABASE_PUBLISHABLE_KEY,
      ),
    },
  },
});
