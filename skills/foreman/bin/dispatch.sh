#!/usr/bin/env bash
# Foreman worker dispatch: one-shot headless agent, full output streamed to the log.
# usage: dispatch.sh <claude|codex> <target-dir> <brief-file> <log-file> <model> [effort]
set -uo pipefail

if [[ $# -lt 5 || $# -gt 6 || -z "${5:-}" ]]; then
  echo "usage: dispatch.sh <claude|codex> <target-dir> <brief-file> <log-file> <confirmed-model> [effort]" >&2
  exit 64
fi

engine="$1"; target="$2"; brief="$3"; log="$4"
model="$5"

# Models are confirmed per role at kickoff and passed from the run manifest.
# Explicit effort (including empty) wins; preserve engine overrides for callers
# that omit it. Foreman passes the saved effort explicitly for repeatable runs.
case "$engine" in
  claude)
    effort="${6-${FOREMAN_CLAUDE_EFFORT:-}}"
    model_args=(--model "$model")
    [[ -z "$effort" ]] || model_args+=(--effort "$effort")
    (cd "$target" && claude -p --dangerously-skip-permissions \
      "${model_args[@]}" < "$brief") >"$log" 2>&1
    ;;
  codex)
    effort="${6-${FOREMAN_CODEX_EFFORT:-}}"
    model_args=(-m "$model")
    [[ -z "$effort" ]] || model_args+=(-c "model_reasoning_effort=\"$effort\"")
    codex exec --dangerously-bypass-approvals-and-sandbox -C "$target" \
      "${model_args[@]}" \
      - < "$brief" >"$log" 2>&1
    ;;
  *)
    echo "unknown engine: $engine" >&2; exit 64
    ;;
esac

status=$?
echo "$status" > "${log}.exit"
exit "$status"
