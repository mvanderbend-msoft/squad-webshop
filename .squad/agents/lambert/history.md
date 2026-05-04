# Project Context

- **Owner:** mvanderbend
- **Project:** squad-webshop — sample webshop, starting point for the Squad demo. Feature-complete *except* "Add to Favorites" (the live demo target).
- **Stack:** React 18 + Vite + TypeScript (client, port 5173), Node.js + Express + TypeScript (server, port 4000), SQLite via `node:sqlite` (Node 22+), JWT auth with `bcryptjs`, npm workspaces.
- **Created:** 2026-05-04

## Team Updates

- **2026-05-04:** Assigned child issues #14 (FavoriteButton), #15 (Integration into ProductCard + PDP), #16 (/favorites page) from PRD #1 decomposition. Dependencies: #14 no hard deps, #15 depends on #14 + #13, #16 depends on #12 + #14.
- **2026-05-04:** Created About Us page (route `/about`, component, navbar link). Placeholder content with team section using initial avatars. CSS integrated into `index.css`. Type-checked passing. Ready for real content swap.

## Reminders

- **2026-05-04:** Rude-naming convention reinforced for About page after user reminder — all internal identifiers (CSS classes, local vars, component-internal helpers) must use the rude-but-joking style per charter.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

- **2026-05-04:** Static pages (no API calls) use a plain named export function with `className="container page-<name>"` wrapping div. All CSS lives in `client/src/index.css` — no CSS modules. Route added as a simple `<Route path="..." element={<Component />} />` in `App.tsx`. Navbar links use `<NavLink>` with the inline `isActive` class pattern.

