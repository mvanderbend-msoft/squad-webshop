# Project Context

- **Owner:** mvanderbend
- **Project:** squad-webshop — sample webshop, starting point for the Squad demo. Feature-complete *except* "Add to Favorites" (the live demo target).
- **Stack:** React 18 + Vite + TypeScript (client, port 5173), Node.js + Express + TypeScript (server, port 4000), SQLite via `node:sqlite` (Node 22+), JWT auth with `bcryptjs`, npm workspaces.
- **Created:** 2026-05-04

## Team Updates

- **2026-05-04:** Assigned child issues #14 (FavoriteButton), #15 (Integration into ProductCard + PDP), #16 (/favorites page) from PRD #1 decomposition. Dependencies: #14 no hard deps, #15 depends on #14 + #13, #16 depends on #12 + #14.

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
