
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
