---
name: grilling-frontend-prototyping
description: Converge on a frontend look by grilling the user with prototypes instead of questions. Each round builds several radically different variants into one live mock, the user gives a verdict, the next round zooms one level deeper. Use when the user wants to iterate on UI or visual taste against concrete variants rather than describe it in words.
---

# Grilling: Frontend Prototyping

Interview the user about a frontend design until it is fully decided, but ask every
question with prototypes instead of words.

Nobody can answer "should the sidebar be persistent or collapsible?" in the abstract.
They can answer it in half a second when they are looking at both. So each round of the
interview ships variants, and the user's verdict on those variants becomes the next
question.

This skill is self-contained. It does not call other skills.

## The loop

Repeat until the feature is designed down to the component level:

1. **Frame one question.** The narrowest open question at the current zoom level.
   State it in one line before building anything.
2. **Build the round.** 3 to 5 radically different variants answering that one
   question, all inside a single live mock (see Delivery modes). Never more than 5.
   Beyond that they stop being different and start being noise.
3. **Hand it over and wait.** Give the user the URL or file, name the variants, then
   stop. One question per round. Asking three at once is bewildering.
4. **Take the verdict.** The useful answer is usually a remix: "B's header, C's
   density, and I hate all four sidebars." Write it down as a decision, not a vibe.
5. **Zoom in one level.** The verdict closes one branch of the design tree and opens
   the next. Rebuild the same mock in place, one level deeper.
6. **Capture and clean up.** When the tree is resolved, write down the decisions, then
   delete the mock or fold the winner into the real code.

Rules that hold for every round:

- **One question at a time.** Wait for the answer before the next round.
- **Always recommend.** Say which variant you would pick and why, in one sentence.
  The user is allowed to disagree, but a naked menu is lazy.
- **Facts you look up, decisions they make.** If the answer is findable in the codebase
  (what component library, what data this page has, what the spacing scale is), go read
  it. Never spend a question on it.
- **Do not build the real thing until the user confirms the design is settled.**

## The design tree

Each round moves one level down. Do not jump ahead; a component decision made before
the layout is settled gets thrown away.

1. **Whole-screen look.** Layout, information hierarchy, density, the primary
   affordance. What kind of thing is this, visually.
2. **Design language.** Type, colour, spacing, borders, shadows, corner radius, motion.
   Once picked, every later round inherits it.
3. **Component groups.** The nav, the table, the form, the empty state, the sidebar.
   One group per round.
4. **Individual components.** The row, the filter chip, the primary button, the toast.
5. **States.** Loading, empty, error, overflow, long content, permission-denied. These
   are where designs actually break, so do not stop before them.

## Delivery modes

Pick one at the start of the session and keep it for the whole run.

### Mode A: standalone mock

Default for greenfield work, design-language work, or anything with no real page to
host it yet.

- **One HTML file, updated in place every round.** Same file, new contents. The user
  keeps one tab open for the entire session instead of collecting a graveyard of links.
  If the harness has an artifact or preview tool, publish through it and redeploy the
  same path each round.
- **Mock the app around the design, not just the design.** Fake header, fake sidebar,
  fake data at realistic volume, realistic string lengths. A variant judged in a vacuum
  always looks fine; a variant judged next to 40 rows of plausible data does not.
- Self-contained: inline the CSS and JS, no external fonts or CDNs. It has to open
  anywhere, offline, from any machine.

### Mode B: in-app variants

Preferred whenever a real page already exists, or the design will live inside one. Real
data, real chrome, real density beats any mock.

- Render the variants **on the existing route**, gated by a `?variant=` URL param. All
  existing data fetching, auth, and params stay exactly where they are. Only the
  rendered subtree swaps.
- Something with no page yet but that naturally belongs inside one (a new dashboard
  section, a new card on settings, a new step in a flow) is still Mode B. Mount the
  variants inside the host page.
- Only create a new throwaway route when the thing genuinely has no home. Follow the
  project's existing routing convention and put `prototype` in the path so nobody
  mistakes it for real.
- Variants must be structurally different, not restyled copies of each other. Each one
  is free to throw out the layout. A shared header is fine, a shared layout defeats the
  point.

Both modes use the same picker.

## The picker

Every mock carries a floating picker so the user can flip between variants without
thinking. Full spec, including the keyboard and state-toggle behaviour: **[PICKER.md](PICKER.md)**.

Short version: bottom-right, draggable, names the current variant, left and right
arrows cycle (and so do the arrow keys), visually obviously not part of the design
being judged, and never shipped to production.

## Prototype hygiene

- **Throwaway from the first line.** No tests, no error handling beyond what makes it
  run, no abstractions, no "we might need this later."
- **No persistence.** State lives in memory. If the question genuinely involves
  storage, use a scratch store named so it is obviously disposable.
- **No real mutations.** Point writes at stubs. The question is what it looks like, not
  whether the backend works.
- **Never promote prototype code straight to production.** It was written under
  prototype rules. Rewrite it properly when the winner gets folded in.
- **Delete or absorb when done.** Variants and pickers left lying around rot fast and
  confuse the next reader.

## What to keep

The decisions are the only durable output. Before deleting the mock, write down, in a
commit message, an ADR, an issue, or a `NOTES.md` next to the prototype:

- the question each round asked
- the verdict, in the user's own words where possible
- the rule that verdict implies for everything built later
  ("gold pages mark a new chapter, cream pages carry content")

## Anti-patterns

- **Variants that differ only in colour or copy.** That is a tweak. Real variants
  disagree about structure.
- **Asking in words what a prototype could ask.** If you catch yourself writing "would
  you prefer a grid or a list", build both instead.
- **Skipping the states round.** Every design looks good full and populated. Empty,
  loading, and overflowing is where the decision actually gets made.
- **New file every round.** The user loses the thread and starts comparing against
  memory instead of pixels.
- **Building the real feature mid-session** because one variant clearly won. Finish the
  tree first.

## Credits

This skill is a combination of, and an adaptation of, other people's work:

- **`/grilling` and `/prototype`** by [Matt Pocock](https://github.com/mattpocock/skills),
  MIT licensed. The relentless one-question-at-a-time interview, the throwaway
  prototype rules, the radically-different-variants requirement, and the variant
  switcher all come from there.
- **Asking the grilling questions with prototypes, and zooming the design tree one
  level per round**, from Will Waldon's frontend prototyping approach.

Combined into one self-contained skill by [Alfred Simon](https://github.com/Pitcocy).
