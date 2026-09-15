#!/usr/bin/env bash

# Tableau pour enregistrer les PIDs des fetchs et les dépôts en retard
fetch_pids=()
folders=()
needs_pull=()

# 1. Lancement de TOUS les fetchs en parallèle
for dir in */; do
  [ -d "${dir}.git" ] || continue
  folder="${dir%/}"
  
  git -C "$folder" fetch origin --quiet 2>/dev/null &
  fetch_pids+=($!)
  folders+=("$folder")
done

# 2. Attente globale de TOUS les fetchs
for pid in "${fetch_pids[@]}"; do
  wait "$pid" 2>/dev/null
done

# 3. Lecture et affichage des résultats
for folder in "${folders[@]}"; do
  # Branche courante
  branch=$(git -C "$folder" branch --show-current 2>/dev/null)
  : "${branch:=detached}"

  # Détection branche distante (origin/main ou origin/master)
  remote_main="origin/main"
  git -C "$folder" rev-parse --verify origin/main >/dev/null 2>&1 || remote_main="origin/master"

  # Calcul du différentiel [avance/retard]
  diff_info=""
  if git -C "$folder" rev-parse --verify "$remote_main" >/dev/null 2>&1; then
    counts=$(git -C "$folder" rev-list --left-right --count "$branch...$remote_main" 2>/dev/null)
    ahead=$(echo "$counts" | awk '{print $1}')
    behind=$(echo "$counts" | awk '{print $2}')
    
    diff_info=" [+$ahead / -$behind vs $remote_main]"

    if [ "$behind" -gt 0 ]; then
      needs_pull+=("$folder")
    fi
  fi

  echo "├── $folder ($branch)$diff_info"

  # Statut local
  status=$(git -C "$folder" status --porcelain 2>/dev/null)
  if [ -n "$status" ]; then
    while IFS= read -r line; do
      echo "│   ├── $line"
    done <<< "$status"
  else
    echo "│   └── clean"
  fi
done

# 4. Résolution globale
echo ""
read -p "Would you like to resolve everything ? [y/N] " response

if [[ "$response" =~ ^[Yy]$ ]]; then
  if [ ${#needs_pull[@]} -eq 0 ]; then
    echo "Tous les dépôts sont déjà à jour."
  else
    echo "Mise à jour parallèle des dépôts..."
    pull_pids=()
    for repo in "${needs_pull[@]}"; do
      echo "↳ Pull dans $repo..."
      git -C "$repo" pull --quiet &
      pull_pids+=($!)
    done

    for pid in "${pull_pids[@]}"; do
      wait "$pid" 2>/dev/null
    done
    echo "Terminé !"
  fi
fi
