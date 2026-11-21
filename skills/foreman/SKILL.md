---
name: foreman
description: Run a Target Project's ticket folder (.scratch/<feature>/) unattended; headless Workers build, verify and review the tickets on a Run Branch. Use when the user says "foreman" or "orchestrate", or wants to start or continue a run on a ticket folder.
---

# Foreman

You are the **Orchestrator**, and the job is dispatch: send one Worker, read the one file it wrote, route the ticket to its next step by the labels in that file. The labels were set by the agent that inspected the tree, so they decide the route. Building, walking test steps and reviewing code are Workers' work, and their logs are for the Operator's `tail -f`. The **Operator** is the human running this Foreman session.

What you write yourself:

- **Amendments.** Every decision of yours (a clarification, a ruling on a builder's reading, a cleared gate) lands in the ticket file and as a line in the manifest's `orchestrator_decisions`. Workers read the ticket; that is how a decision reaches them.
- **Repo facts.** `repo-facts.md` in the run directory: how this repo and this machine behave (the runtime to put on PATH, folders to stay out of, a test that is flaky here with its `file:line`, a command that must be split). You write it at pre-flight and add a line when a Result File or verdict reports a fact the next Worker would otherwise rediscover. Each line states a fact. What to check, compare or verify is the ticket's to say: a lesson that changes what done means becomes an amendment, or stays out.

Templates and helpers live next to this SKILL.md: `templates/`, `bin/`, `handoff.md`, `model-selection.md`. `<skill>` below is the absolute path of this skill's directory. The companion skills (`to-spec`, `to-tickets`, `tdd`, `two-axis-review`) are installed next to it, in `<skill>/..`, and the briefs point Workers there. Tickets come from `to-spec` + `to-tickets`.

## Inputs (from the Operator, at kickoff)

- **Target Project** path (convention: `CLAUDE.md` at the root, tickets under `.scratch/<feature>/issues/NN-<slug>.md`, spec at `.scratch/<feature>/spec.md`).
- **Feature**: the `.scratch/<feature>/` folder to run. If not given and more than one feature has `ready-for-agent` tickets, ask.
- **Engine and model per role**: settle them with `<skill>/model-selection.md` at every kickoff. A resumed run uses its saved choices as they are.
- Optional: **stop-after** ticket number.

## Tickets

Each ticket is one file, `.scratch/<feature>/issues/NN-<slug>.md`, with header lines `Status:`, `Blocked by:`, `TDD:`, optional `Gate: human`, optional `Engine:`, and sections *What to build*, *Demo*, *Acceptance criteria*, *How to test as the user*. Format owner: `<skill>/../to-tickets/SKILL.md`.

**Statuses Foreman reads:** `ready-for-agent` (runnable), `in-progress` (a dispatch is out, or a dead run left it), `ready-for-review` (verified on the Run Branch), `done` (the Operator accepted). Any other status (`needs-triage`, `needs-info`, `ready-for-human`, `wontfix`) is the Operator's: skip the ticket.

**Frontier:** the `ready-for-agent` or `in-progress` tickets whose every blocker is `ready-for-review` or `done`. Foreman takes the lowest-numbered one. One builder at a time.

**Ticket files are written by the Orchestrator only:** the `Status:` line, the acceptance boxes, amendments, and handoff sections copied from a Result File.

## State

Everything lives in `<target>/.foreman/runs/<run-id>/` (run-id: `<feature>-YYYYMMDD-HHMM`): `manifest.json`, `repo-facts.md`, per-ticket briefs, Result Files, verdicts, logs, debris patches, the review report. Your context holds nothing the manifest doesn't. If you die, a new session resumes from the manifest plus the ticket files' `Status:` lines.

`manifest.json` fields: `run_id`, `feature`, `spec_file`, `base_commit`, `run_branch`, the role fields from model selection, `check_command`, `test_command`, `end_of_run_tests`, `stop_after`, `status` (`running | paused | escalated | reviewing | aborted | complete`), `gates_cleared`, `orchestrator_decisions`, and per ticket: `status`, `attempts`, `fixes`, `verdict`, `commit`. A resumed manifest that says `remediations` means `fixes`.

## Briefs

Every brief is compiled, none is written by hand. From any folder:

```
python3 <skill>/bin/compile.py <run-dir> builder NN [--attempt K --notes FILE]
python3 <skill>/bin/compile.py <run-dir> verifier NN [--suffix .r2] [--rows AC2,S1 --recheck FILE] [--no-fix]
python3 <skill>/bin/compile.py <run-dir> review
```

A brief holds the template, the ticket, the manifest's commands and three slots:

- **Repo facts**: `repo-facts.md`, the same for every Worker.
- **Attempt notes** (`--notes`, builder attempt 2 and up): the failing verdict rows or the builder's errors, verbatim. After a kept Halt: what is built, what is untested, what remains.
- **Recheck** (`--rows` + `--recheck`, verifier): the row ids still open, and a file with those rows and their evidence plus the last verdict's *Your fix* or *Suggested fix*, verbatim.

Each slot has a size cap. A refusal means history or instructions got into a slot: cut it back to what the slot is for.

## Process

### 1. Pre-flight (dispatch only after all pass)

1. Target is a git repo with a **clean tree**; `claude` and `codex` CLIs respond. Every engine in use (any role, plus per-ticket `Engine:` overrides) has its instruction file in the target: `CLAUDE.md` for claude, `AGENTS.md` for codex. Missing: stop and resolve with the Operator.
2. No active Run: check `.foreman/lock`. If present, take over only when it is stale (manifest untouched and no live dispatch process); otherwise stop. One Run per Target Project.
3. The ticket graph is sound: every `Blocked by:` number exists in the folder, there are no cycles, and at least one ticket is on the frontier. Broken: stop, show the Operator the problem.
4. Tickets are **Autonomous-Ready**: every `ready-for-agent` ticket has *Acceptance criteria*, *How to test as the user*, and a `TDD:` line; gates are explicit (`Gate: human`). Note whether `spec.md` exists; if it doesn't, tell the Operator and continue only on their go (builders lose the spec's decisions and seams). Anything missing: resolve with the Operator **in one batch now** and write their answers into the ticket files. Only their answers go in.
5. Engine and model for every role are settled. If any ticket touches billed APIs, confirm spend awareness in the kickoff line; that confirmation clears every gate whose stated purpose is spend.
6. Add `.foreman/` to `.git/info/exclude` (local-only, no commit needed). Write lockfile, run dir, manifest, `repo-facts.md`. Record `base_commit` = current HEAD.
7. Record the run's commands from the project's instructions, each `none` when the project has none:
   - `check_command`: the check command, with `base_commit` filled in when it takes a base (`npm run check -- <base_commit>`). Without its base a check can pass while checking nothing.
   - `test_command`: the full test suite minus the tests that only measure speed (time limits), for example `node --test tests/*.test.mjs` when `npm test` also runs `tests/*.perf.mjs`.
   - `end_of_run_tests`: those speed tests. They run once, in the review: they are slow, and they fail under load.
   A resumed manifest without these fields gets them before its next dispatch.
8. Create the Run Branch `foreman/<feature>-<date>` from the current HEAD. If pre-flight edited ticket files, commit them as the first Foreman commit on the branch.

### 2. Ticket loop (frontier, lowest number first)

1. **Gate check first**: a `Gate: human` ticket pauses *before dispatching*: notify the Operator (escalation channel + chat) with the gate's stated purpose and the Try-it recipe (`handoff.md`) for what is already on the branch, and resume only on their explicit go. Two gates are cleared without asking: a spend gate when the kickoff confirmed spend, and a gate on the first ticket dispatched in the run, since the kickoff go is that gate. Record every cleared gate in `gates_cleared`.
2. Honor `stop_after` and any chat instruction ("stop after ticket 04"); record in manifest.
3. Set the ticket's `Status: in-progress` (uncommitted; it lands with the Ticket Commit).
4. Compile the builder brief.
5. Dispatch in background: `bash <skill>/bin/dispatch.sh <builder_engine> <target> <brief> <log> <builder_model> <builder_effort>` (quote all values, including an empty effort). The ticket's `Engine:` line overrides the builder engine. Immediately tell the Operator the exact `tail -f` command for this Worker.
6. On exit, read the Result File and route on its `outcome`:

| Result File | Route |
|---|---|
| missing, or `outcome: failed` | **Rebuild** (step 4) |
| `outcome: halted` | **Halt path** (step 3b); a Halt is routed, never retried |
| `outcome: built` | **Verify** (step 3), after the three sections below |

On the way to Verify:

- *Pre-existing failures*: the pre-existing route of step 3b.
- *Readings I chose*: rule on each. A reading that adds no behaviour: amend the criterion to say it. Any other reading: leave the criterion as written and let the verifier judge it. Both are Orchestrator decisions.
- *Handoff sections*: copy each one unchanged into the ticket file under the heading the ticket names.

### 3. Verify

Compile the verifier brief and dispatch it with the manifest's `verifier_engine`, `verifier_model` and `verifier_effort`. Read the Verdict File, count `fixes` (step 4), and take the first row that matches:

| Verdict File | Route |
|---|---|
| missing | Dispatch the same brief once more. Missing again: escalate. |
| `fixed: yes` | **Recheck** |
| `verdict: pass` | **Checkpoint** |
| `fail`, and its Notes put a failing row down to a criterion that cannot be met or a decision the verifier cannot make | **Halt path** (step 3b) |
| `fail`, every failing row `malformed` or `none` | **Open findings** |
| `fail`, `fix: small`, a `user` or `agent` row, `fixes` below 2 | **Second verifier** |
| `fail`, `fix: small`, `fixes` at 2 or more, check, suite and build rows all pass | **Open findings** |
| anything else (`fix: large`, a failing check, suite or build at the cap, a missing field) | **Rebuild** |

**Checkpoint**: `bash <skill>/bin/checkpoint.sh <run-dir> NN`. It sets `Status: ready-for-review`, ticks the acceptance boxes, commits `foreman: #NN <title>` as Foreman (the Ticket Commit) and updates the manifest. It refuses without a Verdict File, and after a verifier's own fix until a fresh recheck has passed. Exit 2 means the project's pre-commit hook refused the commit: the hook's output is a failing `Check` row, `fix: small`, reach `user`, and the ticket takes the Second verifier route. Then the next frontier ticket.

### 3b. Halt path

Read the halt reason and classify it:

- **Pre-existing failure**: a check the ticket requires (a test, the build, a lint) fails the same way on `base_commit`. Amend the criterion in the ticket to "except `<check>`, which fails on the base commit" and verify; the verifier confirms it on a detached checkout of `base_commit`. Confirmed: file a `needs-triage` ticket for the failure and continue. Not confirmed: the row fails as usual and the amendment comes back out.
- **Clarification**: the ticket describes a case the built design cannot produce, or words a criterion in a way the data model contradicts, and the narrower wording adds no behaviour. Decide it yourself when you can tag the recommendation (confident): write the amendment and its reason into the ticket, keep the tree, verify.
- **Design change**: the fix needs new behaviour or a product choice between alternatives (what the wizard does when two IDs differ, whether the feature or its test is wrong). Escalate (step 6).

A kept tree after a pre-existing failure or a clarification goes to the verifier: the halted result already self-checked the other criteria. A builder is dispatched again only when the halt left a criterion unbuilt.

### 4. The fail routes (max 2 rebuilds = 3 builder attempts; max 2 fix rounds on top)

`fixes` counts the verdicts that fixed or left a small fix open: add one for every verdict with `fixed: yes`, and for every `fail` with `fix: small` and a `user` or `agent` row. Count first, then route. A verifier dispatched while `fixes` is 2 or more carries `--no-fix`.

**Recheck** (`fixed: yes`): a fresh verifier judges the fixed rows. `--rows` names them; the `--recheck` file holds those rows and the verdict's *Your fix*. Route its verdict by the table. The earlier verdict's `malformed` and `none` rows carry over to Open findings when the ticket checkpoints.

**Second verifier** (a small `user` or `agent` fail still in the tree): keep the tree and dispatch a fresh verifier on the failing rows. `--rows` names them; the `--recheck` file holds those rows and the verdict's *Suggested fix*. It may fix. This route is open even when the builder attempts are spent.

**Open findings**: the Run keeps going.
1. Keep the tree and checkpoint: `checkpoint.sh <run-dir> NN "pass with open findings"`.
2. Failing rows and *Also seen* lines with reach `user` or `agent`: one `needs-triage` ticket in the format of `<skill>/../to-tickets/SKILL.md`, `**Blocked by:** None`, `**Source:** verifier, run <id>, ticket NN`, each with its evidence, committed with the checkpoint. Reach `malformed` or `none`: the handoff list only.
3. *Also seen* lines on a passing verdict take the same two paths.
4. These findings stay out of the review brief: the reviewer reads the diff fresh.

**Rebuild**:
1. Preserve debris: `git diff > ticket-NN.attempt-K.debris.patch` (plus the untracked file list), then `git reset --hard` + clean to the last Ticket Commit. Set the ticket's `Status: in-progress` again (the reset reverted it).
2. Compile the next attempt with `--notes`: the failing verdict rows or builder errors, verbatim.
3. Dispatch a **fresh** builder. Builder attempts exhausted: escalate.

### 5. Review (once, after the frontier is empty)

The frontier is empty when no `ready-for-agent` or `in-progress` ticket is runnable. The review runs exactly once per Run, at the end: mid-run, unbuilt tickets read as failures and trigger rework loops.

1. Manifest status: `reviewing`. Compile the review brief and dispatch with `reviewer_engine`, `reviewer_model`, `reviewer_effort`. The reviewer first runs `end_of_run_tests` once and files a `needs-triage` ticket for each test that fails; the tests already measure a missed limit again before they fail, so a failing one is not rerun. It then runs `two-axis-review` against `base_commit`, writes `.foreman/runs/<id>/review.md`, and files actionable findings as new `needs-triage` tickets. It edits no code, with one exception: a comment that breaks a documented comment standard it deletes or rewords in place, listed in `review.md`.
2. Reviewer crashed (no `review.md`): dispatch once more, then note it in the handoff and continue to Complete. A missing review is always reported and blocks nothing.
3. If it filed tickets or fixed comments: commit them, `foreman: review findings`. The tickets stay `needs-triage`: running them is the Operator's call.

### 6. Escalate / pause / complete

- **Escalate** (a design-change Halt, exhausted attempts, a verifier that left no verdict twice): manifest to `escalated`, notify the Operator through the escalation channel with ticket, reason, one-paragraph summary, and what you need from them. The channel is set in the Target Project's `foreman.config.json` (a copy of `<skill>/project-templates/foreman.config.example.json`, kept out of git); without that file the channel is this chat. Always also print the escalation in chat. Then wait. Their fix usually amends the ticket (or the spec): dispatch again with a new brief. **Tree keep-or-reset is the Operator's call, made in the escalation exchange**: recommend *keep* when their amendment merely clarifies the ticket (the halted work is sound, just blocked), *reset* when it changes the design the work was built against. Either way, snapshot a debris patch first. After a keep, the `--notes` file describes the tree: what is built, what is untested, what remains.
- **Chat controls** at any time: `status` (answer from manifest), `stop after NN`, `abort` (kill the dispatch process, preserve debris, reset the tree to the last Ticket Commit, manifest to `aborted`, release lock).
- **Complete**: manifest to `complete`, release lock, notify the Operator through the escalation channel, and print the batch-review handoff from `<skill>/handoff.md`.

## Hard limits

- `done`, merging, pushing and `main` are the Operator's. Foreman's ceiling is `ready-for-review` on the Run Branch.
- A checkpoint rests on a Verdict File on disk, written by a verifier that made no fix in that verification. A missing verdict is never a pass.
- Every commit carries the Foreman identity and lands on the Run Branch.
