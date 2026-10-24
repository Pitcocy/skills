---
name: two-axis-review
description: "Review the diff since a fixed point on two separate axes: Standards (this repo's documented standards plus a code-smell baseline) and Spec (does it match .scratch/<feature>/spec.md and its tickets). Complements the built-in /code-review, which hunts bugs."
disable-model-invocation: true
---

# Two-Axis Review

Review the diff between `HEAD` and a fixed point on two axes, in two parallel sub-agents so neither pollutes the other:

- **Standards**: does the code follow this repo's documented standards?
- **Spec**: does the code do what the spec and tickets asked, and nothing else?

A change can pass one and fail the other. Reporting them apart stops one axis from masking the other.

## Process

### 1. Pin the fixed point

Use what the user gave (SHA, branch, tag, `main`, `HEAD~5`). If nothing was given, use `main` and say so.

Confirm it resolves (`git rev-parse <fixed-point>`) and that `git diff <fixed-point>...HEAD` is non-empty. Three dots: compare against the merge-base. Fail here on a bad ref or empty diff, not inside two sub-agents. Note the commit list: `git log <fixed-point>..HEAD --oneline`.

Uncommitted changes are invisible to this diff. If the tree is dirty, say so and ask whether to review a commit first.

### 2. Find the spec

In order:

1. A path the user passed.
2. `.scratch/<feature>/spec.md` where `<feature>` matches the branch name (`foreman/<feature>-<date>` or similar), or ticket numbers in commit messages (`foreman: #03 ...`).
3. Ask the user. If there is none, the Spec axis is skipped and the report says "no spec available".

Collect the spec plus every ticket file in that feature's `issues/` folder.

### 3. Find the standards

Every file that documents how code should be written here: `CLAUDE.md`, `AGENTS.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, any standards docs they point to, and any global agent rules (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`). Skip anything the repo's linter or typechecker already enforces.

On top, the Standards axis always carries the **smell baseline** (Fowler, *Refactoring* ch. 3). Two rules bind it: a documented repo standard always wins, and every smell is a judgement call ("possible Feature Envy"), never a hard violation.

- **Mysterious Name**: a name that doesn't reveal what it does or holds. → rename; if no honest name comes, the design is murky.
- **Duplicated Code**: the same logic shape in more than one hunk or file. → extract the shared shape.
- **Feature Envy**: a method that uses another object's data more than its own. → move it to the data.
- **Data Clumps**: the same few fields or params always travel together. → bundle them into one type.
- **Primitive Obsession**: a string or number standing in for a domain concept. → give the concept its own small type.
- **Repeated Switches**: the same switch or if-cascade on the same type in several places. → polymorphism, or one shared map.
- **Shotgun Surgery**: one logical change forces scattered edits across many files. → gather what changes together.
- **Divergent Change**: one module edited for several unrelated reasons. → split it.
- **Speculative Generality**: abstraction, params, or hooks the spec doesn't need. → delete, inline back.
- **Message Chains**: long `a.b().c().d()` navigation. → hide the walk behind one method.
- **Middle Man**: a class or function that mostly delegates. → call the real target.
- **Refused Bequest**: a subclass that ignores most of what it inherits. → composition instead.

### 4. Run both sub-agents in parallel

Issue both calls together, in the foreground.

**Standards sub-agent** gets: the diff command, the commit list, the standards file paths, the smell baseline above pasted in full, and this brief: "Report per file/hunk (a) every breach of a documented standard, citing file and rule, and (b) any baseline smell, named, with the hunk quoted. Separate hard violations from judgement calls; smells are always judgement calls and a repo standard overrides them. Skip what tooling enforces. Under 400 words."

**Spec sub-agent** gets: the diff command, the commit list, the spec and ticket paths, and this brief: "Report (a) requirements in the spec or tickets that are missing or partial, (b) behavior in the diff nobody asked for (scope creep), (c) requirements that look implemented but wrong, and (d) tests written at a seam the spec's Seams section doesn't list. Quote the spec or ticket line for each finding. Under 400 words."

No spec: skip the Spec sub-agent.

### 5. Report

Show the two reports under `## Standards` and `## Spec`, verbatim or lightly cleaned. Don't merge or rerank across axes.

End with one line: findings per axis, and the worst finding within each axis. Don't crown a single winner across axes.

Fix nothing. The user decides what becomes a ticket.
