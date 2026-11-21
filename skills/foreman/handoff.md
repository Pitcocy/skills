# The batch-review handoff

Printed in chat when a Run completes. The completion notice to the Operator names the Orchestrator decisions.

In this order:

1. **Orchestrator decisions**: every clarification you decided, every reading you ruled on and every gate you cleared, with the ticket, the amended wording and the reason, so the Operator can veto at merge. "None" when there were none.
2. **Open findings from verification**: the tickets filed for `user` and `agent` findings first, then the `malformed` and `none` ones. Each in plain language: what differs, who would notice, your recommendation (fix before merge, after, or drop). Then every fix a verifier made, one line each. "None" when there were none.
3. **Try it in the app**: the recipe to see the branch working by hand (below).
4. Per-ticket one-liners: status, attempts, fixes.
5. Tickets left unrun and why (blocked by a `needs-triage` or `ready-for-human` ticket, escalated).
6. Every deferred `manual:` step, aggregated.
7. **Review**: findings per axis, the worst per axis, the path to `review.md`, and each `needs-triage` ticket it filed in plain language: what breaks, how much it matters, size, your recommendation (run now, after the merge, or wontfix). The Operator answers once and may still go through them one by one.
8. Review commands: `git log --author=Foreman --oneline`, per-ticket diffs.
9. Reminder: merging the Run Branch to `main` is the Operator's acceptance signature and the moment the `ready-for-review` tickets become `done`.
10. Next steps: `/retro` on `.foreman/runs/<id>/`, `/pr <run-id>` for the merge note (door call and blast radius).

## Try it in the app

The fixture or seed to create, the data folder and environment the app points at, the tickets' own *How to test as the user* steps, and the clean-up. Written once, at the first gate pause or at completion, and reused.
