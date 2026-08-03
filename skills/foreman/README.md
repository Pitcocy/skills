# Foreman

**Foreman is a local orchestrator that runs a tracer-bullet plan autonomously.** You point it at a project that follows a simple convention (`CLAUDE.md`, `plans/`, `IMPLEMENTATION.md`), and it works the plan phase by phase: it dispatches a one-shot headless Worker to build each phase, dispatches an independent Verifier to walk the "how to test as the user" steps, commits a checkpoint to a run branch when a phase passes, and only interrupts you on exceptions — a Halt, exhausted retries, or a phase explicitly gated for a human.

You stay the judge. Foreman never marks a phase done (✅), never merges, and never touches `main`. Its ceiling is **Ready-for-Review**: a passing verdict on disk and a checkpoint commit you review and merge yourself.

> ⚠️ **Foreman runs agents with permissions bypassed** (`claude -p --dangerously-skip-permissions` / `codex exec --dangerously-bypass-approvals-and-sandbox`) so Workers can build unattended. Only run it on a project you trust, in a git repo with a clean tree, and read [Safety](#safety) before your first run.

---

## How it works

```
Orchestrator (you, running /foreman)
   │  pre-flights the plan, then per phase:
   ├─► Builder Worker      one-shot `claude -p` or `codex exec`  → writes a Result File
   ├─► Verifier Worker     independent `claude -p`               → writes a pass/fail Verdict
   └─► on pass: commit checkpoint to  foreman/<plan>-<date>  branch  (never main)
       on Halt / exhausted retries / gate:human → escalate to you, wait
```

- **Workers are one-shot and headless.** They get a self-contained Phase Brief, build, and write a structured Result File. They can't ask questions — if the plan can't be followed, they *Halt* loudly.
- **Verification is independent.** A separate agent that didn't write the code walks the test steps and leaves a verdict on disk. No verdict is never a pass.
- **Every checkpoint is a real git commit** authored as `Foreman <foreman@local>`, on a run branch, so you can review commit-by-commit and merge yourself.
- **Run state lives in the target project** under `.foreman/runs/<run-id>/` (gitignored). A Run survives the Orchestrator dying — a new session resumes from the manifest.

## What's in the box

| Skill | Role |
|-------|------|
| `foreman` | **Foreman core** — runs a plan autonomously (the loop above). |
| `prd-to-plan` | Turn a PRD into a phased tracer-bullet plan in `plans/`. |
| `write-a-prd` | Produce a PRD through structured discovery. |
| `execute-phase` | Run a single phase interactively (the non-autonomous path). |
| `grill-with-docs` | Stress-test a plan against your domain model and update docs. |
| `prototype` | Build a throwaway prototype to settle a design question. |
| `tdd` | Red-green-refactor loop for a phase. |

The authoring skills produce the convention that `foreman` consumes — together they're the whole loop from idea → plan → autonomous build.

## Requirements

- **[Claude Code](https://claude.com/claude-code)** ≥ 2.1, logged into your own subscription.
- **[`codex`](https://github.com/openai/codex) CLI** ≥ 0.138, logged in — only if you want Codex as a build engine. The Verifier always runs on `claude`, so Claude Code is required regardless.
- **`git`**.
- Optionally, a Discord channel wired into your Claude Code, if you want escalations pinged to your phone (see [Configuration](#configuration)).

## Install

```
npx skills@latest add Pitcocy/skills
```

This uses the [`skills`](https://github.com/vercel-labs/skills) CLI to pick which of the skills to install, project-level or global (`-g`). To grab everything non-interactively:

```
npx skills@latest add Pitcocy/skills --all
```

Update later with `npx skills update`. The skills become available as `/foreman`, `/prd-to-plan`, etc.

## The target-project convention

Foreman orchestrates *your* project, which must carry three things:

- **`CLAUDE.md`** (and/or `AGENTS.md` for Codex Workers) — the project's agent instructions.
- **`plans/`** — one or more tracer-bullet plan files. Each remaining phase needs *Acceptance criteria*, *How to test as the user* steps, a `TDD: yes/no` marker, and an explicit `gate: human` where a human must sign off. The `prd-to-plan` skill writes plans in exactly this shape.
- **`IMPLEMENTATION.md`** — a status tracker whose phase numbers and titles agree with the plan.

If a plan is missing those markers, Foreman's pre-flight stops and resolves them with you in one batch before any Worker fires — it never invents answers.

## Configuration

Everything Foreman needs to bootstrap a target project ships inside this skill, under
[`project-templates/`](project-templates/):

| File | What to do with it |
|------|--------------------|
| `foreman.config.example.json` | Copy to `foreman.config.json` in the target project (gitignore it) and fill in your own values. Every field is optional. With no config at all, Foreman prints escalations in the chat session only. |
| `CLAUDE-Template.md` | Starting point for a target project's `CLAUDE.md`, if it does not have one yet. |
| `IMPLEMENTATION-Template.md` | Starting point for the `IMPLEMENTATION.md` status tracker Foreman reads. |

The only thing the config currently controls is **escalation routing**: where Foreman
reaches you on a Halt, a `gate: human` phase, exhausted retries, or completion. Set
`escalation.channel` to `chat` (session only) or `discord` (also ping a channel, which
needs the Discord integration wired into your Claude Code), and fill in
`discord_channel_id` plus an optional `discord_dm_channel_id` fallback. Foreman always
prints the escalation in chat regardless, so this is an enhancement, never a
requirement.

### Model and effort overrides

Builders and Verifiers both run on the latest Claude model by default. Override per run
with environment variables:

| Variable | Effect |
|---|---|
| `FOREMAN_CLAUDE_MODEL` | Model for claude Workers and the Verifier. |
| `FOREMAN_CLAUDE_EFFORT` | Reasoning effort for claude Workers. |
| `FOREMAN_CODEX_MODEL` | Model for codex Workers. |
| `FOREMAN_CODEX_EFFORT` | Reasoning effort for codex Workers. |

## Usage

From inside (or pointing at) your target project:

```
/foreman
```

Then tell it the target path and the build **Engine** (`claude` or `codex` — required, no default). Foreman pre-flights, then runs. While it works:

- `status` — where the run is, answered from the manifest.
- `stop after 4` — finish phase 4, then pause.
- `abort` — kill the current Worker, preserve debris, reset to the last checkpoint, release the lock.

Live-watch any Worker with the `tail -f` command Foreman prints when it dispatches.

On completion you get a batch-review handoff: per-phase one-liners, the deferred `manual:` steps to walk yourself, and `git log --author=Foreman --oneline` to review the checkpoints. **Marking ✅ and merging to `main` are yours** — the merge commit is your acceptance signature.


## Credits & license

Foreman is MIT licensed — see [`LICENSE`](../../LICENSE).

The `grill-with-docs`, `prototype`, `write-a-prd`, `prd-to-plan` and `tdd` skills are **adapted from [Matt Pocock's skills collection](https://github.com/mattpocock/skills)** (MIT), modified to fit Foreman's tracer-bullet convention. His license is preserved in [`THIRD_PARTY_LICENSES/`](../../THIRD_PARTY_LICENSES/). Thanks to Matt for publishing them freely.
