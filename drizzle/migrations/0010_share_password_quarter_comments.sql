CREATE TABLE public.workspace_share_secrets (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pw_hash text NOT NULL
);
GRANT ALL ON public.workspace_share_secrets TO service_role;
ALTER TABLE public.workspace_share_secrets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workspaces ADD COLUMN share_has_password boolean NOT NULL DEFAULT false;

CREATE TABLE public.quarter_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  quarter integer NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.quarter_comments TO authenticated;
GRANT ALL ON public.quarter_comments TO service_role;
ALTER TABLE public.quarter_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qc read" ON public.quarter_comments FOR SELECT TO authenticated USING (public.ws_role(workspace_id) IS NOT NULL);
CREATE POLICY "qc owner delete" ON public.quarter_comments FOR DELETE TO authenticated USING (public.ws_role(workspace_id) = 'owner');

CREATE OR REPLACE FUNCTION public.set_share_password(_ws uuid, _pw text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = _ws AND owner_id = auth.uid()) THEN RAISE EXCEPTION 'Ej behörig'; END IF;
  IF coalesce(trim(_pw), '') = '' THEN
    DELETE FROM workspace_share_secrets WHERE workspace_id = _ws;
    UPDATE workspaces SET share_has_password = false WHERE id = _ws;
  ELSE
    INSERT INTO workspace_share_secrets VALUES (_ws, encode(sha256(convert_to(_ws::text || trim(_pw), 'UTF8')), 'hex'))
      ON CONFLICT (workspace_id) DO UPDATE SET pw_hash = excluded.pw_hash;
    UPDATE workspaces SET share_has_password = true WHERE id = _ws;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_share_password(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_share_password(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.shared_ws(_token text, _pw text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id FROM workspaces w LEFT JOIN workspace_share_secrets s ON s.workspace_id = w.id
  WHERE w.share_enabled AND w.share_token IS NOT NULL AND w.share_token = _token
    AND (s.pw_hash IS NULL OR s.pw_hash = encode(sha256(convert_to(w.id::text || trim(coalesce(_pw, '')), 'UTF8')), 'hex'))
$$;
REVOKE ALL ON FUNCTION public.shared_ws(text, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_plan_v2(_token text, _pw text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE wid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE share_enabled AND share_token = _token) THEN RETURN NULL; END IF;
  wid := shared_ws(_token, _pw);
  IF wid IS NULL THEN RETURN jsonb_build_object('locked', true); END IF;
  RETURN (SELECT jsonb_build_object(
    'name', w.name,
    'goals', coalesce((SELECT jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title, 'category', g.category, 'status', g.status,
       'start', g.start_month, 'end', g.end_month, 'milestones', g.milestones, 'assignee', g.assignee,
       'comments', coalesce((SELECT jsonb_agg(jsonb_build_object('author', c.author_name, 'body', c.body, 'at', c.created_at) ORDER BY c.created_at)
                             FROM goal_comments c WHERE c.goal_id = g.id), '[]'::jsonb))
       ORDER BY g.start_month, g.end_month) FROM goals g WHERE g.workspace_id = w.id), '[]'::jsonb),
    'events', coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'month', e.month, 'day', e.day, 'category', e.category)
       ORDER BY e.month, e.day) FROM events e WHERE e.workspace_id = w.id), '[]'::jsonb),
    'notes', coalesce((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'content', n.content, 'color', n.color, 'x', n.pos_x, 'y', n.pos_y,
       'rotation', n.rotation, 'width', n.width, 'height', n.height, 'items', n.items, 'is_checklist', n.is_checklist))
       FROM whiteboard_notes n WHERE n.workspace_id = w.id), '[]'::jsonb),
    'quarter_comments', coalesce((SELECT jsonb_agg(jsonb_build_object('quarter', q.quarter, 'author', q.author_name, 'body', q.body, 'at', q.created_at) ORDER BY q.created_at)
       FROM quarter_comments q WHERE q.workspace_id = w.id), '[]'::jsonb)
  ) FROM workspaces w WHERE w.id = wid);
END $$;
GRANT EXECUTE ON FUNCTION public.get_shared_plan_v2(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_shared_comment_v2(_token text, _pw text, _goal uuid, _quarter integer, _name text, _body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wid uuid;
BEGIN
  wid := shared_ws(_token, _pw);
  IF wid IS NULL OR coalesce(trim(_body), '') = '' THEN RAISE EXCEPTION 'Ogiltig länk'; END IF;
  IF _goal IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM goals WHERE id = _goal AND workspace_id = wid) THEN RAISE EXCEPTION 'Ogiltigt mål'; END IF;
    INSERT INTO goal_comments (workspace_id, goal_id, author_name, body) VALUES (wid, _goal, left(coalesce(_name, ''), 60), left(trim(_body), 1000));
  ELSE
    INSERT INTO quarter_comments (workspace_id, quarter, author_name, body) VALUES (wid, _quarter, left(coalesce(_name, ''), 60), left(trim(_body), 1000));
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.add_shared_comment_v2(text, text, uuid, integer, text, text) TO anon, authenticated;

-- Old endpoints: block password-protected plans
CREATE OR REPLACE FUNCTION public.get_shared_plan(_token text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.get_shared_plan_v2(_token, NULL) $$;
CREATE OR REPLACE FUNCTION public.add_shared_comment(_token text, _goal uuid, _name text, _body text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT public.add_shared_comment_v2(_token, NULL, _goal, NULL, _name, _body) $$;