#!/usr/bin/env bash
# usage: checkpoint.sh <run-dir> <NN> [verdict-label]
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "usage: checkpoint.sh <run-dir> <NN> [verdict-label]" >&2
  exit 64
fi
refuse() { echo "checkpoint: $1" >&2; exit 1; }

run=$(cd "$1" && pwd); n="$2"; label="${3:-pass}"
cd "$run/../../.."
feature=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["feature"])' "$run/manifest.json")
ticket=$(ls .scratch/"$feature"/issues/"$n"-*.md)

latest=$(ls -t "$run"/ticket-"$n".verdict*.md 2>/dev/null | head -1 || true)
[[ -n "$latest" ]] || refuse "no Verdict File for #$n"
grep -q '^fixed: yes' "$latest" && refuse "$(basename "$latest") holds a verifier's own fix; a fresh recheck comes first"
if [[ "$label" == pass ]]; then
  grep -q '^verdict: pass' "$latest" || refuse "$(basename "$latest") does not say verdict: pass"
fi

before="$run/ticket-$n.before-checkpoint.md"
cp "$ticket" "$before"
sed -e 's/^\*\*Status:\*\* in-progress/**Status:** ready-for-review/' \
    -e '/^## Acceptance criteria/,/^## How to test/ s/^- \[ \]/- [x]/' "$before" > "$ticket"

title=$(head -1 "$ticket" | sed -E 's/^# [0-9]+: //')
as_foreman=(git -c user.name=Foreman -c user.email=foreman@local)
"${as_foreman[@]}" add -A
if ! "${as_foreman[@]}" commit -q -m "foreman: #$n $title"; then
  git reset -q
  cp "$before" "$ticket"
  rm "$before"
  echo "checkpoint: the commit was refused; the ticket file is back as it was" >&2
  exit 2
fi
rm "$before"
commit=$(git rev-parse --short HEAD)

python3 - "$run/manifest.json" "$n" "$label" "$commit" <<'PY'
import json, sys
path, n, label, commit = sys.argv[1:]
manifest = json.load(open(path))
manifest.setdefault("tickets", {}).setdefault(n, {}).update(status="ready-for-review", verdict=label, commit=commit)
json.dump(manifest, open(path, "w"), indent=1)
PY
echo "committed $commit: #$n $title ($label)"
