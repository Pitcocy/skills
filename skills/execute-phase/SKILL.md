---
name: execute-phase
description: Execute the next phase from the tracer-bullet plan — pick the phase, lock scope, build the vertical slice, and gate ✅ on user-side verification. Use when the user wants to start a phase, work on "next phase", "phase N", finish an in-flight phase, or mentions "execute the plan".
---

# Execute Phase

State-machine wrapper around one phase from `plans/<feature>-plan.md`.

## Process

### 1. Load the phase spec

Read the `## Phase N — <Title>` section of the plan file in full: user stories, *What to build*, *Acceptance criteria*, *How to test as the user*. These four are the spec — nothing else in the conversation overrides them without an explicit pivot.

### 2. Lock scope before touching code

Show the user:

- Phase title and user-story references
- Acceptance criteria, verbatim
- Whether TDD applies this phase — some phases are scaffolding/config/infra where tests come after, not before

Ask what's changed since the plan was written and whether to trim. Ask whether TDD applies; if yes, the build step follows the `tdd` skill. Do not edit code until the user confirms.


### 3. Build the vertical slice

If the user confirmed TDD applies, follow the `tdd` skill. Otherwise implement directly.

Halt conditions during build:

- **Architectural deviation required.** Architectural decisions in `plans/<feature>-plan.md` are fixed (per `CLAUDE.md/AGENTS.md`). If implementation genuinely forces a deviation, stop and surface — do not silently rework schema, pipeline order, gate precedence, or the identity model.
- **Acceptance criterion can't be met as written.** Stop and surface — do not silently trim.

### 4. Self-check against acceptance criteria

Walk each acceptance criterion. For each, state: met / partially met / not met, with a one-line reason. If any are not met, do not proceed to handoff.

### 5. Hand off for user-side verification

Print the *How to test as the user* steps from the plan, verbatim. ✅ is only valid after the user has walked these steps — this skill never self-promotes.

Wait for explicit confirmation. "Ready for review" is not the same as ✅.

### 6. Flip to done

Only on explicit user confirmation that user-side verification passed. If any partial-verify pivot happened, the Change Log already records it.

## Never

- Flip `✅` without explicit user confirmation that the user walked the *How to test as the user* steps
- Change an architectural decision mid-build without surfacing and resolving first
- Trim or reinterpret acceptance criteria silently — pivots are loud, in the Change Log
