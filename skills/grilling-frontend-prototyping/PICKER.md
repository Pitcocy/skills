# The picker

The floating control that lets the user flip between variants. Same behaviour in both
delivery modes. Build it once per session and reuse it every round.

## Anatomy

A small fixed-position bar, bottom-right, with three parts:

- **Left arrow.** Previous variant, wrapping around.
- **Label.** The variant key and its name, e.g. `B: sidebar-first`. Names, not just
  letters. "I want B" is a useless verdict three rounds later; "I want sidebar-first"
  survives.
- **Right arrow.** Next variant, wrapping around.

## Behaviour

- **Draggable.** The user will need to see what is underneath it. Persist the dragged
  position for the session so it does not jump back every reload.
- **Arrow keys work too.** `←` and `→` cycle. Do not intercept them while an `<input>`,
  `<textarea>`, or `[contenteditable]` has focus.
- **Switching restyles the mock live.** Same content, same data, same scroll position
  where possible. The user is comparing designs, not reloading pages. Anything that
  resets scroll or refetches breaks the comparison.
- **Shareable and reload-stable in Mode B.** Write the variant into the `?variant=` URL
  param through the framework's router (`router.replace` on Next, `navigate` on React
  Router) so a link carries the variant.
- **Obviously not part of the design.** High-contrast pill, hard shadow, a look that
  clashes on purpose. If the user starts critiquing the picker, it is too well
  integrated.
- **Never in production.** Gate on `process.env.NODE_ENV !== 'production'` or the
  project's equivalent, so a stray merge cannot ship it.

## State toggles

When the design has states that change the answer, add toggle buttons to the picker for
them: inbox full vs empty, 3 rows vs 300, short name vs a name that wraps to three
lines, loading, error, offline.

These are independent of the variant selection. The user should be able to hold a
variant and cycle the states, or hold a state and cycle the variants. That second one
is how empty-state disasters get caught.

Keep the toggles honest. Fake data at realistic volume and realistic string lengths,
including the ugly ones. A mock that only ever shows six-character names has not tested
anything.
