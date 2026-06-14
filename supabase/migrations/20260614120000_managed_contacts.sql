-- Managed contacts (CRM).
-- People you track who will never log in. Modeled as profiles rows you own
-- (managed_by = your id), linked to you via an auto-accepted friendship, so they
-- appear in the grid / globe / graph / groups exactly like real friends and you
-- can post updates on their behalf. Their rows are private to you (RLS below).

-- 1. Allow profile rows that aren't backed by an auth user.
--    Real users still have id = auth.users.id; managed contacts get a random uuid.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS managed_by uuid
  REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_managed_by_idx ON public.profiles(managed_by);

-- 2. Profiles RLS: real profiles stay world-readable (needed for friend search),
--    managed contacts are visible only to their owner.
DROP POLICY IF EXISTS "profiles_select_authed" ON public.profiles;
CREATE POLICY "profiles_select_visible" ON public.profiles
  FOR SELECT TO authenticated
  USING (managed_by IS NULL OR managed_by = auth.uid());

-- Owner can create their own managed contacts (id is a fresh uuid, not auth.uid()).
CREATE POLICY "profiles_insert_managed" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (managed_by = auth.uid());

-- Owner can edit / delete their managed contacts (existing policy still covers self).
CREATE POLICY "profiles_update_managed" ON public.profiles
  FOR UPDATE TO authenticated
  USING (managed_by = auth.uid())
  WITH CHECK (managed_by = auth.uid());

CREATE POLICY "profiles_delete_managed" ON public.profiles
  FOR DELETE TO authenticated
  USING (managed_by = auth.uid());

-- 3. Don't seed default groups for managed contacts (only for real users).
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

-- 4. Owner can create the auto-accepted friendship to their managed contact.
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

-- 5. Owner can write/edit/delete updates ON BEHALF OF their managed contacts.
--    (Reading is already covered by are_friends via the accepted friendship.)
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
