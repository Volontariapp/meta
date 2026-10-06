---
type: Playbook
title: Workflow d'inspection et modification d'un document Word
description: Procedure pas-a-pas pour inspecter, relire, tester et appliquer des corrections sur un rapport .docx.
tags: [workflow, playbook, docx, coaching]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-06T11:15:27Z"
sources:
  - id: modify-script
    resource: .agents/skills/volontariapp-docx-reports/scripts/modify_docx.py
    title: Script modify_docx.py
---

# Workflow d'inspection et modification d'un document Word

## 1. Inspection initiale du document

Visualiser les paragraphes et reperer les index ou passages a verifier :
```bash
python3 scripts/modify_docx.py view "docs/coaching/Rapport.docx" --limit 100
```
Pour cibler un mot cle ou une section specifique :
```bash
python3 scripts/modify_docx.py view "docs/coaching/Rapport.docx" --search "Conclusion"
```

## 2. Preparation des substitutions

Construire un tableau de couples `[ancien_texte, nouveau_texte]`.
Regles a respecter :
- Donner une portion de texte suffisamment discriminante pour eviter les faux positifs.
- Attention aux sous-chaines : si `ancien_texte` est contenu dans `nouveau_texte` (ex: "Stockage de fichier" vers "Stockage de fichiers"), verifier que les occurrences deja au pluriel ne sont pas alterees.

Exemple de fichier `replacements.json` :
```json
[
  ["chaque tache se voit associe", "chaque tache se voit associee"],
  ["envents en cours", "evenements en cours"]
]
```

## 3. Application securisee

Executer la commande de remplacement (qui cree automatiquement une sauvegarde `.bak.docx`)[^modify-script] :
```bash
python3 scripts/modify_docx.py replace "docs/coaching/Rapport.docx" --json /tmp/replacements.json
```
Ou pour un remplacement direct unique :
```bash
python3 scripts/modify_docx.py replace "docs/coaching/Rapport.docx" --find "envents" --replace-with "evenements"
```

## 4. Verification post-modification

1. Verifier le bilan affiche dans le terminal (nombre d'occurrences modifiees pour chaque entree).
2. Relire les paragraphes modifies avec la commande `view` :
```bash
python3 scripts/modify_docx.py view "docs/coaching/Rapport.docx" --search "evenements"
```
3. S'assurer que le fichier Word s'ouvre sans erreur de syntaxe XML.
