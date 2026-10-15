ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS habit text NOT NULL DEFAULT '';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS habit_target integer NOT NULL DEFAULT 0;

CREATE TABLE public.year_reviews (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  year integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.year_reviews TO authenticated;
GRANT ALL ON public.year_reviews TO service_role;
ALTER TABLE public.year_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own year_reviews" ON public.year_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.quarter_energy (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  year integer NOT NULL,
  quarter integer NOT NULL,
  level text NOT NULL DEFAULT 'konsolidering',
  PRIMARY KEY (user_id, year, quarter)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quarter_energy TO authenticated;
GRANT ALL ON public.quarter_energy TO service_role;
ALTER TABLE public.quarter_energy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quarter_energy" ON public.quarter_energy FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.habit_logs (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  goal_id uuid NOT NULL,
  day date NOT NULL,
  PRIMARY KEY (user_id, goal_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO authenticated;
GRANT ALL ON public.habit_logs TO service_role;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habit_logs" ON public.habit_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);