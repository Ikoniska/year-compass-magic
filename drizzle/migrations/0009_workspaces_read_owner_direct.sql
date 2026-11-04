DROP POLICY IF EXISTS "ws read" ON public.workspaces;
CREATE POLICY "ws read" ON public.workspaces FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.ws_role(id) IS NOT NULL);