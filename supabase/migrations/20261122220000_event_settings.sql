-- =========================================================================
-- Event settings: seat limit and an open/closed switch for registrations,
-- editable by admins from the dashboard. Also a stricter phone check.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.event_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),       -- single row
  registrations_open BOOLEAN NOT NULL DEFAULT true,
  max_tickets INT CHECK (max_tickets IS NULL OR max_tickets > 0), -- NULL = no limit
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.event_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read settings" ON public.event_settings;
CREATE POLICY "Staff can read settings"
ON public.event_settings FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Admins can update settings" ON public.event_settings;
CREATE POLICY "Admins can update settings"
ON public.event_settings FOR UPDATE TO authenticated
USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));

REVOKE ALL ON public.event_settings FROM anon;
GRANT SELECT, UPDATE ON public.event_settings TO authenticated;
GRANT ALL ON public.event_settings TO service_role;

-- Public status for the registration form (no personal data).
CREATE OR REPLACE FUNCTION public.get_registration_status()
RETURNS TABLE (registrations_open BOOLEAN, max_tickets INT, tickets_issued INT, seats_left INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.registrations_open,
         s.max_tickets,
         (SELECT count(*)::int FROM public.participants),
         CASE WHEN s.max_tickets IS NULL THEN NULL
              ELSE greatest(s.max_tickets - (SELECT count(*)::int FROM public.participants), 0) END
  FROM public.event_settings s WHERE s.id = 1;
$$;
REVOKE ALL ON FUNCTION public.get_registration_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registration_status() TO anon, authenticated;

-- Registration now also checks: open switch, seat limit, phone format.
CREATE OR REPLACE FUNCTION public.register_participant(
  _full_name TEXT, _email TEXT, _phone TEXT, _registered_by TEXT
)
RETURNS TABLE (ticket_code TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _code TEXT;
  _settings public.event_settings%ROWTYPE;
BEGIN
  -- Serialise registrations so the seat limit can't be overshot.
  PERFORM pg_advisory_xact_lock(4207);

  SELECT * INTO _settings FROM public.event_settings WHERE id = 1;
  IF FOUND AND NOT _settings.registrations_open THEN
    RAISE EXCEPTION 'REGISTRATIONS_CLOSED' USING ERRCODE = 'P0001';
  END IF;
  IF FOUND AND _settings.max_tickets IS NOT NULL
     AND (SELECT count(*) FROM public.participants) >= _settings.max_tickets THEN
    RAISE EXCEPTION 'SOLD_OUT' USING ERRCODE = 'P0001';
  END IF;

  _full_name := btrim(_full_name);
  _email := lower(btrim(_email));
  _phone := regexp_replace(btrim(_phone), '\s+', ' ', 'g');
  _registered_by := nullif(btrim(_registered_by), '');

  IF _full_name IS NULL OR length(_full_name) < 2 OR length(_full_name) > 100 THEN
    RAISE EXCEPTION 'Invalid name' USING ERRCODE = '22023';
  END IF;
  IF _email IS NULL OR length(_email) > 255 OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email' USING ERRCODE = '22023';
  END IF;
  IF _phone IS NULL OR _phone !~ '^\+?[0-9][0-9 .-]{6,18}[0-9]$'
     OR length(regexp_replace(_phone, '[^0-9]', '', 'g')) < 8 THEN
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
    RAISE EXCEPTION 'EMAIL_ALREADY_REGISTERED' USING ERRCODE = '23505';
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.register_participant(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_participant(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
