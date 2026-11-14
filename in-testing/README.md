# In testing: spec + ticket folders

The next version of Foreman and its companion skills. It's being tested on real projects before it replaces the skills in [`../skills/`](../skills/). Expect changes.

## What changes

- **Specs and tickets replace PRDs and plan files.** `to-spec` writes `.scratch/<feature>/spec.md`: the decisions behind a feature plus the agreed test seams. `to-tickets` writes one file per tracer-bullet ticket under `.scratch/<feature>/issues/`, with `Blocked by:` edges. Each ticket's `Status:` line is the tracker, so `IMPLEMENTATION.md` goes away.
- **Foreman runs the ticket folder** along its frontier, one builder at a time. It reviews once at the end with `two-axis-review` and files findings as `needs-triage` tickets. There is no fix loop.
- **Any engine for any role.** Builder, verifier and reviewer each run on `claude` or `codex`.
- **Small fails are patched, not rebuilt.** The verifier rates each fail `small` or `large`. A small one keeps the work and gets a targeted patch.
- **Headless browsers reuse one profile on Windows**, where a fresh profile per launch logs a failed sign-in and can lock the account. Elsewhere the project's tests use their own profiles.
- **Foreman decides the small things.** A test already red on the base commit is excluded and filed as a ticket; a criterion narrowed to what the built design can produce is amended by Foreman. Both are listed under Orchestrator decisions in the handoff. New behaviour or a product choice still escalates.
- **Builders can't loosen the bar.** Tickets, specs, ADRs and existing tests are fixed inputs: every test and fixture stays at least as strict as before, and a narrower reading of a criterion counts as `partial`, never `met`. If the project lists a check command, builder and verifier both run it, and a commit the pre-commit hook refuses is a small fail that gets patched.
- **Sharper acceptance criteria.** `to-tickets` makes a matching criterion name its key with one case that must match and one that must not, states the edges (pending versus stored, empty, over the limit), and rewrites any criterion the existing limits make impossible.
- **`pr` writes the merge note.** A Summary visual, before/after Evidence from the verdict files, and Merge Danger: one-way or two-way door, plus blast radius. It reads a `## One-way doors` list from the repo's `CLAUDE.md`. The same body works as a PR description.
- `execute-ticket` replaces `execute-phase`. `retro` and `pr` are new.

Flow: grill → `/to-spec` → `/to-tickets` → `/foreman` or `/execute-ticket` → `/two-axis-review` → `/pr` → merge → `/retro`.

## Try it

The `skills` CLI installs from `skills/` only, so copy these folders by hand into your agent's skill directory (`~/.claude/skills/`, `~/.agents/skills/`, or a project's `.claude/skills/`). Copy all eight: foreman reads its companions from the folder it's installed in.

They replace `foreman` and `tdd` from the stable set, and retire `write-a-prd`, `prd-to-plan` and `execute-phase`.

## Credits

`to-spec`, `to-tickets`, `two-axis-review`, `retro`, `tdd` and `pr` are adapted from [Matt Pocock's skills](https://github.com/mattpocock/skills) (MIT, see [THIRD_PARTY_LICENSES](../THIRD_PARTY_LICENSES)). `pr`'s Summary visuals come from Dex Horthy's `show-me`; see [`pr/CREDITS.md`](pr/CREDITS.md).
