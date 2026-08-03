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

### Foreman: run a plan autonomously

[**`foreman`**](skills/foreman) is a local orchestrator that works a tracer-bullet plan
phase by phase without you sitting there. It dispatches a one-shot headless Worker to
build each phase, dispatches an independent Verifier to walk the "how to test as the
user" steps, commits a checkpoint to a run branch when a phase passes, and only
interrupts you on exceptions. It never marks a phase done, never merges, never touches
`main`. Full docs, safety notes, and the target-project convention: [skills/foreman/README.md](skills/foreman/README.md).

It comes with the skills that produce the convention it consumes:

| Skill | Role |
|---|---|
| [`foreman`](skills/foreman) | The autonomous run loop. |
| [`write-a-prd`](skills/write-a-prd) | Produce a PRD through structured discovery. |
| [`prd-to-plan`](skills/prd-to-plan) | Turn that PRD into a phased tracer-bullet plan. |
| [`grill-with-docs`](skills/grill-with-docs) | Stress-test the plan against your domain model, update the docs. |
| [`execute-phase`](skills/execute-phase) | Run a single phase interactively, the non-autonomous path. |
| [`tdd`](skills/tdd) | Red-green-refactor loop for a phase. |
| [`prototype`](skills/prototype) | Throwaway prototype to settle a design question. |

Together they are the whole loop: idea, plan, autonomous build.

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

- **[Matt Pocock](https://github.com/mattpocock/skills)** (MIT). `grill-with-docs`,
  `prototype`, `tdd`, `write-a-prd`, and `prd-to-plan` are adapted from his collection,
  modified to fit Foreman's tracer-bullet convention. `grilling-frontend-prototyping`
  takes its interview discipline and its prototype rules from his `grilling` and
  `prototype`. His license is preserved in
  [`THIRD_PARTY_LICENSES/`](THIRD_PARTY_LICENSES/). Go get the originals and the rest of
  his set, including `wayfinder`: `npx skills@latest add mattpocock/skills -g`.
- **Will Waldon** for asking the grilling questions with prototypes and zooming the
  design tree one level per round, which is the idea that turns two good skills into one
  better one.

## License

MIT. See [LICENSE](LICENSE), which carries Matt's copyright notice too.
