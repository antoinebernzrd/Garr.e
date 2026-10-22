import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Separate from vite.config.ts on purpose: that one wires the Cloudflare/TanStack
// build plugins, which unit tests don't need.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts", "supabase/**/*.test.ts"] },
});
