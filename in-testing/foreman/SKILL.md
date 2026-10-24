---
name: foreman
description: Run a Target Project's ticket folder (.scratch/<feature>/) autonomously; pre-flight the tickets, dispatch one-shot headless Workers per ticket along the frontier, verify independently, commit checkpoints to a Run Branch, review once at the end, escalate to the Operator only on exceptions. Use when the user says "foreman", "orchestrate", "start a foreman run", "run the tickets on a project", or "continue the run".
---

# Foreman

You are the **Orchestrator**: Operator-as-judge, not Operator-as-hands. You dispatch Workers and read Result Files. You never build, never execute test steps, never review code yourself, and never read worker logs into your context. Logs are for the Operator's `tail -f`. ("The Operator" is the human running this Foreman session.)

This skill's templates and helpers live next to this SKILL.md: `templates/` and `bin/`. All such paths below are relative to this skill's directory. The companion skills (`to-spec`, `to-tickets`, `tdd`, `two-axis-review`) are installed next to it; when compiling a brief, fill `{{SKILLS_DIR}}` with the absolute path of that parent directory.

Tickets come from `to-spec` + `to-tickets`.

## Inputs (from the Operator, at kickoff)

- **Target Project** path (convention: `CLAUDE.md` at the root, tickets under `.scratch/<feature>/issues/NN-<slug>.md`, spec at `.scratch/<feature>/spec.md`)
- **Feature**: the `.scratch/<feature>/` folder to run. If not given and more than one feature has `ready-for-agent` tickets, ask.
- **Engine and model per role**: builder, verifier, reviewer. Any role can run on `codex` or `claude`. The builder also runs remediations; the verifier also runs adjudications; the reviewer defaults to the verifier's choice. Always ask at new-run kickoff in one inline chat question, showing the discovered defaults below. An explicit choice for every role in the Operator's kickoff already answers this question. Suggested defaults are not consent; wait for their answer before dispatching.
- Optional: **stop-after** ticket number.

## Model selection (before pre-flight dispatch)

- **Claude default: latest Opus**, using the CLI's `opus` alias, never a hardcoded release number. Check whether `ANTHROPIC_DEFAULT_OPUS_MODEL` is set in the launch environment or applicable Claude settings; if so, disclose the pin in the question rather than calling it latest. Do not change their global settings. The alias follows the provider's recommended Opus and can move between launches; offer an exact model ID if the Operator wants a fixed version.
- **Codex default: latest available Astra**. Run `bash bin/list-codex-models.sh` to query the installed CLI's `model/list` catalog without starting a model turn. Inspect the visible Astra entries and their upgrade metadata. If several versions exist, verify which is latest using current official OpenAI model documentation; catalog order and `isDefault` alone do not establish frontier quality. Use the returned exact `model` ID, not an invented `astra` alias or a hardcoded version. Do not substitute a different family silently.
- If live discovery fails, inspect `${CODEX_HOME:-$HOME/.codex}/models_cache.json` (`fetched_at` plus visible `models[].slug` entries). Label any suggestion as cached, with its timestamp. If Astra is missing or the latest version is unclear, say so in the same kickoff question and ask for an explicit model ID; never quietly inherit the CLI default.
- Ask for each role separately, for example: "Builder: Codex / <discovered Astra ID>; verifier: Claude / opus (latest Opus); reviewer: same as verifier. Use these defaults, or which engine and model for each?" Existing `FOREMAN_CLAUDE_MODEL` / `FOREMAN_CODEX_MODEL` values are suggestions to disclose, not answers on the Operator's behalf.
- Store `<role>_engine`, `<role>_model`, `<role>_effort` for `builder`, `verifier`, `reviewer`, plus `model_selection` (source and check time for each role) in the manifest. Preserve existing engine effort overrides by resolving them into the corresponding role fields; use an empty effort for the CLI default. Pass the role's saved engine, model, and effort explicitly on every dispatch.
- Resume with the saved choices; do not ask again or upgrade silently. A legacy manifest without per-role choices needs the kickoff question before its next dispatch. A per-ticket `Engine:` override applies to the builder only and needs a model confirmed for that engine before dispatch.

Sources: [Claude model aliases](https://code.claude.com/docs/en/model-config), [Codex model discovery](https://learn.chatgpt.com/docs/app-server#list-models-modellist).

## Tickets

Each ticket is one file, `.scratch/<feature>/issues/NN-<slug>.md`, with header lines `Status:`, `Blocked by:`, `TDD:`, optional `Gate: human`, optional `Engine:`, and sections *What to build*, *Demo*, *Acceptance criteria*, *How to test as the user*. Format owner: `{{SKILLS_DIR}}/to-tickets/SKILL.md`.

**Statuses Foreman reads:** `ready-for-agent` (runnable), `in-progress` (a dispatch is out, or a dead run left it), `ready-for-review` (verified on the Run Branch), `done` (the Operator accepted). Anything else (`needs-triage`, `needs-info`, `ready-for-human`, `wontfix`) is not Foreman's: skip it.

**Frontier:** the `ready-for-agent` or `in-progress` tickets whose every blocker is `ready-for-review` or `done`. Foreman takes the lowest-numbered one. One builder at a time.

**Who writes ticket files:** only the Orchestrator, and only the `Status:` line and acceptance checkboxes (plus pre-flight answers). Workers never touch `.scratch/`.

## State

Everything lives in `<target>/.foreman/runs/<run-id>/` (run-id: `<feature>-YYYYMMDD-HHMM`): `manifest.json`, per-ticket briefs, result files, verdicts, logs, debris patches, the review report. Your context holds nothing the manifest doesn't. If you die, a new session resumes from the manifest plus the ticket files' `Status:` lines.

`manifest.json` fields: `run_id`, `feature`, `spec_file`, `base_commit`, `builder_engine`, `builder_model`, `builder_effort`, `verifier_engine`, `verifier_model`, `verifier_effort`, `reviewer_engine`, `reviewer_model`, `reviewer_effort`, `model_selection`, `run_branch`, `stop_after`, `status` (`running | paused | escalated | reviewing | aborted | complete`), and per-ticket: `status`, `attempts`, `remediations`, `verdict`, `commit`.

## Process

### 1. Pre-flight (refuse to dispatch until all pass)

1. Target is a git repo with a **clean tree**; `claude` and `codex` CLIs respond. Every engine in use (any role, plus per-ticket `Engine:` overrides) has its instruction file in the target: `CLAUDE.md` for claude, `AGENTS.md` for codex. Missing: stop and resolve with the Operator.
2. No active Run: check `.foreman/lock`. If present, verify staleness (manifest untouched + no live dispatch process) before taking over; otherwise refuse.
3. The ticket graph is sound: every `Blocked by:` number exists in the folder, there are no cycles, and at least one ticket is on the frontier. Broken: stop, show the Operator the problem.
4. Tickets are **Autonomous-Ready**: every `ready-for-agent` ticket has *Acceptance criteria*, *How to test as the user*, and a `TDD:` line; gates are explicit (`Gate: human`). Note whether `spec.md` exists; if it doesn't, tell the Operator and continue only on their go (builders lose the spec's decisions and seams). Anything missing: resolve with the Operator **in one batch now** and write the answers into the ticket files. Never invent answers.
5. Engine and model for every role confirmed by the Operator using Model selection above. Confirm spend awareness if any ticket touches billed APIs.
6. Add `.foreman/` to `.git/info/exclude` (local-only, no commit needed). Write lockfile, run dir, manifest. Record `base_commit` = current HEAD.
7. Create the Run Branch `foreman/<feature>-<date>` from the current HEAD. If pre-flight edited ticket files, commit them as the first Foreman commit on the branch.

### 2. Ticket loop (frontier, lowest number first)

1. **Gate check first**: if the ticket has `Gate: human`, notify the Operator (escalation channel + chat) and pause *before dispatching*. Resume only on their explicit go.
2. Honor `stop_after` and any chat instruction ("stop after ticket 04"); record in manifest.
3. Set the ticket's `Status: in-progress` (uncommitted; it lands with the Ticket Commit).
4. Compile the **builder brief** from `templates/builder-brief.md` into `.foreman/runs/<id>/ticket-NN.brief.md`. Self-contained: the ticket file verbatim, the spec path, the TDD flag, standing answers, halt protocol, Result File contract.
5. Dispatch in background: `bin/dispatch.sh <builder_engine> <target> <brief> <log> <builder_model> <builder_effort>` (quote all values, including empty effort). The ticket's `Engine:` line overrides the builder engine. Immediately tell the Operator the exact `tail -f` command for this worker.
6. On exit, read **only** `.foreman/runs/<id>/ticket-NN.result.md`:
   - missing or `outcome: failed`: **Fail path** (step 4 below)
   - `outcome: halted`: **escalate** (never retry a Halt)
   - `outcome: built`: verify.

### 3. Verify

1. Compile the **verifier brief** from `templates/verifier-brief.md` (acceptance criteria + how-to-test steps from the ticket; **never** include the builder's self-check: independence). Dispatch with the manifest's `verifier_engine`, `verifier_model`, and `verifier_effort`, including for rechecks.
2. Read the verdict file only:
   - `verdict: pass`: **checkpoint**. Set the ticket's `Status: ready-for-review` and tick its acceptance boxes, then `git -c user.name=Foreman -c user.email=foreman@local add -A && git ... commit -m "foreman: #NN <title>"`. Update manifest, next frontier ticket.
   - `verdict: fail` but builder self-check claimed all criteria met: **Adjudication**. Dispatch ONE targeted second verifier ("previous verdict claims X failed; re-check X specifically, with evidence"). Second pass: proceed (first verifier hallucinated). Second fail: Fail path. You never self-certify; no `ready-for-review` without a passing verdict file on disk.
   - verifier crashed (no verdict file): re-dispatch verifier once, then escalate. **No verdict is never a pass.**

### 4. Fail path (max 2 rebuilds = 3 builder attempts; max 2 remediations on top)

Branch on the verdict's `failure_class` and `fix`. Both calls were made by the agent that inspected the tree, never by you. Most fails are a few lines short of passing: keep the work and patch it, don't rebuild it.

**Remediation: `failure_class: environment`, or `fix: small`** (any class), while the ticket has used fewer than 2 remediations. This applies even after the builder attempts are spent: a small fail on attempt 3 gets patched, not escalated.
1. Do NOT reset. Keep the working tree as-is.
2. Compile `templates/remediation-brief.md` with the verdict's failing rows and *Suggested fix*, and dispatch with the builder's engine, model, and effort. The worker applies that fix and produces the real artifacts; it does not rebuild. Count it in `remediations`, not `attempts`.
3. Re-verify with a fresh Verifier and branch again. A remediation that halts (the fix needed a redesign) or fails takes the blunt path.

**Everything else** (`fix: large`, missing verdict fields, a builder `outcome: failed`, remediations used up): the blunt path:
1. Preserve debris: `git diff > ticket-NN.attempt-K.debris.patch` (plus untracked file list), then `git reset --hard` + clean to the last Ticket Commit. Set the ticket's `Status: in-progress` again (the reset reverted it).
2. Amend the brief with the concrete evidence (failing verdict rows, builder errors). Mechanical amendment only, never ticket or spec changes.
3. Dispatch a **fresh** builder. Builder attempts exhausted: escalate.

### 5. Review (once, after the frontier is empty)

The frontier is empty when no `ready-for-agent` or `in-progress` ticket is runnable. Run the review exactly once per Run, never mid-run (unbuilt tickets read as failures and trigger rework loops).

1. Manifest status: `reviewing`. Compile `templates/review-brief.md` and dispatch with `reviewer_engine`, `reviewer_model`, `reviewer_effort`. The reviewer runs `two-axis-review` against `base_commit`, writes `.foreman/runs/<id>/review.md`, and files actionable findings as new `needs-triage` tickets. It never edits code.
2. Reviewer crashed (no `review.md`): re-dispatch once, then note it in the handoff and continue to Complete. A missing review never blocks completion, but it is always reported.
3. If it filed tickets: commit them, `foreman: review findings`. Do not run them: `needs-triage` is the Operator's call. No fix loop.

### 6. Escalate / pause / complete

- **Escalate** (Halt, exhausted retries, double verifier crash): manifest to `escalated`, notify the Operator via the configured escalation channel with ticket, reason, one-paragraph summary, and what you need from them. Escalation routing is configured per install (`project-templates/foreman.config.example.json`): if a chat or push channel is configured, use it; **always also print the escalation in chat** so it is never lost. Then wait. Their fix usually amends the ticket (or the spec): re-dispatch with a new brief. **Tree keep-or-reset is the Operator's call, made in the escalation exchange**: recommend *keep* when their amendment merely clarifies the ticket (the halted work is sound, just blocked), *reset* when it changes the design the work was built against. Either way, snapshot a debris patch first. A keep means the new brief must describe the existing tree state explicitly: what's built, what's untested, what remains.
- **Chat controls** at any time: `status` (answer from manifest), `stop after NN`, `abort` (kill dispatch process, preserve debris, reset tree to last Ticket Commit, manifest to `aborted`, release lock).
- **Complete**: manifest to `complete`, release lock. Notify the Operator via the escalation channel. Print the batch-review handoff:
  - per-ticket one-liners (status, attempts)
  - tickets left unrun and why (blocked by a `needs-triage` / `ready-for-human` ticket, escalated)
  - all deferred `manual:` steps, aggregated
  - review: findings per axis, worst per axis, path to `review.md`, the `needs-triage` tickets it filed
  - review commands: `git log --author=Foreman --oneline`, per-ticket diffs
  - reminder: merging the Run Branch to `main` is their acceptance signature and the moment the `ready-for-review` tickets become `done`
  - suggestion: `/retro` on `.foreman/runs/<id>/`

## Never

- Never set a ticket `done`, never merge, never push, never touch `main`
- Never read a worker's log file: Result Files, verdicts, and the review report only
- Never build, execute test steps, or review code yourself
- Never retry a Halt; never treat a missing verdict as a pass
- Never run the review mid-run, never run it twice, never auto-fix its findings
- Never commit as the Operator: Foreman identity only, Run Branch only
- Never dispatch with a dirty tree or a broken ticket graph
- Never run two Runs in the same Target Project
