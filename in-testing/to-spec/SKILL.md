---
name: to-spec
description: "Turn the decisions already made in this conversation (or a finished wayfinder map) into .scratch/<feature>/spec.md. No interview, just synthesis."
disable-model-invocation: true
---

# To Spec

Write down what was already decided, so a fresh session can build it without anyone re-explaining. Do NOT interview the user. The deciding happened upstream (grilling, wayfinder, prototype); this skill only records it. If the spec states something the user never said, that is a defect.

Use it only when the build spans several sessions. Small work goes straight from grilling to building.

Flow: `grilling / wayfinder → to-spec → to-tickets → foreman or execute-ticket → two-axis-review → retro`. Keep to-spec and to-tickets in the same context window as the grilling: no clear, no compact in between.

## Process

### 1. Gather what is known

- The current conversation.
- If the user passed a wayfinder map (`.scratch/<effort>/map.md` or its folder): read the map and every resolved ticket it links. Collapse those decisions into this one spec.
- The codebase in the area you're touching, if you haven't explored it yet. Use the vocabulary in `CONTEXT.md` and respect ADRs in `docs/adr/`.

### 2. Agree the seams

Sketch the **seams**: the public boundaries where this feature's behavior will be tested, without reaching inside. Prefer existing seams to new ones. Pick the highest seam that works. The ideal number is one.

Give each seam one line on what it catches and one on what it misses. Show them to the user and wait for agreement. This is the only stop: the `tdd` skill tests only at these seams, and `two-axis-review` flags tests anywhere else.

### 3. Write the spec

Pick a short kebab-case feature slug (reuse the wayfinder effort slug if there is one). Write `.scratch/<feature>/spec.md` using the template below. Then tell the user the path and point them at the two sections worth reading closely: **Seams** and **Out of scope**.

No file paths or code snippets: they go stale. Exception: a snippet a prototype produced that pins a decision more precisely than prose (state machine, schema, type shape). Inline the decision-rich part and note it came from a prototype.

<spec-template>

# Spec: <Feature name>

> Source: <the grilling session date, or the wayfinder map path>

## Problem

The problem from the user's perspective.

## Solution

The solution from the user's perspective.

## User stories

A numbered list covering every behavior the feature needs, and no more.

1. As a <actor>, I want <feature>, so that <benefit>

## Implementation decisions

Decisions that hold for every ticket. Builders treat these as fixed; a builder who must break one halts instead.

- Modules built or changed, and their interfaces
- Schema shape, routes, API contracts
- Architectural decisions, third-party boundaries
- Technical clarifications from the user

## Seams

The agreed test points.

- **<seam>**: catches <...>; misses <...>

## Testing decisions

- What a good test looks like here (external behavior only)
- Which modules get tested
- Prior art: similar tests already in the codebase

## Out of scope

What was deliberately refused or deferred. The refusals are usually the most useful lines on the page.

## Further notes

</spec-template>
