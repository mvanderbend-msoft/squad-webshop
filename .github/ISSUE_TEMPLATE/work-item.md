---
name: Work Item
about: A single, scoped piece of work owned by one team area. Child of a PRD.
title: "[<team>] <short description>"
labels: ["type:work-item", "ralph:ready"]
---

## Parent PRD
Closes part of #<PRD issue number>

## Description
<what needs to be done>

## Acceptance Criteria
- [ ]
- [ ]

## Files likely to change
-

## Notes for Ralph / the assignee
- Branch from `main`, name it `<team>/<short-slug>`.
- **Do NOT commit to `main` directly. Always open a PR.**
- Reference this issue in the PR description (e.g., `Closes #<n>`).
