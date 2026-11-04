---
name: volontariapp-pr-tools
description: "Poser ou retirer des labels sur une liste de PRs (notify-discord, docker-and-e2e) et relancer leur CI par un commit vide, via les scripts scripts/pr-label.sh et scripts/pr-retrigger.sh (API REST, compatibles avec un vieux gh)."
type: Agent Skill
title: "Labels et relance de CI sur les PRs (pr-label.sh, pr-retrigger.sh)"
tags: [pr, labels, ci]
status: draft
paths:
  - scripts/pr-label.sh
  - scripts/pr-retrigger.sh
generated:
  by: claude-code/agent
  at: "2026-11-04T13:23:49Z"
verified:
  - by: claude-code/agent
    at: "2026-11-04T13:23:49Z"
  - by: claude-code/agent
    at: "2026-11-04T13:24:50Z"
    digest: "6196382522911491"
sources: []
---

# Labels et relance de CI sur les PRs (pr-label.sh, pr-retrigger.sh)

## Quand utiliser cette skill

Quand il faut poser ou retirer le même label sur plusieurs PRs de plusieurs dépôts (déploiement d'un changement de CI sur toute la flotte, vérification d'une notification), ou relancer la CI de ces PRs. Les deux scripts sont dans `scripts/` à la racine de `meta` et n'ont besoin que de `gh` (connecté), `jq` et `python3`.

## Les labels en jeu

| Label | Effet | Qui le pose |
| :--- | :--- | :--- |
| `notify-discord` | Opt-in : une PR humaine verte et mergeable déclenche UN message Discord (`ci-tools/.github/workflows/pr-ready-notify.yml`). Les PRs Dependabot sont notifiées sans label. | Toi, avant la fin de la CI |
| `docker-and-e2e` | Sans lui, la CI des microservices ne passe pas (constaté par l'utilisateur sur ms-user#78 ; le mécanisme exact n'a pas été relu dans `ci-tools`). Présent aussi dans les runners, qui ne s'en servent pas. | Toi |
| `discord-notified` | Marque « déjà notifiée » (dédup). | **Le workflow lui-même**, jamais à la main |

## Poser ou retirer des labels : `scripts/pr-label.sh`

```bash
scripts/pr-label.sh --label notify-discord --label docker-and-e2e ms-post#72 ms-ranking#31
scripts/pr-label.sh --label notify-discord --remove ms-user#78
scripts/pr-label.sh --create --label notify-discord ms-event#86     # crée le label s'il manque
scripts/pr-label.sh --dry-run --label notify-discord ms-post#72      # n'écrit rien
```

Cibles : `repo#numéro` (propriétaire `Volontariapp` par défaut) ou `proprio/repo#numéro`. Code de sortie 1 si une cible échoue.

## Relancer la CI : `scripts/pr-retrigger.sh`

```bash
scripts/pr-retrigger.sh --dry-run ms-post#72 ms-ranking#31          # montre branche et tête
scripts/pr-retrigger.sh --message "ci: re-run, labels set" ms-post#72
```

Le commit vide est créé par l'API git-data (même arbre que la tête, un parent) : rien n'est cloné ni commité en local, donc ni clé SSH, ni hook pre-commit, ni skill check. Le script refuse une PR fermée ou mergée, une branche venant d'un fork, et une branche `main`/`master`. La mise à jour de la branche n'est pas forcée : si quelqu'un a poussé entre-temps, elle est rejetée.

## Règles

- **Le label doit être posé avant la fin de la CI.** Le job de notification relit les labels en direct au moment où il tourne. Un label posé après la fin du run n'est pas vu : soit relancer seulement le job `notify-ready` depuis l'onglet Actions (« Re-run this job », sans commit), soit `pr-retrigger.sh` si un vrai nouveau run est voulu. Constaté sur ms-user#78 : le label arrivé 18 h après le run n'a rien déclenché, le job relancé a ensuite envoyé.
- **Ne jamais ajouter `discord-notified` à la main** : cela réduit au silence la notification de la PR. `pr-label.sh` le refuse sans `--force`. Le retirer (pour être notifié à nouveau) est autorisé.
- **Pas de merge, pas d'action hors labels et commit vide.** Ces scripts n'approuvent ni ne mergent rien. Pousser un commit vide sur une PR est une écriture visible : à ne faire que si l'utilisateur l'a demandé, et la mention d'attribution de l'agent (`Co-Authored-By`, `Claude-Session`) se passe dans `--message`.
- **Règle 7 d'AGENTS.md** (1 PR = 1 message Discord) : les labels déclenchent la notification du workflow ; ne pas envoyer en plus de message à la main pour une PR que le workflow a déjà notifiée (`discord-notified` présent).

## Pièges

- `gh` 2.4 (celui de cette machine) n'a pas `gh label`, et `gh pr edit --add-label` échoue sur une dépréciation GraphQL (Projects classic) ; `-f "labels[]=x"` est rejeté (« not an array »). D'où l'API REST avec un corps JSON (`--input -`) dans les deux scripts.
- Les scripts écrivent avec le jeton `gh` de l'utilisateur : il faut les droits d'écriture sur le dépôt. Sans eux, l'API renvoie 403/404 et le script le signale cible par cible.
- Un push fait avec un jeton d'utilisateur démarre les workflows ; un push fait avec le `GITHUB_TOKEN` d'un workflow ne le fait pas.
- Les labels sont propres à chaque dépôt : `--create` les crée là où ils manquent (couleur `5865F2` par défaut).

## Références

- [Leçons apprises](/volontariapp-pr-tools/references/lessons.md)
- Workflow de notification : `volontariapp-ci-tools` (section `pr-ready-notify.yml`).

## Scripts

- `scripts/pr-label.sh` : ajoute ou retire des labels (`--label`, `--remove`, `--create`, `--dry-run`).
- `scripts/pr-retrigger.sh` : pousse un commit vide sur la branche de chaque PR (`--message`, `--dry-run`).
