---
name: execute-ticket
description: Build one ticket from .scratch/<feature>/issues/ end to end without stopping, then gate done on the user walking the test steps. Use when the user wants to work on "ticket N", "the next ticket", or finish an in-flight ticket by hand instead of through foreman.
---

# Execute Ticket

Build one ticket in this session. Foreman is the unattended way to run a whole folder; this is the hands-on way to run one ticket. The ticket was agreed when it was written: don't ask to confirm it again. The only stops are a Halt and the hand-off.

## Process

### 1. Load the ticket

Resolve the reference to a file under `.scratch/<feature>/issues/` (`03`, `#03`, or a path). If no ticket is named, take the frontier: the lowest-numbered `ready-for-agent` ticket whose blockers are all `ready-for-review` or `done`. If two features both have a matching number, ask which.

State the ticket's title before anything else, so a wrong match is obvious.

Read the ticket in full, then `.scratch/<feature>/spec.md`: its **Implementation decisions** and **Seams** are binding. The ticket's *What to build*, *Acceptance criteria*, and *How to test as the user* are the scope. `TDD:` is already decided in the ticket. Nothing else in the conversation overrides them without an explicit pivot.

If a blocker is still `ready-for-agent`, `in-progress`, or `needs-triage`, its code doesn't exist yet: stop and say which.

Set the ticket's `Status:` to `in-progress`.

### 2. Research, only if needed

Skip this when the ticket's area is already familiar from this session. Otherwise, before writing code, find out what the ticket needs: the files and patterns it touches, the call sites of anything it changes, and the docs of any library or API it uses that you don't know cold. Use an exploration subagent when the search is wide, so the main context keeps the conclusions, not the file dumps.

Research informs how you build; it never changes the scope. If it shows the ticket or spec can't be followed as written, that's a Halt.

Feel free to use subagents here so you save context for building

### 3. Build the vertical slice

If `TDD: yes`, follow the `tdd` skill at the spec's seams. Otherwise implement directly.

Halt and surface, never work around:

- **A spec implementation decision must break.** Don't silently rework schema, routes, interfaces, or pipeline order.
- **An acceptance criterion can't be met as written.** Don't silently trim it.

Pivots the user approves are written into the ticket under a `## Changes` heading, dated, one line each.

### 4. Self-check

Walk each acceptance criterion: met / partially met / not met, with a one-line reason. Run the test suite. Anything not met and fixable: fix it now. Anything not met and not fixable: Halt.

### 5. Hand off

Set `Status: ready-for-review`. Print the self-check and the *How to test as the user* steps verbatim. Wait for the user to walk them.

### 6. Done

Only on the user's explicit confirmation that the steps passed: tick the acceptance boxes and set `Status: done`. Commit only if they ask.

## Never

- Ask the user to re-confirm the ticket's scope, TDD flag, or seams before building
- Set `done` without the user confirming they walked the test steps
- Break a spec implementation decision without surfacing it first
- Trim or reinterpret acceptance criteria silently
