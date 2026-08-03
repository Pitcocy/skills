#!/usr/bin/env bash
# Foreman worker dispatch: one-shot headless agent, full output streamed to the log.
# usage: dispatch.sh <claude|codex> <target-dir> <brief-file> <log-file>
set -uo pipefail

engine="$1"; target="$2"; brief="$3"; log="$4"

# Always fan out on the latest/best Claude model (builders + verifiers).
# Override per-run with FOREMAN_CLAUDE_MODEL / FOREMAN_CLAUDE_EFFORT,
# FOREMAN_CODEX_MODEL / FOREMAN_CODEX_EFFORT if ever needed.
claude_model="${FOREMAN_CLAUDE_MODEL:-claude-opus-4-8}"
claude_effort="${FOREMAN_CLAUDE_EFFORT:-}"
codex_model="${FOREMAN_CODEX_MODEL:-}"
codex_effort="${FOREMAN_CODEX_EFFORT:-}"

case "$engine" in
  claude)
    (cd "$target" && claude -p --dangerously-skip-permissions --model "$claude_model" \
      ${claude_effort:+--effort "$claude_effort"} < "$brief") >"$log" 2>&1
    ;;
  codex)
    codex exec --dangerously-bypass-approvals-and-sandbox -C "$target" \
      ${codex_model:+-m "$codex_model"} \
      ${codex_effort:+-c model_reasoning_effort="$codex_effort"} \
      - < "$brief" >"$log" 2>&1
    ;;
  *)
    echo "unknown engine: $engine" >&2; exit 64
    ;;
esac

status=$?
echo "$status" > "${log}.exit"
exit "$status"
