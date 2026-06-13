# Route restructure

## New route tree

```
src/routes/
  __root.tsx                  (unchanged shell)
  index.tsx                   /              landing (public)
  login.tsx                   /login         (was signin.tsx — renamed)
  signup.tsx                  /signup        + triggers onboarding on first login
  invite.$token.tsx           /invite/:token accept-invite landing
  _authenticated.tsx          guard: redirects to / if not logged in
  _authenticated/app.tsx      /app           layout (sidebar + outlet) → defaults to grid view
  _authenticated/app.index.tsx        /app           dashboard (Grid / Map / Graph)
  _authenticated/app.profile.tsx      /app/profile
  _authenticated/app.friends.tsx      /app/friends
  _authenticated/app.groups.tsx       /app/groups
  _authenticated/app.notifications.tsx /app/notifications
```

`signin.tsx` is removed (renamed to `login.tsx`). Internal links to `/signin` are updated to `/login`. `ps5.tsx` is left alone.

## Auth logic

- `_authenticated.tsx` checks `useAuth()` in component (client-side, since session lives in localStorage). If `!loading && !user` → `redirect({ to: "/" })`. While `loading`, render a small spinner.
- Landing `/`: if logged in, redirect to `/app` (already does this).
- `/login` and `/signup`: if logged in, redirect to `/app`.
- First-login detection: on signup success, set `localStorage.loop:onboarding = "pending"`. `/app` reads this on mount and shows the onboarding overlay, then clears the flag.

## /app layout

The sidebar (left, always visible on `/app/*`) holds:
- Logo + "Loop" wordmark
- Nav: Dashboard, Friends, Groups, Notifications, Profile
- Bottom: avatar + sign out

The dashboard page (`/app` index) keeps the existing Grid / Map / Graph view toggle (bottom bar), search, filter chips, top action row (requests bell, add friend, post update). The PostcardBackdrop entrance is removed since the dashboard is now the default landed-on page after login. Friend detail still opens as a right panel — no route change.

## Sub-pages (initial scaffolds, same visual language)

Each sub-page reuses the styles.css tokens and font family from the home/dashboard:

- `/app/profile`: edit name, username, city, avatar color, bio, next-up plans (list editor), notification preferences (toggles, stored locally for now).
- `/app/friends`: 3 sections — Friends (with group assignment dropdown per row), Pending requests (accept/decline), Sent invites (with copy-link). Reuses RequestsBell logic.
- `/app/groups`: list of groups with rename, color picker, delete, add member. Reuses ManageGroupsDialog logic inlined as a page.
- `/app/notifications`: tabs — Waves received, Friend requests, Recent updates from close friends.

## /invite/$token

Public page. Reads token from params, looks up the inviter's profile via a server fn (or simple query if the row is publicly readable — falls back to "Sign up to accept"). Shows: "{Name} wants to add you to their Loop" + sign-up form pre-filled with the token, which on success creates the friendship. For this pass: scaffold the UI and accept the token through `localStorage.loop:invite-token` so signup picks it up; full invite-token data model can come later.

## Files touched

- new: `src/routes/_authenticated.tsx`, `src/routes/login.tsx`, `src/routes/invite.$token.tsx`, `src/routes/_authenticated/app.tsx`, `src/routes/_authenticated/app.index.tsx`, `src/routes/_authenticated/app.profile.tsx`, `src/routes/_authenticated/app.friends.tsx`, `src/routes/_authenticated/app.groups.tsx`, `src/routes/_authenticated/app.notifications.tsx`
- delete: `src/routes/signin.tsx`, `src/routes/app.tsx` (logic moves into the new layout + index)
- edit: `src/routes/index.tsx` (point CTA to `/login`), `src/routes/signup.tsx` (point link to `/login`, set onboarding flag on success)

## Out of scope (not in this pass)

- Real invite-token table + RLS (UI scaffold only, no DB migration this turn)
- Persisting notification preferences in DB
- Mobile sidebar drawer (sidebar will be visible on md+; on small screens it collapses to a top bar — basic responsive only)
