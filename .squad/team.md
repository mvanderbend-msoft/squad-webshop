# Squad Team

> squad-webshop

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| 🏗️ Dallas  | Lead         | `.squad/agents/dallas/charter.md`  | Active |
| ⚛️ Lambert | Frontend Dev | `.squad/agents/lambert/charter.md` | Active |
| 🔧 Parker  | Backend Dev  | `.squad/agents/parker/charter.md`  | Active |
| 🧪 Ripley  | Tester       | `.squad/agents/ripley/charter.md`  | Active |
| 📋 Scribe  | Session Logger | `.squad/agents/scribe/charter.md` | Active |
| 🔄 Ralph   | Work Monitor | `.squad/agents/ralph/charter.md`   | Active |
| 🤖 @copilot | Coding Agent | `.github/copilot-instructions.md` | Active |

<!-- copilot-auto-assign: true -->

### @copilot Capability Profile

| Area | Confidence | Notes |
|------|-----------|-------|
| Docs / README updates | 🟢 High | Well-scoped, low-risk |
| Single-file refactors | 🟢 High | Pattern matching, mechanical edits |
| Tests from spec | 🟡 Medium | Works when scope is clear |
| DB migrations | 🟡 Medium | Tight schema specs only |
| Multi-file architecture | 🔴 Low | Defer to Lambert/Parker |
| UI/UX polish | 🔴 Low | Visual judgment needed |

## Project Context

- **Owner:** mvanderbend
- **Project:** squad-webshop — sample webshop, starting point for the Squad demo. Feature-complete *except* "Add to Favorites" (live demo target).
- **Stack:** React 18 + Vite + TypeScript (client, port 5173), Node.js + Express + TypeScript (server, port 4000), SQLite via `node:sqlite` (Node 22+), JWT auth with `bcryptjs`, npm workspaces.
- **Created:** 2026-05-04

## PRD

- **Source:** [#1 — \[PRD\] Add to Favorites](https://github.com/mvanderbend-msoft/squad-webshop/issues/1)
- **Ingested:** 2026-05-04
- **Status:** Decomposing into child issues (owned by Dallas)
