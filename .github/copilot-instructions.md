# Copilot Instructions — squad-webshop

These repo-wide instructions apply to every Copilot CLI / coding-agent run in this repository, including specialist agents spawned by `squad watch` (Dallas, Lambert, Parker, Ripley, etc.).

## Pull Request description convention

**Every PR opened by a specialist agent MUST identify which specialist created it.**

The PR body must begin with a `Specialist:` line on the very first line, in this exact format:

```
**Specialist:** <emoji> <Name> (<Role>)
```

Use the entry from `.squad/team.md` (Members table) for the agent that is doing the work. Examples:

- `**Specialist:** 🏗️ Dallas (Lead)`
- `**Specialist:** ⚛️ Lambert (Frontend Dev)`
- `**Specialist:** 🔧 Parker (Backend Dev)`
- `**Specialist:** 🧪 Ripley (Tester)`
- `**Specialist:** 🤖 @copilot (Coding Agent)`

After that line, leave a blank line, then continue with the normal PR body (`Closes #<issue>`, summary, test notes, etc.).

### Full template

```
**Specialist:** <emoji> <Name> (<Role>)

Closes #<issue-number>

## Summary
<what changed and why>

## Testing
<how it was verified>
```

### When creating PRs with `gh pr create`

Pass the body via `--body` (or `--body-file`) so the `Specialist:` line is preserved as the first line. Do not omit it, do not move it below other content, and do not replace the emoji/name with a different agent than the one doing the work.

### Why

This lets reviewers and the coordinator immediately see which member of the squad owns a PR, and keeps the audit trail readable in the GitHub UI without having to inspect commit metadata or branch names.

## Other repo conventions

- Branch naming: `squad/<issue-number>-<slug>` (see `.squad/templates/skills/git-workflow/SKILL.md`).
- PRs target `dev` unless otherwise specified.
- Always reference the issue with `Closes #<n>` so the issue auto-closes on merge.
- Follow the charter in `.squad/agents/<name>/charter.md` for role-specific responsibilities.
