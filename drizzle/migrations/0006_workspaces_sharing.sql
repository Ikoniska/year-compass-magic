CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  owner_email text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT 'Min årsplan',
  share_token text UNIQUE,
  share_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer','editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.ws_role(_ws uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM workspaces WHERE id = _ws AND owner_id = auth.uid()) THEN 'owner'
    ELSE (SELECT role FROM workspace_members WHERE workspace_id = _ws
          AND lower(email) = lower(coalesce(auth.jwt()->>'email','')) LIMIT 1)
  END
$$;
REVOKE EXECUTE ON FUNCTION public.ws_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_role(uuid) TO authenticated;

CREATE POLICY "ws read" ON public.workspaces FOR SELECT TO authenticated USING (public.ws_role(id) IS NOT NULL);
CREATE POLICY "ws owner insert" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ws owner update" ON public.workspaces FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "members read" ON public.workspace_members FOR SELECT TO authenticated USING (public.ws_role(workspace_id) IS NOT NULL);
CREATE POLICY "members owner write" ON public.workspace_members FOR ALL TO authenticated USING (public.ws_role(workspace_id) = 'owner') WITH CHECK (public.ws_role(workspace_id) = 'owner');

CREATE OR REPLACE FUNCTION public.personal_workspace(_uid uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w uuid;
BEGIN
  SELECT id INTO w FROM workspaces WHERE owner_id = _uid;
  IF w IS NULL THEN
    INSERT INTO workspaces (owner_id, owner_email)
      VALUES (_uid, coalesce((SELECT email FROM auth.users WHERE id = _uid), ''))
      ON CONFLICT (owner_id) DO NOTHING;
    SELECT id INTO w FROM workspaces WHERE owner_id = _uid;
  END IF;
  RETURN w;
END $$;
REVOKE EXECUTE ON FUNCTION public.personal_workspace(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_workspace_id() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN NEW.workspace_id := personal_workspace(NEW.user_id); END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.goals ADD COLUMN workspace_id uuid, ADD COLUMN assignee text NOT NULL DEFAULT '';
ALTER TABLE public.events ADD COLUMN workspace_id uuid;
ALTER TABLE public.whiteboard_notes ADD COLUMN workspace_id uuid;
ALTER TABLE public.whiteboard_strokes ADD COLUMN workspace_id uuid;

SELECT public.personal_workspace(u) FROM (
  SELECT user_id u FROM public.goals UNION SELECT user_id FROM public.events
  UNION SELECT user_id FROM public.whiteboard_notes UNION SELECT user_id FROM public.whiteboard_strokes
  UNION SELECT id FROM auth.users) s;
UPDATE public.goals t SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = t.user_id AND t.workspace_id IS NULL;
UPDATE public.events t SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = t.user_id AND t.workspace_id IS NULL;
UPDATE public.whiteboard_notes t SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = t.user_id AND t.workspace_id IS NULL;
UPDATE public.whiteboard_strokes t SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = t.user_id AND t.workspace_id IS NULL;

CREATE TRIGGER goals_ws BEFORE INSERT ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_workspace_id();
CREATE TRIGGER events_ws BEFORE INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_workspace_id();
CREATE TRIGGER notes_ws BEFORE INSERT ON public.whiteboard_notes FOR EACH ROW EXECUTE FUNCTION public.set_workspace_id();
CREATE TRIGGER strokes_ws BEFORE INSERT ON public.whiteboard_strokes FOR EACH ROW EXECUTE FUNCTION public.set_workspace_id();
CREATE INDEX ON public.goals(workspace_id);
CREATE INDEX ON public.events(workspace_id);
CREATE INDEX ON public.whiteboard_notes(workspace_id);
CREATE INDEX ON public.whiteboard_strokes(workspace_id);

CREATE POLICY "member read goals" ON public.goals FOR SELECT TO authenticated USING (public.ws_role(workspace_id) IS NOT NULL);
CREATE POLICY "editor update goals" ON public.goals FOR UPDATE TO authenticated USING (public.ws_role(workspace_id) = 'editor') WITH CHECK (public.ws_role(workspace_id) = 'editor');
CREATE POLICY "member read events" ON public.events FOR SELECT TO authenticated USING (public.ws_role(workspace_id) IS NOT NULL);
CREATE POLICY "member read notes" ON public.whiteboard_notes FOR SELECT TO authenticated USING (public.ws_role(workspace_id) IS NOT NULL);
CREATE POLICY "editor update notes" ON public.whiteboard_notes FOR UPDATE TO authenticated USING (public.ws_role(workspace_id) = 'editor') WITH CHECK (public.ws_role(workspace_id) = 'editor');
CREATE POLICY "editor insert notes" ON public.whiteboard_notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.ws_role(workspace_id) = 'editor');
CREATE POLICY "member read strokes" ON public.whiteboard_strokes FOR SELECT TO authenticated USING (public.ws_role(workspace_id) IS NOT NULL);
CREATE POLICY "editor insert strokes" ON public.whiteboard_strokes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.ws_role(workspace_id) = 'editor');

CREATE TABLE public.goal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.goal_comments TO authenticated;
GRANT ALL ON public.goal_comments TO service_role;
ALTER TABLE public.goal_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments read" ON public.goal_comments FOR SELECT TO authenticated USING (public.ws_role(workspace_id) IS NOT NULL);
CREATE POLICY "comments owner delete" ON public.goal_comments FOR DELETE TO authenticated USING (public.ws_role(workspace_id) = 'owner');
CREATE INDEX ON public.goal_comments(goal_id);

CREATE OR REPLACE FUNCTION public.get_shared_plan(_token text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'name', w.name,
    'goals', coalesce((SELECT jsonb_agg(jsonb_build_object('id', g.id, 'title', g.title, 'category', g.category, 'status', g.status,
       'start', g.start_month, 'end', g.end_month, 'milestones', g.milestones,
       'comments', coalesce((SELECT jsonb_agg(jsonb_build_object('author', c.author_name, 'body', c.body, 'at', c.created_at) ORDER BY c.created_at)
                             FROM goal_comments c WHERE c.goal_id = g.id), '[]'::jsonb))
       ORDER BY g.start_month, g.end_month) FROM goals g WHERE g.workspace_id = w.id), '[]'::jsonb),
    'events', coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'month', e.month, 'day', e.day, 'category', e.category)
       ORDER BY e.month, e.day) FROM events e WHERE e.workspace_id = w.id), '[]'::jsonb))
  FROM workspaces w WHERE w.share_enabled AND w.share_token IS NOT NULL AND w.share_token = _token
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_plan(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_shared_comment(_token text, _goal uuid, _name text, _body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w uuid;
BEGIN
  SELECT ws.id INTO w FROM workspaces ws JOIN goals g ON g.workspace_id = ws.id
   WHERE ws.share_enabled AND ws.share_token = _token AND g.id = _goal;
  IF w IS NULL THEN RAISE EXCEPTION 'Ogiltig länk'; END IF;
  INSERT INTO goal_comments (workspace_id, goal_id, author_name, body)
    VALUES (w, _goal, left(coalesce(_name, ''), 60), left(trim(_body), 1000));
END $$;
GRANT EXECUTE ON FUNCTION public.add_shared_comment(text, uuid, text, text) TO anon, authenticated;