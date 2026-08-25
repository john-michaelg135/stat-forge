# ⚡ StatForge (Alpha)

> In-browser GitHub stats card generator. Fetches public profile data and forges a themeable, self-contained SVG for your README — no tokens, no server, no tracking.

⚠️ **This project is in alpha.** Expect rough edges, breaking changes, and incomplete features.

---

## What it does

Type a GitHub username, and StatForge queries the public REST API to pull repos, stars, commits, PRs, forks, followers, and top languages — then renders everything into a single portable SVG card you can embed anywhere.

Everything runs client-side. No API keys needed, no backend, no data stored.

## Features

- **Two card layouts** — Full (with language breakdown) and Compact
- **6 themes** — Ayu Night, Phosphor, Daylight, Glacier, Ember, Graphite
- **8 accent colors** — or let the theme pick one automatically
- **Customizable** — toggle avatar, border, rounded corners, language bar, transparent background
- **Export options** — download SVG, copy markdown embed, copy `<img>` tag, copy raw SVG
- **Smart caching** — avoids redundant API calls within the same session
- **Rate-limit aware** — shows remaining API budget in real-time
- **Fully accessible** — ARIA labels, keyboard navigation, reduced-motion support

## Tech stack

- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- Recharts (unused currently, available for future graphs)
- No backend — pure client-side SPA

## Getting started

```bash
# install dependencies
npm install

# start dev server
npm run dev

# production build
npm run build

# type-check without emitting
npm run typecheck
```

## Limitations (alpha)

- Uses unauthenticated GitHub REST API — rate-limited to **60 requests/hour** per IP
- Commit counts limited to a 90-day window (API constraint without auth)
- Analyzes up to the first ~100 public repos per user
- No persistent storage or shareable URLs yet
- No dark/light system preference detection for card themes

## Roadmap

- [ ] Optional GitHub token input for higher rate limits
- [ ] Shareable card URLs
- [ ] More themes and custom color pickers
- [ ] Additional card variants (minimal badge, wide banner)
- [ ] Contribution graph integration
- [ ] Deploy to a public URL

## License

Not yet specified — all rights reserved for now.
