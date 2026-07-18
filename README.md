# matsunori — "One Roll at a Time"

Redesign of [matsunori.com](https://matsunori.com), a temaki handroll bar in Boston (Fenway) and NYC (Long Island City), with a third location (Lynnfield) coming soon.

Single-page marketing site: hero with brand video, live open/closed status, a scroll-pinned "Anatomy of a Handroll" sequence, story sections, wagyu dossier, press quote, gallery (desktop strip / mobile swipe deck), footer. Dark, editorial, motion-forward.

## Stack

Static vanilla HTML/CSS/JS — no framework, no build step — plus a small Cloudflare Worker for the live press feed. All motion runs on `requestAnimationFrame` + `IntersectionObserver` + CSS transitions, ported 1:1 from the approved design prototype (`Matsunori Site.dc.html` in the design handoff). Design intent is documented in [docs/matsunori-redesign-prd.md](docs/matsunori-redesign-prd.md).

```
public/
├── index.html        # all markup, JSON-LD per location
├── css/styles.css    # design tokens + all styles
├── js/main.js        # status computation, reveal system, pinned sections, gallery deck, news UI
└── assets/           # photography, anatomy illustrations, logo
src/
└── worker.js         # serves assets + /api/news (Google News RSS → resolved links, og:image, snippets)
```

### /api/news

Merges Google News + Bing News RSS for `"matsunori"` with a **baked press archive** (`public/data/news-baked.json`), resolves publisher URLs, scrapes `og:image`/`og:description`, and edge-caches the JSON for 4 hours. The homepage renders the 5 latest; "VIEW ALL" opens an infinite-scroll modal grouped by month.

Google and several publishers refuse Cloudflare's datacenter egress, so the archive is baked from a residential connection:

```sh
node scripts/bake-news.mjs   # fetch feeds, resolve links, scrape og meta
wrangler deploy              # ship the refreshed archive
```

New stories still appear live between bakes (favicon fallback until the next bake enriches them). `scripts/news-fixups.json` pins URLs for stories the resolvers can't reach.

## Develop

```sh
wrangler dev
# → http://localhost:8787 (assets + /api/news)
```

The mobile experience (gallery swipe deck, compact anatomy) activates below 780px viewport width. The intro loader plays once per session (`sessionStorage`); clear storage to replay it.

## Deploy

Deployed to Cloudflare Workers (static assets):

```sh
wrangler deploy
```

## Design notes

- Tokens, type roles, motion grammar ("the knife cut"), and section specs come from the design handoff README — colors are never pure black/white; `#D9A441` (uni) is the only interactive accent; `#B33A32` (akami) is ceremonial, max one moment per view.
- Fonts are licensed-tier stand-ins (Instrument Serif/Sans, Fragment Mono, Zen Old Mincho via Google Fonts). Swap for Canela/Söhne-tier faces if licensed, keeping roles.
- Open/closed status is computed live in `America/New_York` from each location's hours.
- `prefers-reduced-motion` is fully supported: loader skipped, reveals render final-state, pinned sections still function with hard cuts.

## Open items (from the handoff)

- LIC OpenTable URL is a placeholder (`opentable.com`) — swap for the real restaurant page.
- Lynnfield address/hours/photo TBD (placeholder surface in the locations grid).
- Hero video is hot-linked from `cdn.matsunori.com` — consider re-encoding + self-hosting.
- `/menu`, `/fenway`, `/lic` pages exist as approved mocks in the design handoff for a future phase.
