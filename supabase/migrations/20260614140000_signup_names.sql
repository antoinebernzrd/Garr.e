-- Store first_name / last_name from signup metadata, and derive the combined
-- name from them when no explicit name is provided.
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
  fn TEXT;
  ln TEXT;
  full_name TEXT;
BEGIN
  fn := NULLIF(trim(NEW.raw_user_meta_data->>'first_name'), '');
  ln := NULLIF(trim(NEW.raw_user_meta_data->>'last_name'), '');
  full_name := coalesce(
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(trim(concat_ws(' ', fn, ln)), '')
  );

  base_username := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)), '[^a-z0-9_]', '', 'g'));
  IF base_username = '' OR base_username IS NULL THEN base_username := 'friend'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, email, name, first_name, last_name, username, city, avatar_color)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(full_name, base_username),
    fn,
    ln,
    final_username,
    NEW.raw_user_meta_data->>'city',
    coalesce(NEW.raw_user_meta_data->>'avatar_color', '#C2410C')
  );
  RETURN NEW;
END;
$$;
