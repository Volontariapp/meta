---
name: volontariapp-mesh-mcp-verification
description: "Regles pour rapporter une anomalie mesh-mcp (REX, analyse) : gabarit sortie brute / code lu / verdict, fixture minimal avec variantes, separation faits-hypotheses-demandes, donnees d'audit sourcees. A utiliser avant de qualifier quoi que ce soit de defaut de l'outil."
type: Guideline
title: Verification des anomalies mesh-mcp
tags: [mesh-mcp, verification, rex]
status: draft
paths: []
mesh_keys:
  - rex
generated:
  by: claude-code/agent
  at: "2026-10-12T08:47:45Z"
verified:
  - by: claude-code/agent
    at: "2026-10-12T08:47:45Z"
  - by: claude-code/agent
    at: "2026-10-12T08:49:07Z"
    digest: da39a3ee5e6b4b0d
  - by: claude-code/agent
    at: "2026-10-12T11:52:51Z"
    digest: da39a3ee5e6b4b0d
sources: []
---

# Verification des anomalies mesh-mcp

## Quand utiliser cette skill

Regles pour rapporter une anomalie mesh-mcp (REX, analyse) : gabarit sortie brute / code lu / verdict, fixture minimal avec variantes, separation faits-hypotheses-demandes, donnees d'audit sourcees. A utiliser avant de qualifier quoi que ce soit de defaut de l'outil.

## Règles

Contexte : un REX 7.1.3 avait rapporté comme défauts de l'outil des points qui étaient des erreurs d'usage ou un
comportement documenté (voir `references/lessons.md`). Ces règles empêchent de recommencer.

1. **Gabarit obligatoire pour chaque anomalie**, sans exception :
   - Sortie brute : appel exact, arguments, extrait de la réponse.
   - Vérification indépendante dans le code : `fichier:ligne` lu par l'agent (code du projet analysé ET code de
     l'outil quand c'est le comportement de l'outil qui est en cause), jamais déduit de l'outil.
   - Verdict : `CONFIRME` (outil faux, code lu), `REFUTE` (l'outil a raison) ou `NON VERIFIE` (préciser ce qui
     manque). Un verdict autre que `CONFIRME` n'entre pas dans la liste des défauts.
2. **Avant de déclarer un faux positif ou un faux négatif** :
   - Un « 0 résultat » : la requête est-elle bien formée ? La route, le symbole ou le topic existe-t-il (lire le
     fichier source) ? L'outil est-il censé couvrir ce type de cible (lire sa description) ? Une erreur d'usage n'est
     pas un défaut.
   - Un chemin de fichier : le donner tel que l'outil l'attend (relatif à quelle racine, avec le préfixe du dépôt).
   - Un résultat `heuristic` ou `ambiguous` est un signal, pas une erreur : vérifier quand même la ligne indiquée.
3. **Réduire à un fixture minimal avant de généraliser** : 1 proto ou fichier + 1 contrôleur ou service qui
   reproduit le défaut seul, puis des variantes qui doivent donner un résultat DIFFERENT (autre récepteur, autre nom,
   autre type). Ne jamais conclure « le critère est X » sans un cas où X est vrai et le résultat correct, et un cas
   où X est faux. Ranger le fixture dans un dossier à part avec un `mesh-mcp.toml` et la commande exacte
   (`mesh-mcp run --standalone -c mesh-mcp.toml`, lancée depuis ce dossier).
4. **Vérifier les faux négatifs de sa propre proposition** : avant de proposer de supprimer ou durcir une heuristique,
   chercher un vrai cas qui en dépend (client gRPC réel typé `XClient`, obtenu par `getService`) et vérifier qu'il
   resterait détecté. Pour une « limite connue », établir si le cas est décidable statiquement (chaîne construite
   à l'exécution : non ; constante ou enum importé : oui).
5. **Séparer strictement dans le REX**, jamais dans une même phrase : faits mesurés (avec commande ou fichier),
   hypothèses (marquées « hypothèse, non vérifiée »), demandes d'évolution (marquées comme telles).
6. **Ne pas sur-ajuster** : formuler chaque demande de façon générique (« tout enum TypeScript utilisé dans un
   décorateur »), pas par nom de projet. Un cas qui n'apparaît que dans un repo se dit explicitement : ce sera
   probablement une option de config, pas un changement de comportement.
7. **Données d'audit** : toute latence, nombre d'appels ou taux d'erreur est donné avec sa fenêtre de temps et sa
   source (`audit.db`, `mesh-mcp stats`, transcript). Pour une erreur, retrouver tout de suite les arguments dans le
   transcript (`~/.claude/projects/<projet>/*.jsonl`) : `audit.db` ne garde qu'un digest. Sans arguments, l'erreur
   n'est pas reproductible : le dire plutôt que de l'interpréter.
8. **Corrections** : si le REX s'avère faux, le corriger dans le même fichier et signaler ce qui a changé (section
   « Corrections »), sans réécriture silencieuse.

Précautions propres à mesh-mcp :
- Le démon `meshd` ne recharge pas `mesh-mcp.toml` ; pour tester une config sans toucher au démon, utiliser
  `mesh-mcp run --standalone -c <toml>` (voir `volontariapp-mesh-mcp`).
- `mesh-mcp graph --format json` est brut : il n'applique pas `include_tests`. Ne pas en déduire le comportement des
  outils MCP.
- Les outils ont un périmètre documenté (description de l'outil). Chercher une route par chemin dans `smart_search`
  ou `analyze_impact` sort de ce périmètre : c'est une demande d'évolution, pas un défaut.

## Références

- [Leçons apprises](/volontariapp-mesh-mcp-verification/references/lessons.md)

## Scripts

- Aucun script. Fixture de référence (3 variantes, commande de reproduction) :
  `~/Developer/causalmesh/rex-fixtures/faux-client-grpc/` (repo causalmesh, hors `meta`).
