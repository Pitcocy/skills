---
name: retro
description: "Retrospective on a coding session or a foreman run: suggest changes to the agent's environment (checks, standards, pointers, tooling), not the code."
disable-model-invocation: true
---

# Retro

Suggest improvements to the coding agent's **environment** so the next build starts better. Not the code. Mechanical mistakes become deterministic checks; judgement calls become written standards.

## Steps

1. Anything you suggest that an agent will read (instructions, standards, skill text) is short, imperative, and concrete: rules, not lore.

2. Read the primary sources for what the user points at:
   - **This session** (the default): the conversation so far. Run retro before clearing.
   - **A foreman run**: `.foreman/runs/<run-id>/` in the target repo. Read `manifest.json` first, then every Result File, Verdict File, debris patch, and review report. Escalations, retries, halts, and adjudications are the richest signal. Worker logs only when a result or verdict can't explain what went wrong.
   - **An older session**: search the session logs on this machine (`~/.claude/projects/`) for the one the user names.

3. Look for candidates in these categories:

   - **Navigation**: did the agent struggle to find the right files? Hidden dependencies between files? Would a **navigation pointer** in `CLAUDE.md` or a doc help? *Use when* finding information took long.
   - **Automated checks**: could a lint rule, type, test, or filesystem check have caught a mistake the agent made? Read the repo's own check commands first (package scripts, composer scripts, CI workflow): an existing check that's unwired or silently broken is the finding, not a reinvention. A repo with no **guardrail** at all (no pre-commit hook and no CI job running lint/typecheck/tests) is itself a finding. *Use when* the agent made a catchable mistake, or there's no guardrail.
   - **Coding standards**: should the reviewer (`two-axis-review`) enforce a new rule, or drop or clarify one? Classify first. A **mechanical** violation (banned API, import shape, file location, fixed syntax pattern) gets a deterministic check: a custom linter rule, a pre-commit hook, or a CI job, whichever is cheapest here. Default to building the check over writing the rule. Only genuine **judgement calls** (cross-file consistency, matching surrounding style) go into written standards. *Use when* review missed something.
   - **Steering files**: is `CLAUDE.md` / `AGENTS.md` (repo or global) carrying instructions that belong in standards or checks instead? Any instructions that don't change behavior (**no-ops**)? *Use when* those files are large.
   - **Specs and tickets**: did a halt, retry, or rework trace back to a vague acceptance criterion, a missing seam, a wrong blocking edge, or a horizontal ticket? Suggest the change to `to-spec` / `to-tickets` or to how the user answered them. *Use when* a foreman run escalated or retried.
   - **Tool economy**: expensive tool calls that could be streamlined, token-hungry custom tooling. *Use when* a call was costly.
   - **Information access**: was a crucial piece of information unavailable (dev server logs, read-only access to a service, credentials the builder couldn't load)? *Use when* the agent was blind to something.

4. Present the candidates to the user in order of severity. For each: what happened (with the evidence), the proposed change, and where it would live. Apply nothing until the user picks.

## Reference

Work goes through two stages. The **implementing** agent carries the most context pressure: exploration, code, debugging. The **reviewing** agent gets a diff and little else. So standards are imposed at review, not loaded into the implementer.

- `CLAUDE.md` / `AGENTS.md`: loaded into every agent in the repo. Use sparingly, mostly for navigation pointers.
- Written standards: read during review. Live in `CLAUDE.md` today; when they outgrow a short section, move them to `CODING_STANDARDS.md` and leave a pointer.
- Docs: reference files other files point to. Look for an existing doc before writing a new one.
- Skills: for docs whose description should sit in context, or for user-invoked commands.
