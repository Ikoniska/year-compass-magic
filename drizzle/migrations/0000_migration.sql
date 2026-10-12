CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'ej',
  start_month int NOT NULL DEFAULT 0,
  end_month int NOT NULL DEFAULT 11,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  month int NOT NULL,
  day int NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.reflections (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  period_key text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reflections TO authenticated;
GRANT ALL ON public.reflections TO service_role;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reflections" ON public.reflections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.seed_demo_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := NEW.id;
BEGIN
  INSERT INTO public.goals (user_id, title, category, status, start_month, end_month, milestones) VALUES
  (u,'Lansera ny produktversion','arbete','halvvags',1,5,'[{"id":"a1","title":"Kravspec klar","done":true},{"id":"a2","title":"Beta till kunder","done":true},{"id":"a3","title":"Lansering","done":false}]'),
  (u,'Springa ett halvmaraton','halsa','slutford',0,4,'[{"id":"b1","title":"Springa 5 km","done":true},{"id":"b2","title":"Springa 15 km","done":true},{"id":"b3","title":"Göteborgsvarvet","done":true}]'),
  (u,'Spara 60 000 kr buffert','ekonomi','inledd',0,11,'[{"id":"c1","title":"Budget i ordning","done":true},{"id":"c2","title":"30 000 kr","done":false},{"id":"c3","title":"60 000 kr","done":false}]'),
  (u,'Läsa 24 böcker','utveckling','halvvags',0,11,'[{"id":"d1","title":"12 böcker","done":true},{"id":"d2","title":"24 böcker","done":false}]'),
  (u,'Familjeresa till Japan','relationer','inledd',5,9,'[{"id":"e1","title":"Boka flyg","done":true},{"id":"e2","title":"Planera rutt","done":false}]');
  INSERT INTO public.events (user_id, title, month, day, category) VALUES
  (u,'Kvartalsplanering',0,8,'arbete'),(u,'Göteborgsvarvet',4,23,'halsa'),(u,'Deklaration',3,30,'ekonomi'),
  (u,'Mammas 60-årsdag',6,14,'relationer'),(u,'Konferens i Berlin',9,5,'arbete');
  INSERT INTO public.reflections (user_id, period_key, answers) VALUES
  (u,'m-0','{"good":"Kom igång med löpningen och höll budgeten.","improve":"Mer fokus på djuparbete.","learn":"Små dagliga vanor slår stora ryck."}');
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.seed_demo_plan() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_seed AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.seed_demo_plan();