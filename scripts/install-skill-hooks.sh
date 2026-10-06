#!/usr/bin/env bash
# Active, dans chaque repo cloné sous meta, le hook pre-commit qui vérifie les skills de meta
# (evolve.py check-staged). Le hook lui-même est commité dans chaque repo :
#   - repos avec Husky : bloc ajouté à .husky/pre-commit, activé par `yarn install` (script prepare) ;
#   - autres repos     : .githooks/pre-commit, activé ici par `git config core.hooksPath .githooks`
#     (config locale, non partagée par git : à relancer sur chaque poste après un clone).
# Usage : ./scripts/install-skill-hooks.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_REPOS=("causalmesh")

for dir in "${ROOT_DIR}"/*/ "${ROOT_DIR}"/.github/; do
  [ -e "${dir}.git" ] || continue
  repo="$(basename "${dir}")"
  [[ " ${SKIP_REPOS[*]} " == *" ${repo} "* ]] && continue

  if [ -f "${dir}.githooks/pre-commit" ]; then
    git -C "${dir}" config core.hooksPath .githooks
    echo "${repo} : core.hooksPath = .githooks"
  elif [ -f "${dir}.husky/pre-commit" ]; then
    if [ -d "${dir}.husky/_" ]; then
      [ -n "$(git -C "${dir}" config core.hooksPath || true)" ] || git -C "${dir}" config core.hooksPath .husky/_
      echo "${repo} : Husky actif"
    else
      echo "${repo} : Husky présent mais non installé, lancer \`yarn install\` dans ${repo}"
    fi
  else
    echo "${repo} : aucun hook de skills (repo non concerné ou pas encore mis à jour)"
  fi
done
