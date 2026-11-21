---
name: pr
description: "Merge note for a foreman run or any branch: Summary visual, before/after Evidence, and Merge Danger (one-way or two-way door, blast radius). Run after the review, before the merge. The same body serves as a PR description."
disable-model-invocation: true
---

# PR

Writes the body the user reads before merging: what changed, proof it works, how risky it is to land. It does not push, open a PR, or merge.

## 1. Pin the diff

- With a run id or a `.foreman/runs/<id>/` path: read `manifest.json`, take `base_commit`, `run_branch`, `spec_file`. Diff is `git diff <base_commit>...<run_branch>`.
- With a branch or fixed point: diff is `git diff <fixed-point>...HEAD`.
- With nothing: the newest folder in `./.foreman/runs/`. Say which one you took.

Fail here if the ref does not resolve or the diff is empty.

## 2. Read before writing

- The spec and the tickets the run covered (`.scratch/<feature>/`), not only the diff: reversibility often hides outside the code.
- On a run: the verdict files and `review.md` in the run dir. Evidence comes from verdicts, never from builder result files.
- The repo's **one-way list**: a `## One-way doors` section in the root `CLAUDE.md` (or `AGENTS.md`). Anything on it that the diff touches is a one-way door, whatever else you think. No list: say so in Merge Danger.
- `CONTEXT.md` (or `CONTEXT-MAP.md`) for the project's domain language.

## 3. Write the body

```markdown
## Summary

<diagram, diff-sketch, or tree>

## Evidence

- **Before:** <screenshot/output/failing test run>
  **After:** <screenshot/output/passing test run>

## Merge Danger

**Door:** <one-way or two-way>

<optional: description>

**Blast Radius:** <one-word description>

<optional: potential ramifications of merge>
```

Skip all preambles and keep prose brief. Use the domain language from `CONTEXT.md`.

### Summary

Pick the smallest view that makes the key point clear:

- logic or an algorithm as pseudocode
- runtime control flow as a call tree
- UI structure as a component tree, with the state and module boundaries that matter
- file responsibility or a broad refactor as a shallow file tree
- component interaction or data flow as Mermaid
- a `diff` block shaped like the topic (component tree, file tree, call tree, control flow) when the point is what changes and the surrounding shape already exists
- the whole block when most of it is new or the reader needs a copyable target shape

Place each visual next to the short text it supports. Keep only the calls, files, props, states, and boundaries needed to make the point. One view usually, several sometimes, all of them almost never.

### Evidence

A before and an after, not a claim. Screenshots are the strongest evidence when the change is visual and the environment can take one. Otherwise execution: the exact test that failed and now passes (as pseudocode), or the console output that changed. "Tests are green" alone is a claim. Steps a verifier deferred as `manual:` are listed as unproven.

### Merge Danger

A two-way door can be walked back; a one-way door cannot. A change that is cheap to roll back is low risk. Destructive actions and hard-to-reverse decisions are one-way: a data migration, a deleted column, anything sent, posted, deployed, or published outward. Rolling back a commit does not unsend an email, and a flagged rollout stays two-way only until the first write lands in the new format.

The blast radius is everything the change could affect if it is wrong: data in existing accounts, consumers of an API, other screens, layout, other platforms. Consider all of them, then name it in one word.

Be most suspicious of your own "two-way, small". When unsure, call it one-way and say what would make it two-way.

## 4. Deliver

Print the body in chat. On a run, also write it to `.foreman/runs/<id>/pr.md`. Stop: the merge is the user's.

## Never

- Push, open a PR, or merge
- A preamble before `## Summary`
- Evidence from a builder's self-check
- A door call made from the diff alone
