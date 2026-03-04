#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/data/workspace/scaryponens.github.io"
SERIES_BRANCH="origin/feature/friendly-rotary-phone-series"
TARGET_BRANCH="master"

SERIES_FILES=(
  "20260304-buried-my-elixir-darling.md"
  "20260305-uv-is-the-new-it-just-works.md"
  "20260306-rebuilding-an-old-thesis-in-public.md"
  "20260307-pretty-graphs-useful-truth.md"
  "20260308-shipping-with-an-ai-pair-programmer.md"
)

DRY_RUN="${1:-}"

cd "$REPO_DIR"

echo "[publish-series] fetching latest refs..."
git fetch origin --prune

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[publish-series] working tree is dirty; aborting"
  exit 1
fi

echo "[publish-series] checking out $TARGET_BRANCH"
git checkout "$TARGET_BRANCH"
git pull --ff-only origin "$TARGET_BRANCH"

next_file=""
for file in "${SERIES_FILES[@]}"; do
  if ! git cat-file -e "origin/$TARGET_BRANCH:thoughts/$file" 2>/dev/null; then
    next_file="$file"
    break
  fi
done

if [[ -z "$next_file" ]]; then
  echo "[publish-series] all series posts already published on $TARGET_BRANCH"
  exit 0
fi

echo "[publish-series] next post: $next_file"

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "[publish-series] dry run only; exiting"
  exit 0
fi

# Bring file from series branch into master working tree
git checkout "$SERIES_BRANCH" -- "thoughts/$next_file"

git add "thoughts/$next_file"

if git diff --cached --quiet; then
  echo "[publish-series] no changes staged; nothing to commit"
  exit 0
fi

git commit -m "Publish thought: ${next_file%.md}"
git push origin "$TARGET_BRANCH"

echo "[publish-series] published $next_file to $TARGET_BRANCH"
