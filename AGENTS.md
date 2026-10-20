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

- Disease data is pre-aggregated offline into src/data/fm.json (confirmed cases only, CLASSI_FIN=1, by residence); map borders are static IBGE GeoJSON in public/geo — why: keeps the app backend-free and fast.
- Forecast/risk rules live in src/lib/forecast.ts with tests in src/test/forecast.test.ts — why: single source for the 2019 projection logic.
