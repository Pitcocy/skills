---
name: write-a-prd
description: Create a PRD through structured discovery — problem definition, codebase exploration, relentless interviewing, and writing the final document. Use when user wants to write a PRD, define requirements, or plan a new feature.
---

# Write a PRD

## Process

### 1. Get the problem description

Ask the user for a long, detailed description of the problem they want to solve and any potential ideas for solutions.

### 2. Explore the codebase

Explore the repo to verify their assertions and understand the current state of the codebase.

### 3. Interview relentlessly

Interview the user about every aspect of this plan until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. Ask questions one at a time. If a question can be answered by exploring the codebase, explore the codebase instead.

### 4. Write the PRD

Once you have a complete understanding of the problem and solution, write the PRD to `plans/prd-name.md` using the template below.

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>
