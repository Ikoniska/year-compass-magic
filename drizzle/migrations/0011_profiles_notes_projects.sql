CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

ALTER TABLE public.workspaces ADD COLUMN owner_name text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.set_display_name(_name text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Ej inloggad'; END IF;
  _name := left(trim(coalesce(_name, '')), 80);
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO profiles (id, display_name, updated_at) VALUES (auth.uid(), _name, now())
    ON CONFLICT (id) DO UPDATE SET display_name = excluded.display_name, updated_at = now();
  UPDATE workspaces SET owner_name = _name WHERE owner_id = auth.uid();
  UPDATE workspace_members SET name = _name WHERE lower(email) = lower(_email);
END $$;
REVOKE EXECUTE ON FUNCTION public.set_display_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_display_name(text) TO authenticated;

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes" ON public.notes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX notes_user_idx ON public.notes(user_id, updated_at DESC);

CREATE TABLE public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  col text NOT NULL DEFAULT 'todo' CHECK (col IN ('todo','doing','done')),
  assignee text NOT NULL DEFAULT '',
  due date,
  position double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
GRANT ALL ON public.project_tasks TO service_role;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks read" ON public.project_tasks FOR SELECT TO authenticated USING (public.ws_role(workspace_id) IS NOT NULL);
CREATE POLICY "tasks write" ON public.project_tasks FOR ALL TO authenticated
  USING (public.ws_role(workspace_id) IN ('owner','editor')) WITH CHECK (public.ws_role(workspace_id) IN ('owner','editor'));
CREATE INDEX project_tasks_goal_idx ON public.project_tasks(goal_id);

CREATE TABLE public.project_status (
  goal_id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  health text NOT NULL DEFAULT 'green' CHECK (health IN ('green','yellow','red')),
  progress text NOT NULL DEFAULT '',
  blockers text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_status TO authenticated;
GRANT ALL ON public.project_status TO service_role;
ALTER TABLE public.project_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status read" ON public.project_status FOR SELECT TO authenticated USING (public.ws_role(workspace_id) IS NOT NULL);
CREATE POLICY "status write" ON public.project_status FOR ALL TO authenticated
  USING (public.ws_role(workspace_id) IN ('owner','editor')) WITH CHECK (public.ws_role(workspace_id) IN ('owner','editor'));