# In testing: spec + ticket folders

The next version of Foreman and its companion skills. It's being tested on real projects before it replaces the skills in [`../skills/`](../skills/). Expect changes.

## What changes

- **Specs and tickets replace PRDs and plan files.** `to-spec` writes `.scratch/<feature>/spec.md`: the decisions behind a feature plus the agreed test seams. `to-tickets` writes one file per tracer-bullet ticket under `.scratch/<feature>/issues/`, with `Blocked by:` edges. Each ticket's `Status:` line is the tracker, so `IMPLEMENTATION.md` goes away.
- **Foreman runs the ticket folder** along its frontier, one builder at a time. It reviews once at the end with `two-axis-review` and files findings as `needs-triage` tickets. There is no fix loop.
- **Any engine for any role.** Builder, verifier and reviewer each run on `claude` or `codex`.
- **Small fails are patched, not rebuilt.** The verifier rates each fail `small` or `large`. A small one keeps the work and gets a targeted patch.
- **Headless browsers reuse one profile.** On Windows, a fresh profile per launch logs a failed sign-in and can lock the account.
- `execute-ticket` replaces `execute-phase`. `retro` is new.

Flow: grill → `/to-spec` → `/to-tickets` → `/foreman` or `/execute-ticket` → `/two-axis-review` → `/retro`.

## Try it

The `skills` CLI installs from `skills/` only, so copy these folders by hand into your agent's skill directory (`~/.claude/skills/`, `~/.agents/skills/`, or a project's `.claude/skills/`). Copy all seven: foreman reads its companions from the folder it's installed in.

They replace `foreman` and `tdd` from the stable set, and retire `write-a-prd`, `prd-to-plan` and `execute-phase`.

## Credits

`to-spec`, `to-tickets`, `two-axis-review`, `retro` and `tdd` are adapted from [Matt Pocock's skills](https://github.com/mattpocock/skills) (MIT, see [THIRD_PARTY_LICENSES](../THIRD_PARTY_LICENSES)).
