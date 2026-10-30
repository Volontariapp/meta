---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-docx-reports, du plus récent au plus ancien."
tags: [lessons, volontariapp-docx-reports]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-06T11:15:27Z"
sources:
  - id: modify-script
    resource: .agents/skills/volontariapp-docx-reports/scripts/modify_docx.py
    title: Script modify_docx.py
---

# Leçons

## 2026-10-06 - Boucle infinie sur sous-chaînes dans les remplacements textuels

- **Type :** pitfall
- **Leçon :** Quand l'ancien texte est une sous-chaîne du nouveau texte (ex: "Stockage de fichier" vers "Stockage de fichiers"), une boucle while basee sur `old_text in full_text` boucle a l'infini. Il faut faire avancer un pointeur de recherche (`search_offset = start_pos + len(new_text)`) apres chaque remplacement.
- **Consigné par :** claude-code/agent

## 2026-10-06 - Corruption de namespaces par ElementTree sur les fichiers Word

- **Type :** pitfall
- **Leçon :** La re-serialisation complete d'un `word/document.xml` via `ElementTree.tostring()` renomme les namespaces Office complexes non enregistres en `ns0:`, `ns1:`, ce qui corrompt le document pour Word. L'edition ciblee par expressions regulieres sur les balises `<w:t>` au sein de `<w:p>` preserve 100% du balisage XML initial[^modify-script].
- **Consigné par :** claude-code/agent

## 2026-10-06 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : docs/coaching/**.
- **Consigné par :** claude-code/agent
