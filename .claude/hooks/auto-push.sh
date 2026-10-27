#!/usr/bin/env bash
# Commits and pushes all local changes at the end of each Claude turn.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
git add -A
if ! git diff --cached --quiet; then
  git commit -q -m "Auto-sync $(date '+%Y-%m-%d %H:%M')" || exit 0
fi
git push -q origin HEAD >/dev/null 2>&1 || echo "auto-push: push failed" >&2
exit 0
