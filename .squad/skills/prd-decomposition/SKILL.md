# Skill: PRD Decomposition

**Purpose:** Break a PRD (Product Requirements Document) issue into self-contained, routable child issues for a squad.

## When to use
- A PRD or epic issue has been filed and needs to be triaged into work items
- The PRD spans multiple layers (DB, API, UI, tests, docs)

## Process

### 1. Read inputs
- The PRD body (acceptance criteria, scope, cross-cutting areas)
- `routing.md` — who handles what
- `README.md` — project structure, file paths, API surface
- `team.md` — active members

### 2. Identify slices
Split by **layer × responsibility boundary**:
- One slice per DB migration
- Group tightly-coupled endpoints (same route file) into one slice
- Separate cross-cutting concerns (e.g., isFavorited injection) if they touch different files
- One slice per reusable component
- Separate integration (wiring component into existing pages) from component creation
- One slice per page/route
- Test slices mirror implementation slices (backend tests, frontend tests)
- Docs as a trailing slice

### 3. Assign ownership
Map each slice to a squad member using routing.md:
- DB/API → backend dev
- Components/pages → frontend dev
- Tests → tester
- Docs/architecture → lead

### 4. Establish dependencies
- DB before API
- API before frontend integration (but frontend components can start in parallel with stubs)
- Implementation before tests
- Everything before docs

### 5. Size check
Each issue should be completable in **one PR** by **one agent**. Rules of thumb:
- If a slice touches >4 files across different concerns → split it
- If a slice is <20 lines of meaningful code → combine with a related slice
- If two slices must be merged in the same PR to avoid broken state → combine them

### 6. Create issues
Each child issue includes:
- Title prefixed with area: `[DB]`, `[API]`, `[UI]`, `[Test]`, `[Docs]`
- `Parent: #N` reference
- Concrete acceptance criteria (pulled from PRD ACs)
- File paths to touch
- `Depends on: #N` lines
- Labels: `squad` + `squad:{member}`

### 7. Post index comment
On the parent PRD, post a table of all child issues with numbers, titles, owners, and dependency links.

## Anti-patterns to avoid
- Creating issues so small they're a single function change
- Creating issues so large they can't be reviewed in one sitting
- Forgetting to label issues (breaks routing automation)
- Circular dependencies
- Leaving architecture decisions implicit — bake them into issue descriptions
