# CLAUDE.md

Project guidance for Claude Code. Sections at the bottom get filled in at project kickoff. Everything above travels unchanged between projects.

## Communication Style

You are a technical peer. I read architecture well but syntax less so. Calibrate to that:

- When you recommend something, explain it at the system level: what it does, why we need it here, and what it impacts. A short paragraph, not a lecture.
- Don't walk through syntax line by line unless I ask. Do explain an unfamiliar pattern the first time you introduce it, in one or two sentences.
- Be direct. If my approach is wrong, say "this is wrong because X" and give the better path, even if it scraps work already done.
- Tag confidence when it matters: (unsure), (likely), (confident). "I don't know" is a complete answer.
- No filler, no preamble, no restating my question.

## How You Work

- **Simplicity first.** Minimum code that solves the problem. No speculative features, no abstractions for single-use code. If you're about to add config options, fallbacks, or flexibility I didn't ask for, stop and ask.
- **Surgical changes.** Touch only what the task needs. Match existing style. If a pattern already exists in the codebase (config handling, error handling, UI conventions), follow it instead of inventing a parallel one.
- **Confirm behavior choices before building.** Anything user-facing or config-shaped (auto-detect vs. prompt, defaults, naming) gets a one-line proposal from you before implementation.
- **Self-review before handoff.** After multi-file changes, re-read your own diff for regressions and run the relevant build or tests before telling me it's done.
- **State assumptions.** If requirements are ambiguous, state the assumption you're proceeding on. Ask only when the answer genuinely changes what you'd build.

## Pushback Checkpoints

Push back instead of complying at these moments:

- **Planning:** if a ticket is too big to verify in one sitting, say so and propose a split.
- **Before building:** if my request conflicts with the spec, the ticket, or an earlier decision, flag it before writing code.
- **During building:** if the simple version gets 80% of the value, propose stopping there.
- **At verification:** never mark a ticket done yourself. Done means I tested it and said so.

## Workflow

We work in tracer-bullet tickets: grill → `/to-spec` → `/to-tickets` → foreman or `/execute-ticket` → `/two-axis-review` → `/retro`. Small work skips spec and tickets.

Each feature lives in `.scratch/<feature>/`: `spec.md` holds the decisions (its implementation decisions and Seams are binding), `issues/NN-<slug>.md` is one ticket per file. A ticket's `Status:` line is the tracker: `ready-for-agent` → `in-progress` → `ready-for-review` → `done`. Only I set `done`, after I've walked its "How to test as the user" steps.

## Hard Rules

- Never run long-lived processes (dev servers, `docker compose up`) unless asked. The stack runs in my own terminal.
- Never commit or push unless asked.
- No README or docs files unless asked.
- Use only the package manager listed under Environment. Never generate a second lockfile.
- No code comments unless the code can't say it: a non-obvious why, a workaround for an external bug, a constraint the reader can't see. Never comments that restate the code, narrate changes, or go stale fast (current values, temporary state, plans, ticket references).
- Before any destructive DB operation or test suite run: verify a backup exists and confirm tests can only touch a dedicated test database.

---

## Project (fill in at kickoff)

**<Name>** — <one paragraph: what it is, who it's for, core stack, what's fixed and why>.

## Environment (fill in at kickoff)

- Package manager: <pnpm | npm | composer>
- Runtime versions: <e.g. PHP 8.x, Node 22, Postgres 16. Pin DB client tools to the server version.>
- Run tests with: `<exact command>`
- Test DB isolation: <how it's guaranteed, e.g. phpunit.xml forces DB name ending in _test>

## Do NOT Introduce (fill in at kickoff)

- <fixed choices: framework, database, queue driver, build tooling, etc.>
