---
name: volontariapp-docx-reports
description: "Inspecter, corriger l'orthographe et éditer les rapports Word (.docx) sous docs/coaching/ en préservant le balisage OpenXML, les styles et la mise en page via script Python."
type: Agent Skill
title: Modification et relecture de documents Word DOCX
tags: [docx, coaching, reports, word, openxml]
status: stable
paths:
  - "docs/coaching/**"
  - "docs/scripts/**"
  - scripts/modify_docx.py
mesh_keys:
  - docx
  - coaching-report
  - word
generated:
  by: claude-code/agent
  at: "2026-10-06T11:15:27Z"
verified:
  - by: claude-code/agent
    at: "2026-10-06T13:30:21Z"
    digest: b62f935ee48616e6
  - by: claude-code/agent
    at: "2026-10-06T13:36:48Z"
    digest: 5b6f11cdf63a4484
  - by: claude-code/agent
    at: "2026-10-06T13:38:27Z"
    digest: 58318fe7e465799d
  - by: claude-code/agent
    at: "2026-10-06T13:44:13Z"
    digest: 05ea1109c37f08cc
  - by: "human:victoragahi"
    at: "2026-10-07T21:29:24Z"
    digest: 2cab408ba3777f42
sources:
  - id: modify-script
    resource: .agents/skills/volontariapp-docx-reports/scripts/modify_docx.py
    title: Script modify_docx.py
  - id: coaching-report
    resource: docs/coaching/Rapport de suivi coaching 7.docx
    title: Rapport de suivi coaching 7
---

# Modification et relecture de documents Word DOCX

Cette skill encadre l'inspection, la relecture orthographique et la modification programmatique des rapports de suivi de projet Word (.docx) situés sous `docs/coaching/`.

## Quand utiliser cette skill

- Relecture et correction de fautes d'orthographe ou de coquilles dans un document `.docx`.
- Modification de titres, plannings, tableaux ou conclusions d'un rapport de suivi.
- Extraction textuelle d'un document Word pour analyse ou synthese.

## Regles de manipulation des fichiers DOCX

1. **Preservation stricte de la structure OpenXML** : Ne jamais re-serialiser l'arbre complet du document via `ElementTree.tostring()`, sous peine d'injecter des namespaces fictifs `ns0:` / `ns1:` rendant le fichier illisible pour Microsoft Word[^modify-script].
2. **Gestion multi-runs obligatoire** : Word decoupe les mots et syntagmes au gre des styles sur plusieurs nœuds `<w:t>`. Toute recherche et substitution doit s'operer a l'echelle du paragraphe `<w:p>` avec distribution sur les runs concourants[^modify-script].
3. **Attribut d'espacement** : Si une chaine inseree commence ou s'acheve par un espace, l'attribut `xml:space="preserve"` doit etre active sur la balise `<w:t>`[^modify-script].
4. **Sauvegarde automatique** : Toute operation d'ecriture sur place doit generer prealablement une copie `.bak.docx`[^modify-script].
5. **Conventions de redaction** : Respecter les regles d'accord, de pluriel ("Stockage de fichiers"), d'accents sur majuscules ("OBSERVABILITE") et de vocabulaire francais documentees dans le guide[^coaching-report].

## References

- [Anatomie OpenXML et preservation des styles](/volontariapp-docx-reports/references/openxml-structure.md)
- [Workflow d'inspection et modification](/volontariapp-docx-reports/references/workflow.md)
- [Pieges et conventions d'orthographe](/volontariapp-docx-reports/references/common-typos.md)
- [Leçons apprises](/volontariapp-docx-reports/references/lessons.md)

## Scripts

- `python3 scripts/modify_docx.py view <fichier.docx>` : inspecte les paragraphes et recherche de texte[^modify-script].
- `python3 scripts/modify_docx.py replace <fichier.docx> --json <replacements.json>` : applique un ensemble de substitutions avec sauvegarde et validation de conformite ZIP/XML[^modify-script].
- `python3 scripts/modify_docx.py insert-image <fichier.docx> --after-heading "<Titre>" --image "<img.png>"` : insere un diagramme de Gantt PNG sous une section cible[^modify-script].
- `python3 docs/scripts/export_notion_backlog.py --sprint <N>` : extrait le backlog Notion avec resolution des dependances Bloque / Bloque par et des dates[^coaching-report].
- `node docs/scripts/fetch_gantt_images.mjs --sprint <N>` : automatisation Chromium Playwright sans interface pour exporter le PDF Gantt et extraire les PNG[^coaching-report].
- `python3 docs/scripts/create_template_docx.py` : génère le document modèle `docs/coaching/Rapport de suivi coaching template.docx` avec des balises `Sprint <TODO>` et `[TODO]` pour servir de base neutre[^coaching-report].
- `bash docs/scripts/generate_report.sh` : script shell interactif pilotant l'exportation, les diagrammes Gantt, le template DOCX, le prompt agent et le declenchement de la session Claude / Antigravity (support macOS, Linux et WSL)[^coaching-report].
- `bash docs/scripts/generate_report.sh --clean` : nettoie tous les fichiers temporaires (backups `.bak*`, zip, pdf résiduels, cache de test)[^coaching-report].
