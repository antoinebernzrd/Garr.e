# Garr.e

A relationship tracker: keep your friends and contacts in one place, see them as a grid,
a map or a graph, post updates, and log what is next with each person. Contacts who are not
on the app can be managed as CRM-style cards.

## Stack

- [TanStack Start](https://tanstack.com/start) (React, TypeScript, file-based routing), Vite
- Tailwind CSS and shadcn/ui (Radix)
- Supabase for auth, Postgres and row-level security
- Deployed as a Cloudflare Worker (`wrangler.jsonc`)

## Data model

`supabase/bootstrap_full_schema.sql` creates the whole schema on a fresh project:
`profiles`, `friendships`, `friend_assignments`, `updates`, `next_up_items`, `waves` and
`user_groups`. Row-level security is enabled on every table.

## Run it

```bash
bun install
bun run dev
```

Supabase settings live in `wrangler.jsonc` under `vars`, so no `.env` is needed. To use your
own project, run `supabase/bootstrap_full_schema.sql` in its SQL editor, then change those
values or export `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. See
[`.env.example`](.env.example).

The service-role key is a secret: set it with `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
and never commit it.

## Scripts

| Command | What it does |
|---------|--------------|
| `bun run dev` | Dev server |
| `bun run build` | Production build |
| `bun run test` | Vitest: city lookup, group palette, and schema checks (RLS on every table) |
| `bun run lint` | ESLint (currently reports formatting issues; run `bun run format` to fix most) |
| `bun run format` | Prettier |

## Secrets

Gitleaks runs in CI. Locally: `brew install gitleaks && git config core.hooksPath .githooks`.

## Layout

```
src/routes/                   file-based routes (login, signup, invite, authenticated app)
src/components/loop/          friend grid, map, graph and detail views
src/integrations/supabase/    client, auth middleware, generated types
supabase/                     schema and config
```
