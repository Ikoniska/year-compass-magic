ALTER TABLE public.workspaces DROP CONSTRAINT workspaces_owner_id_key;
CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON public.workspaces(owner_id);
CREATE OR REPLACE FUNCTION public.personal_workspace(_uid uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w uuid;
BEGIN
  SELECT id INTO w FROM workspaces WHERE owner_id = _uid ORDER BY created_at LIMIT 1;
  IF w IS NULL THEN
    INSERT INTO workspaces (owner_id, owner_email)
      VALUES (_uid, coalesce((SELECT email FROM auth.users WHERE id = _uid), ''))
      RETURNING id INTO w;
  END IF;
  RETURN w;
END $$;
REVOKE EXECUTE ON FUNCTION public.personal_workspace(uuid) FROM PUBLIC, anon, authenticated;