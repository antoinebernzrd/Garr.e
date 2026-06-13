-- 1. Custom per-user groups
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

-- 2. Add group_id to assignments + migrate
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

-- 3. Replace pk + drop old enum column
ALTER TABLE public.friend_assignments DROP CONSTRAINT IF EXISTS friend_assignments_pkey;
ALTER TABLE public.friend_assignments DROP COLUMN "group";
ALTER TABLE public.friend_assignments ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE public.friend_assignments ADD CONSTRAINT friend_assignments_pkey PRIMARY KEY (owner_id, friend_id, group_id);
CREATE INDEX IF NOT EXISTS friend_assignments_group_idx ON public.friend_assignments(group_id);

-- 4. Seed defaults for new users
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