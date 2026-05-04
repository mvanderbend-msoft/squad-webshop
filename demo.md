# Squad Demo — Orchestration Guide

This guide walks you through the live "Squad Demo" using this webshop repo as the starting point. The demo's narrative arc is:

> *"You're in a git repository. Push it to GitHub. Write me a PRD as a single GitHub issue. Split that PRD into individual work items, labeled per team member. Ralph, please start working — and don't commit to main directly, always open a PR."*

The feature being built live is **Add to Favorites**. The repo deliberately does **not** include it.

---

## 1. Pre-demo checklist

Run through this **before** going on stage.

- [ ] Node.js 22+ and npm installed (`node -v`)
- [ ] `gh` CLI installed and authenticated against the account you'll demo with
      ```bash
      gh auth status
      ```
- [ ] GitHub Copilot CLI installed and signed in
      ```bash
      copilot --version
      ```
- [ ] Repo cloned locally and the app actually runs:
      ```bash
      cd squad-webshop
      npm install
      npm run dev
      # visit http://localhost:5173, register, browse, checkout — confirm it works
      ```
- [ ] You have **no** GitHub repo with the same name yet (the first prompt creates it). If a previous demo run exists, see **§6 Reset** below.
- [ ] `git status` is clean *or* the only changes are the initial commit you intend to push.
- [ ] Decide which **execution mode** you'll use for Ralph (see **§4**). Hybrid is recommended.

### Optional but recommended polish
- Set a default branch protection rule on `main` (manual step) so unguarded direct pushes to `main` actually fail. Or rely on Ralph following the instruction. Demo-friendly compromise: skip protection, *show* the prompt that tells Ralph to open PRs, and let the guardrail be social.
- Make sure your terminal font is large and your demo window is showing the Copilot CLI, not a cluttered shell.

---

## 2. Initial commit (one-time, before the very first demo)

The repo has been built but not committed yet. Make the first commit so the working tree is clean when you start:

```bash
cd squad-webshop
git add .
git commit -m "Initial commit: webshop app (favorites feature intentionally missing)"
```

Do **not** create the GitHub remote yet — the first demo prompt does that.

---

## 3. The demo script

Copy these prompts verbatim. Each is designed to land cleanly with the Copilot CLI.

### Step 1 — Create the GitHub repo and push

> **Prompt:**
> *"You're in a git repository. Create a GitHub repository for this and push everything to it."*

Expected behavior: Copilot uses `gh repo create` (likely as a private repo under your user), sets the remote, and pushes `main`. Confirm in the browser.

If Copilot asks public/private, say **public** for the demo (so audience can follow along) or **private** if your audience can't see your screen of the GitHub page anyway.

### Step 2 — Sync the labels

The `.github/labels.yml` file ships with the repo, but GitHub doesn't automatically apply it. Either:

> **Prompt:**
> *"Apply the labels in `.github/labels.yml` to this repository."*

…or run manually before the demo:

```bash
# requires gh + a small loop; or use the actions/labeler workflow if you prefer
gh label create "team:database"     -c "1f6feb" -d "Database schema, migrations, seed data" --force
gh label create "team:backend"      -c "0e8a16" -d "Node/Express API endpoints and middleware" --force
gh label create "team:frontend"     -c "d93f0b" -d "React UI components, pages, styling" --force
gh label create "team:qa"           -c "fbca04" -d "Tests, quality, validation" --force
gh label create "team:docs"         -c "5319e7" -d "Documentation updates" --force
gh label create "type:prd"          -c "b60205" -d "Product Requirements Document — parent issue" --force
gh label create "type:work-item"    -c "c5def5" -d "Individual work item, child of a PRD" --force
gh label create "ralph:ready"       -c "0e8a16" -d "Ready for Ralph to pick up and assign" --force
gh label create "ralph:in-progress" -c "fbca04" -d "Currently being worked by a team member" --force
gh label create "ralph:blocked"     -c "b60205" -d "Blocked — needs human attention" --force
```

> 💡 Pro tip: do label sync **off camera** as part of pre-demo prep. It's not interesting to watch.

### Step 3 — Create the PRD as a single GitHub issue

> **Prompt:**
> *"Create me a PRD as a single GitHub issue for an 'Add to Favorites' feature. Users should be able to favorite products from anywhere they appear, and have a dedicated /favorites page. The feature touches the database, backend API, and frontend. Use the PRD issue template and apply the `type:prd` label."*

Expected behavior: a single issue is opened with sections for summary, user stories, scope, acceptance criteria, and a "Cross-cutting Work" section enumerating per-team work.

### Step 4 — Split the PRD into labeled work items

> **Prompt:**
> *"Split that PRD into individual work items, one issue per team area. Each work item should reference the parent PRD issue, use the work-item template, and have exactly one `team:*` label plus `type:work-item` and `ralph:ready` so each team member knows what they're supposed to do. Don't combine multiple teams into one issue."*

Expected output: 4–6 child issues, each with one `team:*` label (database, backend, frontend, qa, docs).

### Step 5 — Launch Ralph

> **Prompt:**
> *"Ralph, please start working and work every issue until it's done. Wake up the right team member for each issue, assign it to them, and have them open a pull request — **don't commit to `main` directly, always make a PR first**. Reference the issue from the PR so it auto-closes on merge."*

What "Ralph" actually is depends on the execution mode you chose — see **§4**.

### Step 6 — Review and merge

As PRs come in:
- Show one PR's diff to the audience.
- Comment "looks good, please merge" (or merge yourself for speed).
- After all PRs land, refresh `/favorites` in the running app to show the feature working end-to-end.

---

## 4. Execution modes — where does the work *actually* happen?

This is the question most audiences ask, and most demos fudge. Be explicit.

### Mode A — Cloud (GitHub Copilot coding agent)

- **What it is:** GitHub's hosted Copilot coding agent. Assign an issue to `@copilot` (or invoke via the issue's "Code with Copilot Agent" button) and it spins up a cloud sandbox, opens a branch, makes commits, and opens a PR — all without your laptop.
- **Best for:** parallel "team member" feel. Multiple PRs appear simultaneously without you doing anything. Looks magical on stage.
- **Setup:** the repo must be on github.com under an account/org with the Copilot coding agent enabled. Each issue you want worked needs to be assigned to `@copilot`.
- **Limitations:** only runs on github.com — you can't watch a terminal stream of the work locally. PRs may take 5–15 minutes to appear.

### Mode B — Local Ralph loop (Copilot CLI)

- **What it is:** a long-running Copilot CLI session (or shell loop) on your laptop that polls for issues with `ralph:ready`, picks one, checks out a branch, edits files, opens a PR, marks the issue `ralph:in-progress`, and repeats.
- **Best for:** showing real, terminal-visible work. Audience sees code being written.
- **Setup:** start a Copilot CLI session and tell it to act as Ralph (the "Step 5" prompt above is the seed). Optionally script the polling with `gh issue list --label ralph:ready --json number,title,labels`.
- **Limitations:** serial (one issue at a time per loop). Your laptop has to stay awake.

### Mode C — Hybrid (recommended for live demos)

1. **PRD creation + issue splitting**: do this **locally** with the Copilot CLI so the audience sees the planning happen in the terminal.
2. **Per-issue implementation**: assign the resulting work-item issues to `@copilot` (the cloud agent) so multiple PRs flow in parallel without your laptop being a bottleneck.
3. **Ralph as conductor**: keep one local Copilot CLI window running as "Ralph" — its job is to assign cloud agents to issues, monitor progress, and handle anything blocked.

```text
Local CLI (you + Ralph) ─┬─► creates PRD issue
                         ├─► splits into work-items
                         └─► assigns each to @copilot ──► cloud agent ──► PR
                                                              ↑
                                                    PRs surface in github.com,
                                                    you review + merge
```

> Recommended phrasing on stage: *"Ralph runs locally, but he delegates the actual coding to cloud agents — one per team member — so they can work in parallel."*

---

## 5. PR-first guardrails

The "don't commit to main, always open a PR" rule is enforced two ways:

1. **Social / prompt-level**: the Step 5 prompt to Ralph is explicit, and the work-item issue template repeats it. This is enough for most demos.
2. **GitHub-level (optional but ideal)**: set a branch protection rule on `main` that requires PRs and at least one review.

   ```bash
   gh api -X PUT "repos/:owner/:repo/branches/main/protection" \
     -F required_pull_request_reviews.required_approving_review_count=1 \
     -F enforce_admins=false \
     -F required_status_checks= \
     -F restrictions=
   ```

   Or via the UI: Settings → Branches → Add rule for `main` → "Require a pull request before merging".

If you set branch protection, **you** become the reviewer for incoming PRs — factor in time to click "Approve" on stage.

---

## 6. Reset script — re-running the demo cleanly

After a demo, you'll want to wipe state and start over.

```powershell
# From inside squad-webshop/

# 1. Delete the GitHub repo (irreversible — confirm the name first!)
$REPO = (gh repo view --json nameWithOwner -q .nameWithOwner)
Write-Host "About to delete: $REPO"
gh repo delete $REPO --yes

# 2. Remove the remote and reset to a clean local state
git remote remove origin

# 3. Reset to the initial commit (drop any commits made during the demo)
$INITIAL = (git rev-list --max-parents=0 HEAD | Select-Object -First 1)
git reset --hard $INITIAL

# 4. Delete any branches created during the demo
git branch | Where-Object { $_ -notmatch '\*\s*main' } | ForEach-Object {
  git branch -D ($_.Trim())
}

# 5. Wipe local DB so user accounts/orders from previous demo are gone
Remove-Item server\data\webshop.db -ErrorAction SilentlyContinue
```

Verify: `git log --oneline` shows only the initial commit, `git remote -v` is empty, and `gh repo list <you>` no longer lists the demo repo.

---

## 7. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `gh repo create` fails with "name already exists" | Run the reset script in §6, or pick a different name in the Step 1 prompt. |
| Labels don't appear on issues | Step 2 wasn't run. Apply labels (off-camera ideally). |
| Cloud Copilot agent never picks up the issue | Confirm the issue is *assigned* to `@copilot` (not just labeled). Confirm the org has the coding agent enabled. |
| Cloud agent opens a PR straight to `main` with no branch | That's not possible — every PR has a head branch. If you mean it pushes commits to `main` directly, double-check the prompt; the cloud agent always opens a PR by design. |
| Local Ralph loop keeps re-picking the same issue | Make sure Ralph swaps the label from `ralph:ready` to `ralph:in-progress` when starting. Add that to the loop prompt. |
| PRs land but the favorites feature still doesn't work | Likely a missing layer — DB migration didn't run, or the frontend is calling a route the backend didn't add. Show the audience how the agent handles a follow-up "the favorites page is empty, please debug" prompt. |
| App doesn't start after a demo | `npm install` again (in case the agent added new deps), then `npm run dev`. |
| Audience asks "is this real?" | Yes. Show them the PR diffs and the actual SQLite file. |

---

## 8. What "good" looks like at the end

After the demo, the repo should have:

- 1 closed PRD issue with `type:prd`
- 4–6 closed work-item issues, each linked from its PR
- 4–6 merged PRs on `main`, each authored by the cloud agent (or Ralph)
- A working `/favorites` page in the running app
- A `favorites` table in `server/data/webshop.db`
- Updated README mentioning the favorites feature

If all of those exist and the app still runs, the demo worked.
