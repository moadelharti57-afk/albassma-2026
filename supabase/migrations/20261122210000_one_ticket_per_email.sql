-- =========================================================================
-- One ticket per email address.
-- Gmail ignores dots and "+suffix" in the local part, so
-- a.b@gmail.com, ab@gmail.com and ab+2@gmail.com are the same inbox and
-- count as the same person.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.normalize_email(_email TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN split_part(lower(btrim(_email)), '@', 2) IN ('gmail.com', 'googlemail.com') THEN
      replace(split_part(split_part(lower(btrim(_email)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    ELSE lower(btrim(_email))
  END;
$$;

-- Hard guarantee, even if two registrations arrive at the same moment.
-- Fails if duplicates already exist: delete them first.
CREATE UNIQUE INDEX IF NOT EXISTS participants_one_per_email
  ON public.participants (public.normalize_email(email));

CREATE OR REPLACE FUNCTION public.register_participant(
  _full_name TEXT, _email TEXT, _phone TEXT, _registered_by TEXT
)
RETURNS TABLE (ticket_code TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _code TEXT;
BEGIN
  _full_name := btrim(_full_name);
  _email := lower(btrim(_email));
  _phone := btrim(_phone);
  _registered_by := nullif(btrim(_registered_by), '');

  IF _full_name IS NULL OR length(_full_name) < 2 OR length(_full_name) > 100 THEN
    RAISE EXCEPTION 'Invalid name' USING ERRCODE = '22023';
  END IF;
  IF _email IS NULL OR length(_email) > 255 OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email' USING ERRCODE = '22023';
  END IF;
  IF _phone IS NULL OR length(_phone) < 8 OR length(_phone) > 20 THEN
    RAISE EXCEPTION 'Invalid phone number' USING ERRCODE = '22023';
  END IF;
  IF _registered_by IS NOT NULL AND length(_registered_by) > 100 THEN
    RAISE EXCEPTION 'Invalid club member' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.participants p
    WHERE public.normalize_email(p.email) = public.normalize_email(_email)
  ) THEN
    RAISE EXCEPTION 'EMAIL_ALREADY_REGISTERED' USING ERRCODE = '23505';
  END IF;

  LOOP
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.participants p WHERE p.ticket_code = _code);
  END LOOP;

  BEGIN
    RETURN QUERY
    INSERT INTO public.participants (full_name, email, phone, ticket_code, registered_by)
    VALUES (_full_name, _email, _phone, _code, _registered_by)
    RETURNING participants.ticket_code, participants.created_at;
  EXCEPTION WHEN unique_violation THEN
    -- Same email registered a split second earlier.
    RAISE EXCEPTION 'EMAIL_ALREADY_REGISTERED' USING ERRCODE = '23505';
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.register_participant(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_participant(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
