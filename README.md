# Hyderabad Urban Observatory — main site

The portal site of the Hyderabad Urban Observatory: home page with the HMDA terrain and the
three buttons (Layers, Tools, Stories), About and Disclaimer, plus redirects of the old
`/explore/…` and `/stories/…` addresses. React 19 + Vite + Ant Design, no backend. Built by
GitHub Actions and published to GitHub Pages.

The Observatory's web presence is three small sites that share one look:

| Site | Repo | Content |
|---|---|---|
| https://hyderabad.urbanobservatory.in | `site` (this repo) | home, About, Disclaimer, redirects |
| https://hyderabad.urbanobservatory.in/tools | `tools` | the tool cards (the former Thematic Areas "Tools" tab) |
| https://hyderabad.urbanobservatory.in/stories | `stories` | the stories & datasets cards and the story pages |

The shared pieces (header, footer, logo, not-found page, `links.js`, `styles/index.css`,
fonts, favicon) are **copied** into each repo rather than packaged: three copies to keep in
step by hand, which is cheaper than a shared package for code this small. The design reference
is `DESIGN-SYSTEM.md` in the observatory-work repo.

The maps live in a separate app (the Spatial Data Repository viewer), the archive maps in
the City Timeline app, the data catalogue on the open-data site; this site only links to them.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ (postbuild copies index.html to 404.html for SPA deep links)
```

## Environment variables (build time)

| Variable            | Default                                        | Purpose |
|---------------------|------------------------------------------------|---------|
| `VITE_BASE`         | `/`                                            | Path the site is served from (`/site/` on the project Pages URL). |
| `VITE_MAPS_URL`     | `https://hyderabad.urbanobservatory.in/maps`      | Spatial Data Repository (map viewer): Layers button, `/explore/spatial-data-portal` redirect. |
| `VITE_TIMELINE_URL` | `https://hyderabad.urbanobservatory.in/timeline/` | City Timeline links. |
| `VITE_DATA_URL`     | `https://hyderabad.urbanobservatory.in/data`      | Open-data site: "Data sources", `/explore/data-observatory` redirect. |
| `VITE_TOOLS_URL`    | `https://hyderabad.urbanobservatory.in/tools/`    | Tools site: home button, `/explore/thematic-areas` redirect. |
| `VITE_STORIES_URL`  | `https://hyderabad.urbanobservatory.in/stories/`  | Stories site: home button, `/stories/…` redirects. |

Example: `VITE_TOOLS_URL=http://localhost:5174/ npm run dev` points the Tools button at a local
checkout of the tools site.

## Deploys

Every push to `main` (or a manual run of the workflow) runs `.github/workflows/pages.yml`:
`npm ci`, `npm run build`, upload `dist/`, deploy to Pages. The repository's Pages source
must be set to **GitHub Actions** (Settings → Pages → Build and deployment → Source).

The workflow builds with `VITE_BASE` from the repository variable of the same name (set to `/`
for the live site; the fallback `/site/` is only for a repo without the variable, served at
`hulf-observatory.github.io/site/`). The repository variables `VITE_MAPS_URL`,
`VITE_TIMELINE_URL`, `VITE_DATA_URL`, `VITE_TOOLS_URL` and `VITE_STORIES_URL` point the
buttons, links and redirects at the companion sites; unset, the defaults above apply.

## Domain (hyderabad.urbanobservatory.in)

Live since 2026-10-08. How it is wired, in case it needs redoing or undoing:

- DNS (GoDaddy): four `A` records for `hyderabad` → `185.199.108.153`, `185.199.109.153`,
  `185.199.110.153`, `185.199.111.153` (GitHub Pages). Before the move it was one `A` record
  to the Contabo server `217.216.78.26`; putting that back is the rollback.
- Repo: Settings → Pages → Custom domain `hyderabad.urbanobservatory.in`, Enforce HTTPS on;
  repository variable `VITE_BASE` = `/`. If the certificate stalls after a DNS change, remove
  and re-add the custom domain.
- The domain is verified for the `hulf-observatory` account (TXT record
  `_github-pages-challenge-hulf-observatory.hyderabad`), which covers every subdomain.

## Licence

MIT, see `LICENSE`. Content and data have their own attributions on the pages.
