#!/usr/bin/env bash
# Query the installed Codex model catalog without creating a thread or turn.
# Requires jq. Output is the visible catalog, not a claim about latest releases.
set -euo pipefail
command -v codex >/dev/null
command -v jq >/dev/null

scratch=$(mktemp -d)
server_pid=""
cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf "$scratch"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkfifo "$scratch/in" "$scratch/out"
exec 3<>"$scratch/in" 4<>"$scratch/out"
codex app-server --listen stdio:// <"$scratch/in" >"$scratch/out" 2>"$scratch/stderr" 3>&- 4>&- &
server_pid=$!

read_response() {
  local wanted="$1" line remaining
  while (( SECONDS < deadline )); do
    remaining=$((deadline - SECONDS))
    if ! IFS= read -r -t "$remaining" line <&4; then break; fi
    if jq -e --argjson id "$wanted" '.id == $id' <<<"$line" >/dev/null; then
      if ! jq -e 'has("result") and (has("error") | not)' <<<"$line" >/dev/null; then
        echo "Codex model discovery returned an RPC error." >&2
        return 1
      fi
      printf '%s\n' "$line"
      return 0
    fi
  done
  echo "Codex model discovery timed out; no model was selected." >&2
  return 1
}

deadline=$((SECONDS + 30))
printf '%s\n' '{"id":1,"method":"initialize","params":{"clientInfo":{"name":"foreman_model_discovery","version":"1.0"}}}' >&3
read_response 1 >/dev/null
printf '%s\n' '{"method":"initialized","params":{}}' >&3
cursor=null
request_id=2
while :; do
  jq -cn --argjson id "$request_id" --argjson cursor "$cursor" \
    '{id:$id,method:"model/list",params:{limit:100,includeHidden:false,cursor:$cursor}}' >&3
  response=$(read_response "$request_id")
  jq -e '.result.data | type == "array"' <<<"$response" >/dev/null
  jq -c '.result.data[] | select(.hidden != true) | {model,displayName,isDefault,upgrade,upgradeInfo,defaultReasoningEffort,supportedReasoningEfforts}' <<<"$response" >>"$scratch/models"
  cursor=$(jq -c '.result.nextCursor // null' <<<"$response")
  [[ "$cursor" != null ]] || break
  request_id=$((request_id + 1))
done
jq -s --arg checked_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{source:"codex app-server model/list",checked_at:$checked_at,models:.}' "$scratch/models"
