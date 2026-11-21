# Skills

Agent skills I actually use. Built for Claude Code and Codex, but they are plain
markdown, so any agent that reads skills can use them.

## Install

Pick what you want, interactively:

```bash
npx skills@latest add Pitcocy/skills -g --agent claude-code
```

Everything, non-interactively:

```bash
npx skills@latest add Pitcocy/skills --all -g --agent claude-code
```

Or copy the folder you want into `~/.claude/skills/`, `~/.agents/skills/`, or
`.claude/skills/` in one project. Update later with `npx skills update`.

## What's in here

### Foreman: run a ticket folder unattended

[**`foreman`**](skills/foreman) is a local orchestrator that works a folder of tickets
without you sitting there. For each ticket it dispatches a one-shot headless Worker to
build it, then an independent Verifier that runs the acceptance test: one judgement with
evidence for every acceptance criterion and every "how to test as the user" step. A pass
becomes a commit on a run branch. When every runnable ticket is through, one review runs
over the whole diff and files its findings as new tickets. It interrupts you only on
exceptions. It never marks a ticket done, never merges, never touches `main`.

> Foreman runs agents with permissions bypassed (`claude -p --dangerously-skip-permissions`,
> `codex exec --dangerously-bypass-approvals-and-sandbox`) so Workers can build unattended.
> Run it only on a project you trust, in a git repo with a clean tree.

The flow: grill → `/to-spec` → `/to-tickets` → `/foreman` or `/execute-ticket` →
`/two-axis-review` → `/pr` → merge → `/retro`.

| Skill | Role |
|---|---|
| [`wayfinder`](skills/wayfinder) | Chart an idea too big for one session as a map of decision tickets on your issue tracker, then resolve one per session until the way is clear. Comes before the spec, when you don't yet know enough to write one. |
| [`grill-with-docs`](skills/grill-with-docs) | `grilling` plus `domain-modeling` in one command: stress-test the plan and update the glossary and decision records as you go. |
| [`to-spec`](skills/to-spec) | Turn the decisions from a grilling or a finished wayfinder map into `.scratch/<feature>/spec.md`: the decisions plus the agreed test seams. |
| [`to-tickets`](skills/to-tickets) | Break the spec into one file per tracer-bullet ticket under `.scratch/<feature>/issues/`, with `Blocked by:` edges. Each ticket's `Status:` line is the tracker. |
| [`foreman`](skills/foreman) | The unattended run over that ticket folder. |
| [`execute-ticket`](skills/execute-ticket) | Build one ticket in your own session, the hands-on path. |
| [`tdd`](skills/tdd) | Red-green-refactor at the seams the spec names. |
| [`two-axis-review`](skills/two-axis-review) | Review a diff on two separate axes: the repo's documented standards, and the spec. |
| [`pr`](skills/pr) | The merge note: a summary visual, before/after evidence, and merge danger (one-way or two-way door, blast radius). |
| [`retro`](skills/retro) | After a session or a run: suggest changes to the agent's environment (checks, standards, pointers), not the code. |
| [`prototype`](skills/prototype) | Throwaway prototype to settle a design question. |

Install the whole set: Foreman reads its companions from the folder it is installed in.

How a run behaves:

- **Any engine for any role.** Builder, verifier and reviewer each run on `claude` or `codex`. You pick at kickoff.
- **The verifier judges row by row.** Every criterion and test step gets pass or fail with evidence. A missing verdict is never a pass.
- **Small fails are fixed, not rebuilt.** The verifier fixes a small fail itself and a fresh verifier rechecks it. A large fail gets a fresh builder, three attempts at most. Small findings still open after two fix rounds become tickets and the run goes on.
- **Foreman decides the small things.** A test already red on the base commit is excluded and filed as a ticket. A criterion narrowed to what the built design can produce is amended. Both are listed under Orchestrator decisions in the handoff, so you can veto at merge. New behaviour or a product choice still escalates to you.
- **Builders can't loosen the bar.** Tickets, specs, decision records and existing tests are fixed inputs, and a narrower reading of a criterion is reported, never hidden.
- **One review, at the end.** It files findings as `needs-triage` tickets. There is no fix loop.

What you need:

- [Claude Code](https://claude.com/claude-code). The [`codex`](https://github.com/openai/codex) CLI only if you want Codex in a role.
- git, Bash and Python 3. `jq` for Codex model discovery.
- A `CLAUDE.md` at the root of the project (`AGENTS.md` for Codex roles). A starting point is in [`skills/foreman/project-templates/`](skills/foreman/project-templates), next to an optional config that also pings a Discord channel when Foreman needs you. Without it, Foreman asks in chat.

Coming from the older set? `write-a-prd`, `prd-to-plan`, `execute-phase` and the plan-file
Foreman are retired: specs and ticket folders replace PRDs, plan files and
`IMPLEMENTATION.md`. Remove the three old skills with `npx skills remove`. They stay in
this repo's git history.

`wayfinder` calls two more of Matt's skills on every ticket, so they ship here too:

| Skill | Role |
|---|---|
| [`grilling`](skills/grilling) | Interview you in rounds, every question that can be answered now with a recommended answer each, until the plan is shared understanding. |
| [`domain-modeling`](skills/domain-modeling) | Pin down the words you use and record the decisions that are hard to reverse. |

No setup step is needed. Without an issue-tracker config, `wayfinder` keeps its map and
tickets as markdown files under `.scratch/` in your project, which is the right default
when you are not on GitHub.

### PPC Summit 2026: plan your build before you build it

If you came here from the summit, this is the flow from the talk:

1. Pick one task you want to hand to an agent first. Make a folder for it.
2. On [pitcocy.com/summit](https://pitcocy.com/summit), build your range card, then hit "Get my kit" under Go deeper. Save `summit-kit.md` in that folder.
3. Install the skills: `npx skills@latest add Pitcocy/skills --all -g --agent claude-code`
4. Open Claude Code in that folder and paste the startup line from the kit:
   `/wayfinder Read summit-kit.md, then help me plan the build for the task I want to hand to an agent first.`

Wayfinder reads the kit, asks which task you're planning and what you can't answer yet, and leaves a map
of decisions behind. You build once the way is clear, not before.

### Design

| Skill | What it does |
|---|---|
| [`grilling-frontend-prototyping`](skills/grilling-frontend-prototyping) | Designs a frontend by interviewing you with prototypes instead of questions. Each round builds 3 to 5 radically different variants into one live mock, you give a verdict, the next round zooms one level deeper down the design tree. |

Two things kept biting me. Agents ask design questions in words, and "persistent
sidebar or collapsible?" is unanswerable in the abstract but instant when you are
looking at both. And one prototype round is never enough, because picking a look is not
one decision, it is a tree: whole-screen layout, then design language, then component
groups, then individual components, then the states where designs actually break.

I used it to design the slide language for my PPC Summit talk. Four rounds, one live
mock, and the output was a set of rules I could hand to a build ("gold pages mark a new
chapter, cream pages carry content") instead of a screenshot I would have argued with
later.

## Credits

A lot of this is other people's work, combined or adapted.

- **[Matt Pocock](https://github.com/mattpocock/skills)** (MIT). `wayfinder`, `grilling`,
  `grill-with-docs` and `domain-modeling` are his, copied unmodified (the revisions I run). `prototype`, `tdd`,
  `to-spec`, `to-tickets`, `two-axis-review`, `retro` and `pr` are adapted from his collection, modified to fit
  Foreman's ticket-folder convention. `grilling-frontend-prototyping` takes its interview
  discipline and its prototype rules from his `grilling` and `prototype`. His license is
  preserved in [`THIRD_PARTY_LICENSES/`](THIRD_PARTY_LICENSES/). Go get the originals
  and the rest of his set: `npx skills@latest add mattpocock/skills -g`.
- **Dex Horthy**: the Summary visuals in `pr` come from his `show-me`. See
  [`skills/pr/CREDITS.md`](skills/pr/CREDITS.md).
- **Will Waldon** for asking the grilling questions with prototypes and zooming the
  design tree one level per round, which is the idea that turns two good skills into one
  better one.

## License

MIT. See [LICENSE](LICENSE), which carries Matt's copyright notice too.
