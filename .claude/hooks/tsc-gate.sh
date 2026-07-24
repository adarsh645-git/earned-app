#!/usr/bin/env bash
# PreToolUse hook: block `git commit` unless `npx tsc --noEmit` passes.
# Reads the tool call JSON from stdin (Claude Code PreToolUse contract).
set -euo pipefail

payload="$(cat)"
command=$(echo "$payload" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input", {}).get("command", ""))' 2>/dev/null || echo "")

# Only gate actual `git commit` invocations; ignore everything else and any
# commit that explicitly opts out with --no-verify (respect the escape hatch).
if [[ "$command" != *"git commit"* ]] || [[ "$command" == *"--no-verify"* ]]; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$project_dir"

if ! tsc_output=$(npx tsc --noEmit 2>&1); then
  echo "Blocked: 'npx tsc --noEmit' failed. Fix the type errors below before committing (or use --no-verify to bypass deliberately):" >&2
  echo "$tsc_output" >&2
  exit 2
fi

exit 0
