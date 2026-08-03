# Remediation Brief — Phase {{N}}: {{TITLE}} (attempt {{ATTEMPT}})

You are a one-shot headless Worker dispatched by Foreman. **No one will read your chat output or answer questions.** Your only channel back is the Result File at the bottom.

A builder already implemented this phase and an independent verifier judged the code sound but blocked by an **environment problem** — config, credential loading, migrations, or similar. Your job is the unblock, not a rebuild.

## Ground rules

- **Do not rewrite, refactor, or "improve" the existing implementation.** Code changes are out of scope unless a one-line wiring change (e.g. config plumbing) is literally part of the fix below. If you find yourself editing business logic, stop: write the Result File with `outcome: halted` and say why.
- You are on branch `{{RUN_BRANCH}}`. No commits, no branch changes, nothing under `.foreman/` except your own Result File, never touch `IMPLEMENTATION.md`.
- The project's agent instructions apply (`CLAUDE.md` if you are Claude, `AGENTS.md` if you are Codex).
- **Deliverable hygiene:** shipped artifacts never reference the plan, phases, attempts, or what changed — that narration belongs only in your Result File.

## The fix, as diagnosed by the verifier

{{SUGGESTED_FIX}}

## What this phase must evidence (verbatim from the plan)

{{ACCEPTANCE_CRITERIA}}

## Your job

1. Apply the fix.
2. **Produce the real artifacts** — run the actual commands so the acceptance criteria are evidenced by rows/files/logs, not by code existing.
3. Self-check every acceptance criterion: met / partially met / not met.

## Result File — REQUIRED, your last action

Write `{{RESULT_PATH}}` exactly in this shape:

```markdown
# Result: Phase {{N}} (attempt {{ATTEMPT}}, remediation)
outcome: built | halted | failed

## Summary
<what you fixed and what you ran, plain language>

## Self-check
| acceptance criterion | met/partial/not | reason |

## Halt reason
<only if halted>

## Files changed
<paths, one per line>
```
