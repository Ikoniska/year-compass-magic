<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Planner data (goals, events, reflections) lives in Lovable Cloud tables scoped per user via RLS; all planner pages sit under `src/routes/_authenticated/` so sign-in gates them.
- New accounts get example data from a database trigger on signup, never from client code, so seeding happens exactly once.
