-- =========================================================================
-- Security lockdown
-- Before: anyone with the public (anon) key could read, edit and delete
-- every participant, including emails and phone numbers.
-- After:
--   * Public visitors can only register (via register_participant) and check
--     a ticket's status (via verify_ticket), which returns no contact details.
--   * Only signed-in users listed in public.user_roles as 'admin' or 'staff'
--     can read participants or check tickets in. Only 'admin' can delete.
-- =========================================================================

-- 1. Roles ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can see their own roles (so the app knows whether to show admin pages).
-- Nobody can write roles from the browser: assign them in the Supabase SQL editor.
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('admin') OR public.has_role('staff');
$$;

-- 2. Replace the wide-open participant policies ---------------------------
DROP POLICY IF EXISTS "Anyone can register" ON public.participants;
DROP POLICY IF EXISTS "Anyone can verify tickets" ON public.participants;
DROP POLICY IF EXISTS "Anyone can check in tickets" ON public.participants;
DROP POLICY IF EXISTS "Anyone can delete tickets" ON public.participants;

CREATE POLICY "Staff can read participants"
ON public.participants FOR SELECT TO authenticated
USING (public.is_staff());

CREATE POLICY "Staff can update participants"
ON public.participants FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "Admins can delete participants"
ON public.participants FOR DELETE TO authenticated
USING (public.has_role('admin'));

-- No INSERT policy: registration goes through register_participant() below.

-- Belt and braces: the anon role gets no direct table access at all.
REVOKE ALL ON public.participants FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

-- 3. Public registration ---------------------------------------------------
-- The ticket code is generated on the server so visitors cannot pick codes.
CREATE OR REPLACE FUNCTION public.register_participant(
  _full_name TEXT,
  _email TEXT,
  _phone TEXT,
  _registered_by TEXT
)
RETURNS TABLE (ticket_code TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
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

  LOOP
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.participants p WHERE p.ticket_code = _code);
  END LOOP;

  RETURN QUERY
  INSERT INTO public.participants (full_name, email, phone, ticket_code, registered_by)
  VALUES (_full_name, _email, _phone, _code, _registered_by)
  RETURNING participants.ticket_code, participants.created_at;
END;
$$;

-- 4. Public ticket check (no email / phone) -------------------------------
CREATE OR REPLACE FUNCTION public.verify_ticket(_ticket_code TEXT)
RETURNS TABLE (full_name TEXT, is_checked BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name, p.is_checked, p.created_at
  FROM public.participants p
  WHERE p.ticket_code = upper(btrim(_ticket_code))
  LIMIT 1;
$$;

-- 5. Check-in (staff only, and only once) ---------------------------------
CREATE OR REPLACE FUNCTION public.check_in_ticket(_ticket_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated INT;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.participants
  SET is_checked = true
  WHERE ticket_code = upper(btrim(_ticket_code)) AND is_checked = false;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated = 1;  -- false means already checked in or not found
END;
$$;

-- 6. Function permissions --------------------------------------------------
REVOKE ALL ON FUNCTION public.register_participant(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_ticket(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_in_ticket(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_participant(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ticket(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_ticket(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- =========================================================================
-- After running this, make yourself an admin (run in the SQL editor):
--   1. Create the user: Authentication > Users > Add user (email + password)
--   2. INSERT INTO public.user_roles (user_id, role)
--      SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com';
-- Give door staff the 'staff' role the same way (they can scan and check in,
-- but cannot delete tickets).
-- =========================================================================
