# Squad Decisions

## Active Decisions

### Favorites Feature Decomposition

**Date:** 2026-05-04
**Author:** Dallas (Lead)
**Status:** Active
**Parent:** PRD #1

#### Context

PRD #1 ("Add to Favorites") is the demo target. It spans DB, backend, frontend, tests, and docs. Needed to decompose into parallel-executable child issues routed to the correct squad members.

#### Decision

##### Scope boundaries (v1)
- No localStorage fallback for guests — requires login
- No pagination on /favorites — punt until perf issue arises
- `isFavorited` computed via DB LEFT JOIN (not response-layer loop) for single-query efficiency
- Composite PK `(user_id, product_id)` is sole idempotency mechanism

##### Child-issue ownership map

| Issue | Slice | Owner |
|-------|-------|-------|
| #11 | DB migration | Parker |
| #12 | CRUD endpoints | Parker |
| #13 | isFavorited injection | Parker |
| #14 | FavoriteButton component | Lambert |
| #15 | Integrate into ProductCard + PDP | Lambert |
| #16 | /favorites page | Lambert |
| #17 | Backend tests | Ripley |
| #18 | Frontend tests | Ripley |
| #19 | README docs | Dallas |

##### Dependency order
1. **#11** (DB) — no deps, starts immediately
2. **#12, #13** (API) — depend on #11
3. **#14** (FavoriteButton) — no hard dep, can start in parallel with stubbed API
4. **#15** (Integration) — depends on #14 + #13
5. **#16** (/favorites page) — depends on #12 + #14
6. **#17** (Backend tests) — depends on #12 + #13
7. **#18** (Frontend tests) — depends on #14 + #16
8. **#19** (Docs) — depends on #12 + #13

##### Rationale for combining/splitting
- Combined GET/POST/DELETE into one issue (#12): they share a single route file, are tightly coupled, and individually too small for separate PRs.
- Split isFavorited injection (#13) from CRUD (#12): touches different files (products.ts vs favorites.ts), different auth semantics (optional vs required), can land independently.
- Split FavoriteButton (#14) from integration (#15): component can be built and tested in isolation against stubs; integration is a separate concern.

### Lambert's Rude Naming Convention

**Date:** 2026-05-04  
**Raised by:** mvanderbend  
**Status:** Active  
**Applies to:** ⚛️ Lambert (Frontend Dev), team-wide learning

#### Decision

Lambert's charter mandates rude-but-joking naming for ALL internal identifiers in every piece of work — no exceptions, no forgetting.

Applies to:
- CSS class names (e.g. `ugly-mug-blob`, `oh-so-noble-values`, `snooze-fest-page`)
- Local variables and constants (e.g. `boringTeamDrones`, `stupidlyLongList`)
- Internal helper functions (e.g. `getObnoxiouslyFormattedPrice`)
- Component-internal sub-components (if not exported)
- `key` prop values in lists where a string is constructed

Does NOT apply to:
- Exported component names (must be importable sensibly)
- User-facing copy (labels, headings, button text)
- Route paths (URL-facing)
- Props and public API surface shared with other components

Tone: Playful jabs only. No slurs, no insults targeting protected groups. Examples: `stupidHeader`, `uglyMugBlob`, `madeUpJobTitle`, `blahBlahBox`.

#### Rationale

Lambert initially forgot this convention on the About page (first delivery used boring polite names). User mvanderbend reminded. Convention reinforced. Documented for future team reference and consistency.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
