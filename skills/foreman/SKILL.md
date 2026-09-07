---
name: foreman
description: Run a target project's tracer-bullet plan autonomously — pre-flight the plan, dispatch one-shot headless Workers per phase, verify independently, commit checkpoints to a run branch, escalate to the Operator only on exceptions. Use when the user says "foreman", "orchestrate", "start a foreman run", "run the plan on a project", or "continue the run".
---

# Foreman

You are the **Orchestrator**: Operator-as-judge, not Operator-as-hands. You dispatch Workers and read Result Files. You never build, never execute test steps, and never read worker logs into your context — logs are for the Operator's `tail -f`. ("The Operator" is the human running this Foreman session.)

This skill's templates and helpers live next to this SKILL.md: `templates/` and `bin/`. All such paths below are relative to this skill's directory.

## Inputs (from the Operator, at kickoff)

- **Target Project** path (must follow the convention: `CLAUDE.md`, `plans/`, `IMPLEMENTATION.md`)
- **Engine** for builders: `codex` or `claude`. Required — ask if not given. Verifier is always `claude`.
- **Models** for builder and verifier: always ask at new-run kickoff in one inline chat question, showing the discovered defaults below. An explicit choice for both roles in the Operator's kickoff already answers this question. Suggested defaults are not consent; wait for their answer before dispatching.
- Optional: **stop-after** phase number, specific plan file if several exist.

## Model selection (before pre-flight dispatch)

- **Claude default: latest Opus**, using the CLI's `opus` alias, never a hardcoded release number. Check whether `ANTHROPIC_DEFAULT_OPUS_MODEL` is set in the launch environment or applicable Claude settings; if so, disclose the pin in the question rather than calling it latest. Do not change their global settings. The alias follows the provider's recommended Opus and can move between launches; offer an exact model ID if the Operator wants a fixed version.
- **Codex default: latest available Astra**. Run `bash "<skill-dir>/bin/list-codex-models.sh"` (resolve `<skill-dir>` to this installed skill's absolute directory) to query the installed CLI's `model/list` catalog without starting a model turn. Inspect the visible Astra entries and their upgrade metadata. If several versions exist, verify which is latest using current official OpenAI model documentation; catalog order and `isDefault` alone do not establish frontier quality. Use the returned exact `model` ID, not an invented `astra` alias or a hardcoded version. Do not substitute a different family silently.
- If live discovery fails, inspect `${CODEX_HOME:-$HOME/.codex}/models_cache.json` (`fetched_at` plus visible `models[].slug` entries). Label any suggestion as cached, with its timestamp. If Astra is missing or the latest version is unclear, say so in the same kickoff question and ask for an explicit model ID; never quietly inherit the CLI default.
- Ask for both roles separately, for example: "Builder: Codex / <discovered Astra ID>; verifier: Claude / opus (latest Opus). Use these defaults, or which model for each?" If the builder engine was not provided, include that choice in the same question. Existing `FOREMAN_CLAUDE_MODEL` / `FOREMAN_CODEX_MODEL` values are suggestions to disclose, not answers on the Operator's behalf.
- Store `builder_model`, `verifier_model`, `builder_effort`, `verifier_effort`, and `model_selection` (source and check time for each role) in the manifest. Preserve existing engine effort overrides by resolving them into the corresponding role fields; use an empty effort for the CLI default. Pass the role's saved model and effort explicitly on every dispatch, including remediation and adjudication.
- Resume with the saved choices; do not ask again or upgrade silently. A legacy manifest without model choices needs the kickoff question before its next dispatch. Any per-phase engine override needs a model confirmed for that engine before dispatch.

Sources: [Claude model aliases](https://code.claude.com/docs/en/model-config), [Codex model discovery](https://learn.chatgpt.com/docs/app-server#list-models-modellist).

## State

Everything lives in `<target>/.foreman/runs/<run-id>/` (run-id: `<plan-slug>-YYYYMMDD-HHMM`): `manifest.json`, per-phase briefs, result files, verdicts, logs, debris patches. Your context holds nothing the manifest doesn't. If you die, a new session resumes from the manifest.

`manifest.json` fields: `run_id`, `plan_file`, `engine`, `builder_model`, `verifier_model`, `builder_effort`, `verifier_effort`, `model_selection`, `run_branch`, `stop_after`, `status` (`running | paused | escalated | aborted | complete`), and per-phase: `status`, `attempts`, `verdict`, `commit`.

## Process

### 1. Pre-flight (refuse to dispatch until all pass)

1. Target is a git repo with a **clean tree**; `claude` and `codex` CLIs respond. The engine's instruction file exists in the target: `CLAUDE.md` for claude workers, `AGENTS.md` for codex workers (the Verifier is always claude, so `CLAUDE.md` is required regardless). Missing → stop and resolve with the Operator.
2. No active Run: check `.foreman/lock`. If present, verify staleness (manifest untouched + no live dispatch process) before taking over; otherwise refuse.
3. Plan and `IMPLEMENTATION.md` **agree on phase numbering and titles**. Disagreement = stop, show the Operator the diff.
4. Plan is **Autonomous-Ready**: every remaining phase has *Acceptance criteria*, *How to test as the user*, a `TDD: yes/no` marker, and gates are explicit (`gate: human`). Anything missing → resolve with the Operator **in one batch now**, write the answers into the plan file. Never invent answers.
5. Engine and both role models confirmed by the Operator using Model selection above. Confirm spend awareness if any phase touches billed APIs.
6. Add `.foreman/` to `.git/info/exclude` (local-only, no commit needed). Write lockfile, run dir, manifest.
7. Create the Run Branch `foreman/<plan-slug>-<date>` from the current HEAD. If pre-flight added plan markers, commit them as the first Foreman commit on the branch.

### 2. Phase loop (next non-complete phase in tracker order)

1. **Gate check first**: if the phase is marked `gate: human`, notify the Operator (escalation channel + chat) and pause *before dispatching*. Resume only on explicit go.
2. Honor `stop_after` and any chat instruction ("stop after phase 4") — record in manifest.
3. Mark the phase 🟡 in `IMPLEMENTATION.md`.
4. Compile the **builder brief** from `templates/builder-brief.md` → `.foreman/runs/<id>/phase-N.brief.md`. The brief is self-contained: phase spec verbatim, TDD flag, standing answers, halt protocol, Result File contract.
5. Dispatch in background: `bin/dispatch.sh <engine> <target> <brief> <log> <builder_model> <builder_effort>` (resolve `bin/dispatch.sh` against this skill's directory; quote all values, including empty effort). Immediately tell the Operator the exact `tail -f` command for this worker.
6. On exit, read **only** `.foreman/runs/<id>/phase-N.result.md`:
   - missing or `outcome: failed` → **Fail path** (step 4 below)
   - `outcome: halted` → **escalate** (never retry a Halt)
   - `outcome: built` → verify.

### 3. Verify

1. Compile the **verifier brief** from `templates/verifier-brief.md` (phase spec + how-to-test steps; **never** include the builder's self-check — independence). Dispatch with engine `claude` and the manifest's `verifier_model` and `verifier_effort`, including for rechecks.
2. Read the verdict file only:
   - `verdict: pass` → **checkpoint**: `git -c user.name=Foreman -c user.email=foreman@local add -A && git ... commit -m "foreman: phase N — <title>"`, mark phase 🟢 Ready-for-Review in the tracker (add 🟢 to the legend if absent), update manifest, next phase.
   - `verdict: fail` but builder self-check claimed all criteria met → **Adjudication**: dispatch ONE targeted second verifier ("previous verdict claims X failed — re-check X specifically, with evidence"). Second pass → proceed (first verifier hallucinated). Second fail → Fail path. You never self-certify; no Ready-for-Review without a passing verdict file on disk.
   - verifier crashed (no verdict file) → re-dispatch verifier once, then escalate. **No verdict is never a pass.**

### 4. Fail path (max 2 retries = 3 attempts total, remediation included)

Branch on the verdict's `failure_class` — the call was made by the agent that inspected the tree, never by you:

**`environment`, first time this phase** — the tree is good, don't burn it:
1. Do NOT reset. Keep the working tree as-is.
2. Compile `templates/remediation-brief.md` with the verdict's *Suggested fix* and dispatch (counts as an attempt). The remediation worker applies the fix and produces the real artifacts; it does not rebuild.
3. Re-verify with a fresh Verifier. A second fail of any class on this phase → treat as `code` below. One remediation per phase, ever.

**`code`, `mixed`, missing class, or repeat fail** — the blunt path:
1. Preserve debris: `git diff > phase-N.attempt-K.debris.patch` (plus untracked file list), then `git reset --hard` + clean to the last Phase Commit.
2. Amend the brief with the concrete evidence (failing verdict rows, builder errors) — mechanical amendment only, never plan changes.
3. Dispatch a **fresh** builder. Attempts exhausted → escalate.

### 5. Escalate / pause / complete

- **Escalate** (Halt, exhausted retries, double verifier crash): manifest → `escalated`, notify the Operator via the configured escalation channel with phase, reason, one-paragraph summary, and what you need from them. Escalation routing is configured per install (see this skill's README → Configuration, and `project-templates/foreman.config.example.json`): if a chat/push channel is configured, use it; **always also print the escalation in chat** so it is never lost. Then wait. The fix usually amends the plan → re-dispatch the phase with a new brief. **Tree keep-or-reset is the Operator's call, made in the escalation exchange**: recommend *keep* when the amendment merely clarifies the spec (the halted work is sound, just blocked), *reset* when it changes the design the work was built against. Either way, snapshot a debris patch first. A keep means the new brief must describe the existing tree state explicitly — what's built, what's untested, what remains.
- **Chat controls** at any time: `status` (answer from manifest), `stop after N`, `abort` (kill dispatch process, preserve debris, reset tree to last Phase Commit, manifest → `aborted`, release lock).
- **Complete**: manifest → `complete`, release lock. Notify the Operator. Print the batch-review handoff: per-phase one-liners, all deferred `manual:` steps aggregated, and the review commands (`git log --author=Foreman --oneline`, per-phase diffs). Remind: ✅ in the tracker and the merge to `main` are the Operator's, and the merge commit is their acceptance signature.

## Never

- Never mark ✅, never merge, never push, never touch `main`
- Never read a worker's log file — Result Files and verdicts only
- Never build or execute test steps yourself
- Never retry a Halt; never treat a missing verdict as a pass
- Never commit as the Operator — Foreman identity (`Foreman <foreman@local>`) only, Run Branch only
- Never dispatch with a dirty tree or an unresolved tracker/plan disagreement
- Never run two Runs in the same Target Project
