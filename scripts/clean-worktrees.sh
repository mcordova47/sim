#!/usr/bin/env bash
# Remove worktrees and branches for issues that are done.
#
# For every branch `issue/<NNN>-slug`, the issue file on main (issues/<NNN>-*.md)
# must say `status: done`. The branch must also be merged into main, and its
# worktree (if any) must have no uncommitted changes. Anything else is skipped
# with a reason. Dry run by default.
#
#   scripts/clean-worktrees.sh          # show what would be removed
#   scripts/clean-worktrees.sh --yes    # remove it
#
# Run from the main checkout or any worktree. Never pushes or touches remotes.
set -euo pipefail

apply=0
case "${1:-}" in
  --yes|-y) apply=1 ;;
  "") ;;
  -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "unknown argument: $1 (use --yes or --help)" >&2; exit 2 ;;
esac

main_branch=main
repo=$(git worktree list --porcelain | awk '/^worktree /{print substr($0,10); exit}')
cd "$repo"

if ! git rev-parse --verify -q "$main_branch" >/dev/null; then
  echo "no $main_branch branch" >&2; exit 1
fi

git worktree prune

removed=0 skipped=0

for branch in $(git for-each-ref --format='%(refname:short)' 'refs/heads/issue/*'); do
  name=${branch#issue/}
  num=${name%%-*}

  issue_path=$(git ls-tree --name-only "$main_branch" -- issues/ | grep -E "^issues/${num}-.*\.md$" | head -1 || true)
  if [[ -z "$issue_path" ]]; then
    echo "skip   $branch: no issue file for $num on $main_branch"; skipped=$((skipped+1)); continue
  fi

  status=$(git show "$main_branch:$issue_path" | awk -F': *' '/^status:/{print $2; exit}')
  if [[ "$status" != "done" ]]; then
    echo "skip   $branch: issue is '${status:-unknown}' on $main_branch, not done"; skipped=$((skipped+1)); continue
  fi

  if ! git merge-base --is-ancestor "$branch" "$main_branch"; then
    echo "skip   $branch: issue is done but the branch has commits not in $main_branch"; skipped=$((skipped+1)); continue
  fi

  wt=$(git worktree list --porcelain | awk -v b="refs/heads/$branch" '/^worktree /{w=substr($0,10)} $0=="branch " b {print w}')
  if [[ -n "$wt" ]]; then
    if [[ -n "$(git -C "$wt" status --short)" ]]; then
      echo "skip   $branch: worktree $wt has uncommitted changes"; skipped=$((skipped+1)); continue
    fi
  fi

  if (( apply )); then
    [[ -n "$wt" ]] && git worktree remove "$wt"
    git branch -d "$branch" >/dev/null
    echo "removed $branch${wt:+ and $wt}"
  else
    echo "would remove $branch${wt:+ and $wt}"
  fi
  removed=$((removed+1))
done

verb="would remove"; (( apply )) && verb="removed"
echo "$verb $removed, skipped $skipped"
(( apply )) || { (( removed )) && echo "run with --yes to apply"; true; }
