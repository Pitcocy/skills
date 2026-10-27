---
name: to-tickets
description: "Break a spec (or the current conversation) into tracer-bullet ticket files under .scratch/<feature>/issues/, each with blocking edges and the fields foreman needs."
disable-model-invocation: true
---

# To Tickets

Break the work into **tickets**: tracer-bullet vertical slices, one file each, each declaring the tickets that **block** it. The output is Autonomous-Ready by construction: foreman runs it without a pre-flight backfill, and `execute-ticket` runs any single ticket.

Use it when the build spans several sessions. If the whole change fits in one context window, skip this and build directly.

## Process

### 1. Gather context

Work from the conversation. If the user passed a path (usually `.scratch/<feature>/spec.md`), read it in full. The feature folder is the spec's folder; without a spec, pick a kebab-case slug.

If `.scratch/<feature>/issues/` already has tickets, continue numbering after the highest one and never rewrite existing files.

### 2. Explore the codebase

If you haven't yet, explore the area you're touching. Use the vocabulary in `CONTEXT.md`, respect ADRs in `docs/adr/`.

Look for **prefactoring**: "make the change easy, then make the easy change." Prefactor tickets go first.

### 3. Draft vertical slices

<vertical-slice-rules>

- Each ticket cuts a narrow but COMPLETE path through every layer it needs (schema, API, UI, tests). Vertical, never one layer at a time.
- Each ticket is demoable or verifiable on its own. If you can't fill its **Demo** line with behavior, it's a horizontal slice: merge or re-cut it.
- Each ticket fits one fresh context window.
- Each acceptance criterion would be false at the commit the builder starts from, and is satisfied by this ticket's own work, not another ticket's.
- Prefactoring comes first.

</vertical-slice-rules>

Give each ticket its **blocking edges**: the tickets that must finish before it can start. A ticket with no blockers can start immediately. Number tickets blockers-first, so a blocker always has the lower number.

**Wide refactors are the exception.** One mechanical change (rename a column, retype a shared symbol) whose **blast radius** breaks call sites across the codebase can't land as a green vertical slice. Sequence it as **expand–contract**: expand (add the new form beside the old), then migrate call sites in batches sized by blast radius (one ticket per batch, each blocked by the expand), then contract (delete the old form, blocked by every batch).

Fill the run fields per ticket:

- **TDD**: `yes` when the ticket adds behavior at a seam from the spec; `no` for scaffolding, config, infra, or copy changes.
- **Gate**: add `human` only where the user must look before work continues (a visible UX call, anything that spends money or touches production). Most tickets have no gate.
- **Engine**: only if this ticket must run on a specific engine; usually omitted.
- **How to test as the user**: concrete steps the user (or the foreman verifier) can walk. Prefix with `manual:` any step only a human can do (visual judgement, a real login, a paid API call). The verifier skips `manual:` steps and defers them to the user. When the ticket is about speed or size, the steps and the acceptance criteria name the **worst case**: the exact record that holds most of the data (the campaign with most of the items, the biggest file), opened on every screen the ticket touches, never "a few".

### 4. Quiz the user

Show the breakdown as a numbered list. Per ticket: **title**, **blocked by**, **demo** (one line), **TDD**, **gate** if any. Then ask:

- Granularity right? Too coarse, too fine?
- Are the blocking edges real: does each ticket depend only on tickets that truly gate it?
- Anything to merge or split?

Over-splitting is the usual failure: twelve tickets for a three-line change. Prefer fewer, fuller tickets. Iterate until the user approves. Write nothing before approval.

### 5. Write the tickets

One file per ticket: `.scratch/<feature>/issues/<NN>-<slug>.md`, `NN` zero-padded from `01` (or after the highest existing number). Use the template below. Never put several tickets in one file.

No file paths or code snippets in ticket bodies. Exception: a prototype snippet that pins a decision; inline the decision-rich part and say it came from a prototype.

Finish by printing the list of files and the frontier (tickets with no blockers). Remind the user: run the folder with foreman, or one ticket at a time with `/execute-ticket <NN>`.

<ticket-template>

# <NN>: <Ticket title>

**Status:** ready-for-agent
**Blocked by:** None
**TDD:** yes
**Gate:** human
**Engine:** codex

## What to build

The end-to-end behavior this ticket makes work, from the user's perspective. Not a layer-by-layer list.

## Demo

What the user can see working when this lands.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## How to test as the user

1. Step
2. manual: step only a human can do

</ticket-template>

Template notes: `Blocked by:` lists ticket numbers (`01, 03`) or `None`. Drop the `Gate:` and `Engine:` lines when they don't apply. Tickets filed by a foreman review also carry a `Source:` line.

## Statuses

`ready-for-agent` → `in-progress` → `ready-for-review` → `done`. Foreman moves tickets up to `ready-for-review`. Only the user makes a ticket `done`: by confirming the test steps in `execute-ticket`, or by merging a foreman Run Branch. `needs-triage` marks a ticket filed by a review that the user hasn't accepted yet; `wontfix` closes one they rejected.
