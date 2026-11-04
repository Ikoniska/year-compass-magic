GRANT DELETE ON public.workspaces TO authenticated;
CREATE POLICY "ws owner delete" ON public.workspaces FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE OR REPLACE FUNCTION public.ws_cleanup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.goals WHERE workspace_id = OLD.id;
  DELETE FROM public.events WHERE workspace_id = OLD.id;
  DELETE FROM public.whiteboard_notes WHERE workspace_id = OLD.id;
  DELETE FROM public.whiteboard_strokes WHERE workspace_id = OLD.id;
  RETURN OLD;
END $$;
CREATE TRIGGER ws_cleanup BEFORE DELETE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.ws_cleanup();