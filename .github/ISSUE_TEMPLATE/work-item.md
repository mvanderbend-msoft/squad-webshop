---
name: Work Item
about: A scoped piece of work, child of a PRD. Lead will assign to a squad member.
title: "<short description>"
labels: ["squad"]
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

## Notes for the assignee
- Branch from `main`, name it `squad/<issue-number>-<short-slug>`.
- **Do NOT commit to `main` directly. Always open a PR.**
- Reference this issue from the PR (`Closes #<n>`).
