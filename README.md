# Skills

Agent skills I actually use. Mostly for Claude Code and Codex, but they are plain
markdown, so any agent that reads skills can use them.

## Install

All of them:

```bash
npx skills@latest add Pitcocy/skills -g --agent claude-code
```

Or one:

```bash
npx skills@latest add Pitcocy/skills/grilling-frontend-prototyping -g --agent claude-code
```

Or just copy the folder you want into `~/.claude/skills/` (or `~/.agents/skills/`, or
`.claude/skills/` in one project). Nothing here depends on a plugin or a runtime.

## What's in here

| Skill | What it does |
|---|---|
| [`grilling-frontend-prototyping`](skills/grilling-frontend-prototyping) | Designs a frontend by interviewing you with prototypes instead of questions. Each round builds 3 to 5 radically different variants into one live mock, you give a verdict, the next round zooms one level deeper down the design tree. |

## Why grilling-frontend-prototyping exists

Two things I kept hitting.

First, agents ask design questions in words. "Do you want a persistent sidebar or a
collapsible one?" is unanswerable in the abstract and instantly answerable when you are
looking at both. So the interview ships prototypes and the verdict on those prototypes
becomes the next question.

Second, one prototype round is never enough. Picking a look is not one decision, it is
a tree: whole-screen layout, then design language, then component groups, then
individual components, then the states where designs actually break. Each verdict
closes one branch and opens the next, in the same file, so you never lose the thread.

I used it to design the slide language for my PPC Summit talk. Four rounds, one live
mock, and the output was a set of rules I could hand to a build ("gold pages mark a new
chapter, cream pages carry content") instead of a screenshot I would have argued with
later.

## Credits

This is not original work, it is a combination of other people's.

- **[Matt Pocock](https://github.com/mattpocock/skills)** wrote `grilling` and
  `prototype` (MIT). The one-question-at-a-time interview discipline, the throwaway
  prototype rules, the "radically different variants" requirement, and the variant
  switcher all come from his skills. If you want the originals, and the rest of his set
  including `wayfinder`, go get them: `npx skills@latest add mattpocock/skills -g`.
- **Will Waldon** for asking the grilling questions with prototypes and zooming the
  design tree one level per round, which is the idea that turns two good skills into
  one better one.

I combined them into a single self-contained skill, added the state toggles and the
in-place-mock rules, and wrote it up.

## License

MIT. See [LICENSE](LICENSE), which carries Matt's copyright notice too.
