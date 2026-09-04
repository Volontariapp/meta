#!/usr/bin/env bash

# Parcourt tous les éléments du dossier courant
for dir in */; do
  # Vérifie si le dossier contient un dépôt .git
  if [ -d "${dir}.git" ]; then
    # Nettoie le nom du dossier (enlève le / final)
    folder="${dir%/}"
    
    # Récupère la branche courante et le statut court
    branch=$(git -C "$folder" branch --show-current 2>/dev/null || echo "detached")
    status=$(git -C "$folder" status --porcelain 2>/dev/null)

    echo "├── $folder ($branch)"
    if [ -n "$status" ]; then
      # Affiche chaque fichier modifié/non suivi indenté sous le dossier
      echo "$status" | while read -r line; do
        echo "│   ├── $line"
      done
    else
      echo "│   └── clean"
    fi
  fi
done
