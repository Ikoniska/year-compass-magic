CREATE TABLE public.weekly_focus (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  week_key text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_focus TO authenticated;
GRANT ALL ON public.weekly_focus TO service_role;
ALTER TABLE public.weekly_focus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weekly_focus" ON public.weekly_focus FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);