ALTER TABLE public.whiteboard_notes ADD COLUMN IF NOT EXISTS width double precision NOT NULL DEFAULT 200;
ALTER TABLE public.whiteboard_notes ADD COLUMN IF NOT EXISTS height double precision NOT NULL DEFAULT 180;
CREATE TABLE public.whiteboard_strokes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  color text NOT NULL DEFAULT 'ink',
  size double precision NOT NULL DEFAULT 3,
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whiteboard_strokes TO authenticated;
GRANT ALL ON public.whiteboard_strokes TO service_role;
ALTER TABLE public.whiteboard_strokes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own whiteboard_strokes" ON public.whiteboard_strokes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.whiteboard_strokes(user_id);