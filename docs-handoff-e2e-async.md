# Handoff : E2E asynchrone (mis a jour le 2026-11-04 au soir)

Reprendre depuis une session neuve ouverte dans `meta`. Lire ce fichier, puis les lecons des skills `volontariapp-ci-tools`, `volontariapp-api-gateway`, `volontariapp-implement-async-event-flow`, `volontariapp-shared-npm-package-change` (references/lessons.md). Rapport de la session du 2026-11-04 : https://claude.ai/artifact/83zK8KsaAg9WzAvSg9PYgu

## Fait et merge
- Lot 1 : user.created vers ms-social et notification WebSocket (e2e/async/user-created-social, user-created-ws-notification).
- Runners dans la matrice E2E (ci-tools#71) : une PR de runner labellisee `docker-and-e2e` construit ses images taguees par branche et lance l'E2E avec.
- Lot 2 (ci-tools#72, api-gateway#100) : outbox-event, outbox-post, outbox-ranking, post-processor-ranking, worker-ranking, ms-ranking dans la stack. post-processor-event exclu (geocodage fige sur Paris en test).
- Scenarios par evenement (api-gateway#98) : catalogue `e2e/scenarios/README.md` (72 types), scenarios user, event, post, social. G1, G3 et G4 sont des `it` qui passent.
- G1 (suppression d'event jamais notifiee) : ws-service#50, post-processors-runner#59.
- G3 et G4 (noeud social orphelin quand une suppression suit de pres la creation, users puis posts et events) : creation et suppression lues par des groupes de consommateurs paralleles. Marqueur Redis dans post-processor-social (`src/post-processors/tombstone.ts`) : la suppression marque avant d'effacer, la creation verifie apres avoir cree et efface a nouveau. La confirmation de creation part toujours (sinon gather bloque). post-processors-runner#61, #62, #63.
- Recherche avec filtres sociaux (api-gateway#101) : `exclude*` seuls envoyes en `excludedIds`, `only*` en `ids` coupes a 1000. Corrige aussi la chaine `??` qui ignorait tous les filtres.
- npm-packages#287 publie : `@volontariapp/database` 3.12.1 (lot outbox trie par created_at puis id, meme cle en SQL) et `@volontariapp/domain-social` 0.17.1 (`getRecommendedEventIds` ignore les noeuds sans eventId), plus les bumps de propagation. npm-packages#289 : test RetryHelper instable remplace par une horloge manuelle.
- Decouverte : "detacher les posts d'un event supprime" n'avait rien a coder. Le lien post-event n'existe que dans Neo4j (ms-post le lit a la demande) et disparait avec le DETACH DELETE de l'event ; un scenario le verifie.

## En cours (PR ouvertes le 2026-11-04 au soir)
- outbox-runners#45 : les 7 runners passent a database 3.12.1 et outbox 0.10.27 (ils resolvaient 3.11.0 et 0.10.19). Pas de tests unitaires dans les runners : build, lint et E2E (label `docker-and-e2e`).
- ms-social#64 : domain-social 0.17.0 vers 0.17.1. 197 tests unitaires, E2E via le label.
- Merger les deux une fois la CI verte. Sur api-gateway et npm-packages, `main` exige une review : Claude Code refuse `gh pr merge --admin`, c'est le Lead Dev qui merge.

## Reste a faire
1. Avis du Lead Dev : pour exclure les events des utilisateurs bloques, la gateway appelle `adminGetUserEvent` de ms-social au nom d'un utilisateur normal (ms-social n'a pas de garde de role). Garder, ou ajouter une RPC dediee (changement proto).
2. Lot 3 : saga de suppression de compte complete, confiee a un orchestrateur autonome. Mandat et plan : `docs-handoff-user-deletion-e2e.md` ; prompt de lancement : `docs-prompt-user-deletion-e2e.md`. DLQ et idempotence ensuite.
3. Ticket G2 : pas de feedback `event.geocoding_failed` (le gather EVENT_CREATION attend le reaper).

## Regles de travail apprises
- Merger les PR des repos avant la PR ci-tools qui en depend ; une PR ci-tools qui ajoute des runners est suivie tout de suite de la PR api-gateway qui retire les creations manuelles concurrentes.
- Une PR api-gateway qui depend d'un changement de compose pointe son sous-module ci-tools sur la branche ci-tools, puis sur main apres merge.
- Un test qui revele un bug n'est pas adapte : `it.failing` + correctif ou ticket. Une course corrigee par marqueur rend le `it.failing` intermittent : le repasser en `it` des le correctif merge, avant de merger les scenarios.
- Apres un merge qui change des runners, attendre que la CI de main du runner ait publie l'image avant de relancer l'E2E d'une PR qui en depend.
- Job CI fige pendant un incident GitHub Actions (githubstatus.com) : lire les etapes avec `gh api repos/<org>/<repo>/actions/jobs/<id>` avant de conclure.
- Rejouer l'E2E en local seulement avec `COMPOSE_PROJECT_NAME` dedie ; la machine locale ne tient pas la stack complete : se fier a la CI.
