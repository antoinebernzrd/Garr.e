-- First/last name granularity on profiles.
-- `name` stays as the combined display value (kept in sync by the app on write);
-- first_name / last_name are stored separately so you can sort/filter by them.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
