# Model selection

Settle engine and model for builder, verifier and reviewer before the pre-flight dispatch. Any role can run on `codex` or `claude`. The verifier's choice also covers rechecks; the reviewer defaults to the verifier's choice.

## When the question is already answered

- The Operator's kickoff names a builder and a verifier in any spelling ("opus 5.5", "astra"): resolve them to CLI IDs with the defaults below and state the result in the kickoff line.
- A previous run manifest exists for the same feature: reuse its role choices and state them.

Otherwise ask once, in one inline chat question that covers every role and shows the discovered defaults, for example: "Builder: Codex / <discovered Astra ID>; verifier: Claude / opus (latest Opus); reviewer: same as verifier. Use these defaults, or which engine and model for each?" Suggested defaults are not consent, and existing `FOREMAN_CLAUDE_MODEL` / `FOREMAN_CODEX_MODEL` values are suggestions to disclose. A named model that cannot be resolved is the only reason to ask again.

## Defaults

- **Claude: latest Opus**, through the CLI's `opus` alias, never a hardcoded release number. Check whether `ANTHROPIC_DEFAULT_OPUS_MODEL` is set in the launch environment or applicable Claude settings; if so, disclose the pin in the question rather than calling it latest. The Operator's global settings stay as they are. The alias follows the provider's recommended Opus and can move between launches; offer an exact model ID if the Operator wants a fixed version.
- **Codex: latest available Astra.** Run `bash <skill>/bin/list-codex-models.sh` to query the installed CLI's `model/list` catalog without starting a model turn. Inspect the visible Astra entries and their upgrade metadata. If several versions exist, verify which is latest with current official OpenAI model documentation; catalog order and `isDefault` alone do not establish it. Use the returned exact `model` ID, not an invented `astra` alias or a hardcoded version, and stay in the Astra family.
- If live discovery fails, inspect `${CODEX_HOME:-$HOME/.codex}/models_cache.json` (`fetched_at` plus visible `models[].slug` entries) and label any suggestion as cached, with its timestamp. If Astra is missing or the latest version is unclear, say so in the kickoff question and ask for an explicit model ID; the CLI default is never inherited quietly.

## What goes in the manifest

`<role>_engine`, `<role>_model`, `<role>_effort` for `builder`, `verifier`, `reviewer`, plus `model_selection` (source and check time for each role). Resolve existing engine effort overrides into the role fields; an empty effort means the CLI default. Every dispatch passes the role's saved engine, model and effort explicitly.

A legacy manifest without per-role choices gets the kickoff question before its next dispatch. A ticket's `Engine:` line overrides the builder's engine only, and needs a model confirmed for that engine before dispatch.

Sources: [Claude model aliases](https://code.claude.com/docs/en/model-config), [Codex model discovery](https://learn.chatgpt.com/docs/app-server#list-models-modellist).
