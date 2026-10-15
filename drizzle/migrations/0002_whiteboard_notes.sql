CREATE TABLE public.whiteboard_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'yellow',
  pos_x double precision NOT NULL DEFAULT 40,
  pos_y double precision NOT NULL DEFAULT 40,
  rotation double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whiteboard_notes TO authenticated;
GRANT ALL ON public.whiteboard_notes TO service_role;
ALTER TABLE public.whiteboard_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own whiteboard_notes" ON public.whiteboard_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX whiteboard_notes_user_idx ON public.whiteboard_notes(user_id);