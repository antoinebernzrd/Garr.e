-- =====================================================================
-- Garr.e — full schema bootstrap
-- Run in the SQL editor of the target Supabase project (bsnikh…).
-- Recreates the entire app schema (from supabase/migrations/*) plus the
-- managed-contacts (CRM) feature.
--
-- ⚠️ DESTRUCTIVE: the reset block below DROPS any existing app tables
-- (including the old `friends` / `profiles` tables already in this project).
-- It does NOT touch auth.users. Safe to re-run.
-- =====================================================================


-- ========== 0) Reset — drop existing objects so this runs clean ==========

-- Old signup trigger/function (Lovable convention) so it won't fire into a dropped table.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS seed_default_groups_trigger ON public.profiles;

DROP TABLE IF EXISTS public.next_up_items CASCADE;
DROP TABLE IF EXISTS public.waves CASCADE;
DROP TABLE IF EXISTS public.updates CASCADE;
DROP TABLE IF EXISTS public.friend_assignments CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;
DROP TABLE IF EXISTS public.user_groups CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;     -- leftover from the previous app in this project
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.are_friends(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.touch_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.seed_default_groups() CASCADE;

DROP TYPE IF EXISTS public.friendship_status CASCADE;
DROP TYPE IF EXISTS public.friend_group CASCADE;


-- ========== 1) Base schema (migration 20260510140133) ==========

-- Enums
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted');
CREATE TYPE public.friend_group AS ENUM ('escp', 'work', 'high_school', 'family', 'travel');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  city TEXT,
  avatar_color TEXT NOT NULL DEFAULT '#C2410C',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_username_idx ON public.profiles (lower(username));

-- Friendships
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);
CREATE INDEX friendships_addressee_idx ON public.friendships(addressee_id);
CREATE INDEX friendships_requester_idx ON public.friendships(requester_id);

-- Helper: are two users accepted friends?
CREATE OR REPLACE FUNCTION public.are_friends(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a))
  );
$$;

-- Friend group assignments (owner labels their friends with groups)
CREATE TABLE public.friend_assignments (
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "group" public.friend_group NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, friend_id, "group")
);

-- Updates
CREATE TABLE public.updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX updates_user_created_idx ON public.updates(user_id, created_at DESC);

-- Next up items
CREATE TABLE public.next_up_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX next_up_update_idx ON public.next_up_items(update_id);

-- Waves
CREATE TABLE public.waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_user_id <> to_user_id)
);
CREATE INDEX waves_to_idx ON public.waves(to_user_id, created_at DESC);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)), '[^a-z0-9_]', '', 'g'));
  IF base_username = '' OR base_username IS NULL THEN base_username := 'friend'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, email, name, username, city, avatar_color)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'name', base_username),
    final_username,
    NEW.raw_user_meta_data->>'city',
    coalesce(NEW.raw_user_meta_data->>'avatar_color', '#C2410C')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== RLS =====
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.next_up_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waves ENABLE ROW LEVEL SECURITY;

-- Profiles: any authed user can read (for search/friend display); owner can update
CREATE POLICY "profiles_select_authed" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Friendships
CREATE POLICY "friendships_select_involved" ON public.friendships
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "friendships_insert_requester" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND status = 'pending');
CREATE POLICY "friendships_update_addressee" ON public.friendships
  FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid())
  WITH CHECK (addressee_id = auth.uid());
CREATE POLICY "friendships_delete_involved" ON public.friendships
  FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Friend assignments
CREATE POLICY "assignments_select_own" ON public.friend_assignments
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "assignments_insert_own" ON public.friend_assignments
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "assignments_delete_own" ON public.friend_assignments
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Updates
CREATE POLICY "updates_select_self_or_friends" ON public.updates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.are_friends(auth.uid(), user_id));
CREATE POLICY "updates_insert_own" ON public.updates
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "updates_update_own" ON public.updates
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "updates_delete_own" ON public.updates
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Next up
CREATE POLICY "nextup_select_visible" ON public.next_up_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.updates u
    WHERE u.id = next_up_items.update_id
      AND (u.user_id = auth.uid() OR public.are_friends(auth.uid(), u.user_id))
  ));
CREATE POLICY "nextup_modify_own" ON public.next_up_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.updates u WHERE u.id = next_up_items.update_id AND u.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.updates u WHERE u.id = next_up_items.update_id AND u.user_id = auth.uid()));

-- Waves
CREATE POLICY "waves_select_involved" ON public.waves
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "waves_insert_friends" ON public.waves
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid() AND public.are_friends(auth.uid(), to_user_id));


-- ========== 2) Hardening (migration 20260510140150) ==========

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;


-- ========== 3) Custom groups (migration 20260510152923) ==========

CREATE TABLE public.user_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#7f8ea3',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_groups_owner_name_idx ON public.user_groups(owner_id, lower(name));

ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_groups_select_own" ON public.user_groups FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "user_groups_insert_own" ON public.user_groups FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "user_groups_update_own" ON public.user_groups FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "user_groups_delete_own" ON public.user_groups FOR DELETE TO authenticated USING (owner_id = auth.uid());

ALTER TABLE public.friend_assignments ADD COLUMN group_id uuid;

DO $$
DECLARE
  r RECORD;
  gid uuid;
  display_name text;
  default_color text;
BEGIN
  FOR r IN SELECT DISTINCT owner_id, "group"::text AS gname FROM public.friend_assignments LOOP
    display_name := CASE r.gname
      WHEN 'escp' THEN 'ESCP'
      WHEN 'work' THEN 'Work'
      WHEN 'high_school' THEN 'High school'
      WHEN 'family' THEN 'Family'
      WHEN 'travel' THEN 'Travel'
      ELSE initcap(r.gname)
    END;
    default_color := CASE r.gname
      WHEN 'escp' THEN '#C2410C'
      WHEN 'work' THEN '#1E3A8A'
      WHEN 'high_school' THEN '#0F766E'
      WHEN 'family' THEN '#9D174D'
      WHEN 'travel' THEN '#4D7C0F'
      ELSE '#7f8ea3'
    END;
    INSERT INTO public.user_groups(owner_id, name, color)
    VALUES (r.owner_id, display_name, default_color)
    ON CONFLICT (owner_id, lower(name)) DO NOTHING;
    SELECT id INTO gid FROM public.user_groups WHERE owner_id = r.owner_id AND lower(name) = lower(display_name);
    UPDATE public.friend_assignments SET group_id = gid WHERE owner_id = r.owner_id AND "group"::text = r.gname;
  END LOOP;
END $$;

ALTER TABLE public.friend_assignments DROP CONSTRAINT IF EXISTS friend_assignments_pkey;
ALTER TABLE public.friend_assignments DROP COLUMN "group";
ALTER TABLE public.friend_assignments ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE public.friend_assignments ADD CONSTRAINT friend_assignments_pkey PRIMARY KEY (owner_id, friend_id, group_id);
CREATE INDEX IF NOT EXISTS friend_assignments_group_idx ON public.friend_assignments(group_id);

CREATE OR REPLACE FUNCTION public.seed_default_groups()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_groups (owner_id, name, color, position) VALUES
    (NEW.id, 'Friends', '#C2410C', 0),
    (NEW.id, 'Work', '#1E3A8A', 1),
    (NEW.id, 'Family', '#9D174D', 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_default_groups_trigger ON public.profiles;
CREATE TRIGGER seed_default_groups_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.seed_default_groups();


-- ========== 4) Managed contacts / CRM (migration 20260614120000) ==========

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS managed_by uuid
  REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_managed_by_idx ON public.profiles(managed_by);

DROP POLICY IF EXISTS "profiles_select_authed" ON public.profiles;
CREATE POLICY "profiles_select_visible" ON public.profiles
  FOR SELECT TO authenticated
  USING (managed_by IS NULL OR managed_by = auth.uid());

CREATE POLICY "profiles_insert_managed" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (managed_by = auth.uid());

CREATE POLICY "profiles_update_managed" ON public.profiles
  FOR UPDATE TO authenticated
  USING (managed_by = auth.uid())
  WITH CHECK (managed_by = auth.uid());

CREATE POLICY "profiles_delete_managed" ON public.profiles
  FOR DELETE TO authenticated
  USING (managed_by = auth.uid());

CREATE OR REPLACE FUNCTION public.seed_default_groups()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.managed_by IS NOT NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.user_groups (owner_id, name, color, position) VALUES
    (NEW.id, 'Friends', '#C2410C', 0),
    (NEW.id, 'Work', '#1E3A8A', 1),
    (NEW.id, 'Family', '#9D174D', 2);
  RETURN NEW;
END;
$$;

CREATE POLICY "friendships_insert_managed" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND status = 'accepted'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = addressee_id AND p.managed_by = auth.uid()
    )
  );

CREATE POLICY "updates_insert_managed" ON public.updates
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = updates.user_id AND p.managed_by = auth.uid()
  ));

CREATE POLICY "updates_update_managed" ON public.updates
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = updates.user_id AND p.managed_by = auth.uid()
  ));

CREATE POLICY "updates_delete_managed" ON public.updates
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = updates.user_id AND p.managed_by = auth.uid()
  ));

-- Done. Sign up fresh on this project to get your profile + default groups.
