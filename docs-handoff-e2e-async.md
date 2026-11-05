# Handoff : E2E asynchrone (mis a jour le 2026-11-05 au soir)

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

## Merge le 2026-11-04 au soir
- outbox-runners#45 (database 3.12.1, outbox 0.10.27) et ms-social#64 (domain-social 0.17.1). ms-social#64 a ete mergee avec un E2E rouge : voir G6 ci-dessous.

## Lot 3 : saga de suppression de compte (termine le 2026-11-05)
Rapport : https://claude.ai/artifact/AoedfzS4DYxQnNMmuV4fE6. Detail : `docs-handoff-user-deletion-e2e.md`.
- Scenario `e2e/scenarios/user-deletion-scenarios.e2e.spec.ts` (api-gateway#102, #103) : un user riche supprime, un test par domaine, vert sur `main`.
- Stack : ci-tools#73 (7 runners de la saga), post-processors-runner#64 (`GEOCODING_ENABLED`).
- G5, fichiers d'un compte supprime purges : npm-packages#290 (domain-storage 0.13.0), post-processors-runner#65 et #66, workers-runners#55 (`CleanupFilesHandler`).
- G6, deux copies de database dans ms-social (likes casses) : ms-social#65.
- G8, mise a jour perdue du gather (deux acquittements simultanes) : ws-service#52.

## Lot 4 : fiabilite du stockage et des sagas (termine le 2026-11-05)
Rapport : https://claude.ai/artifact/HTt9CDVD8NxSiustW5x8VF. Mandat : `docs-handoff-async-robustness.md`, etat de reprise : `docs-state-async-robustness.md`.
- Hook du STOP sous `.worktrees/` : meta#47 (le repo d'un fichier est lu sur son remote `origin`).
- G2, feedback `event.geocoding_failed` : post-processors-runner#67, ws-service#53. Preuve par tests unitaires (geocodage desactive en E2E).
- G9, fichiers d'un post ou d'un event supprime, d'un avatar ou d'une cover remplace, non purges : npm-packages#291 (domain-storage 0.14.0 : `releaseForEntity` et `releaseFile` ecrivent `storage.cleanup_files` dans leur transaction), post-processors-runner#68, scenario `storage-release-scenarios.e2e.spec.ts` (api-gateway#104) vert sur `main`.
- Purge periodique : `requestPurge` (domain-storage 0.14.0), commande `dist/commands/request-file-purge.js` (ms-storage#47, logs JSON ms-storage#49), CronJob `ms-storage-purge` toutes les 15 minutes (deploy#38). Verifie dans le cluster : jobs de 17:15 et 17:30 termines (« no ORPHANED file »).
- G7, avatar en 503 au premier appel vers ms-storage : la cause n'etait pas la connexion gRPC mais le DNS de compose. ms-user, ms-post et ms-event demarraient avant le conteneur ms-storage (qui attend clamd et minio) : `Name resolution failed for target dns:ms-storage:5006`. Prouve par le journal du canal ajoute dans storage-client 0.3.10 (npm-packages#291, ms-user#86, ms-post#73, ms-event#87), qui a rendu l'echec systematique jusqu'a ci-tools#74 (les trois attendent ms-storage en `service_healthy`). Kubernetes n'est pas concerne.
- Notifications de posts intermittentes : non reproduites apres le lot 4 (E2E de `main` d'api-gateway vert sur plusieurs passages). Rouvrir avec les artefacts `e2e-diagnostics` si l'echec revient.
- Scenario `user.deletion_failed` : reste `it.todo`, aucun moyen non fragile de faire echouer une purge.
- Dependances realignees au passage : une seule copie de chaque `@volontariapp/*` dans ms-storage (errors 0.6.5 et 0.7.0 coexistaient) et ms-event (database, messaging).

## Reste a faire
Lot 5 : supprimer `adminGetUserEvent` (decision du Lead Dev du 2026-11-05). Ses trois appelants (gateway : filtre « utilisateurs bloques » de la recherche d'evenements et route admin `/social/users/:userId/events/created` ; worker-ranking : exclusion des evenements crees par l'utilisateur) passent par un nouveau champ `excluded_organizer_ids` de `SearchEventsQuery` filtre par ms-event, puis la RPC est retiree en trois phases (`reserved`).

## Regles de travail apprises
- Merger les PR des repos avant la PR ci-tools qui en depend ; une PR ci-tools qui ajoute des runners est suivie tout de suite de la PR api-gateway qui retire les creations manuelles concurrentes.
- Une PR api-gateway qui depend d'un changement de compose pointe son sous-module ci-tools sur la branche ci-tools, puis sur main apres merge.
- Un test qui revele un bug n'est pas adapte : `it.failing` + correctif ou ticket. Une course corrigee par marqueur rend le `it.failing` intermittent : le repasser en `it` des le correctif merge, avant de merger les scenarios.
- Apres un merge qui change des runners, attendre que la CI de main du runner ait publie l'image avant de relancer l'E2E d'une PR qui en depend.
- Job CI fige pendant un incident GitHub Actions (githubstatus.com) : lire les etapes avec `gh api repos/<org>/<repo>/actions/jobs/<id>` avant de conclure.
- Un client gRPC ouvert au demarrage exige que son service cible existe deja dans compose (`depends_on ... service_healthy`) : sinon le DNS de Docker ne resout pas son nom (G7).
- Quand une cause n'est qu'une hypothese, ajouter d'abord le journal qui la prouve ou la refute (G7 : la ligne READY du canal a montre le DNS, pas la connexion).
- Rejouer l'E2E en local seulement avec `COMPOSE_PROJECT_NAME` dedie ; la machine locale ne tient pas la stack complete : se fier a la CI.
