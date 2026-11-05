# Lot 4 : état de reprise (2026-11-05, session mise en pause)

À lire après `docs-prompt-async-robustness.md` et `docs-handoff-async-robustness.md`. Fichier non versionné, à intégrer dans la PR meta de fin de lot.

Rapport : https://claude.ai/artifact/HTt9CDVD8NxSiustW5x8VF (republier le même artefact par `url`).

## Fait
- **Gap 7 (hook du STOP)** : meta#47 mergée, checkout principal de meta à jour. Le verrou suit maintenant les worktrees : toute édition dans `.worktrees/npm-*` verrouille les consommateurs pour la session.
- **G9** : api-gateway#104 en brouillon (`test/g9-released-files-purged`, worktree `.worktrees/gw-g9`), scénario `e2e/scenarios/storage-release-scenarios.e2e.spec.ts`. CI verte : l'`it.failing` G9 a bien échoué (preuve rouge, run 42032281275).
- **G2** : post-processors-runner#67 et ws-service#53 ouvertes, sans changement npm. Relu, gather vérifié (`gather-state.service.ts` : clé FAILED, gather en échec). CI pas encore vérifiée. Ordre de merge libre.
- **Purge périodique** : CronJob commité en local dans `.worktrees/deploy-purge` (branche `feat/storage-purge-cronjob`, non poussée), kustomize OK. Il lance `node dist/commands/request-file-purge.js` de l'image ms-storage, qui n'existe pas encore : ouvrir la PR après la commande.

## Mise à jour après la reprise (2026-11-05, ~13:30 UTC)
- post-processors-runner#67 : CI verte, sans conflit. E2E sauté (pas de label) : sans objet, géocodage désactivé en E2E.
- ws-service#53 : le premier run a échoué uniquement parce que le label `docker-and-e2e` manquait. Label ajouté, puis run 42033818865 relancé à la main (ajouter un label ne relance pas la CI) : vérifier son résultat. Le sous-agent avait vu en local des erreurs `yarn lint` sur des specs hors tsconfig et des suites d'intégration en échec, sans les comparer à `main`.
- G7 s'est reproduit : relance de l'E2E de main d'api-gateway (run 42030386199, tentative 2). Même schéma : ms-user démarre à 13:10:20, ms-storage écoute à 13:10:35, l'appel part à 13:10:56.36 et expire à 13:10:58.37, 0 `ConfirmFileAttachment` reçu par ms-storage. Toute la suite de suppression de compte tombe (avatar posé dans son `beforeAll`). G7 a fait échouer 2 des 4 E2E de main observés : priorité haute. Aucun échec des notifications de posts reproduit pour l'instant.
- Rien n'a encore été édité dans npm-packages : le verrou du STOP n'est pas posé.

## Reste à faire, dans cet ordre
1. ws-service#53 : run 42033818865 vert (build, test, docker, Trivy). Les deux PR G2 sont prêtes à merger et ont été données au Lead Dev : vérifier si elles sont mergées, puis la CI de main et l'image publiée.
2. Tout autre travail chez les consommateurs AVANT l'étape 3 (le verrou bloque ensuite toute la session).
3. Une seule PR npm-packages (worktree `.worktrees/npm-g9`, branche `fix/storage-release-cleanup-job`, `yarn install` déjà fait, aucune édition) :
   - domain-storage : `releaseForEntity` et `releaseFile` écrivent le job `storage.cleanup_files` dans la même transaction quand au moins un fichier est libéré (emitterId : entityId et fileId), comme `releaseForOwner` (`postgres-file.repository.ts:651`, `writeCleanupJob` ligne 839). Ajouter `requestPurge(emitterId)` pour la commande ms-storage. Tests d'intégration d'abord dans `src/test/integration/postgres-file.repository.purge.int.spec.ts` (modèle : `releaseForOwner() cleanup job`). Postgres de test : `docker run -d --rm --name lot4-storage-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ms_storage -p 127.0.0.1:5437:5432 postgres:16-alpine`.
   - storage-client (G7) : à `onApplicationBootstrap`, ouvrir le canal sans bloquer (`clientGrpc.getClientByServiceName<Client>(STORAGE_SERVICE_NAME).waitForReady(deadline, cb)`), journaliser le délai jusqu'à READY (cette ligne est la preuve de la cause en CI) ; ajouter l'état du canal au journal de timeout. Tests : `src/test/storage-client.service.unit.spec.ts`.
   - build, test, changeset, STOP, demander merge et release.
4. Après publication et levée du verrou par le Lead Dev : `yarn up` domain-storage dans post-processor-storage (seul appelant de releaseForEntity/releaseFile, vérifié par grep exact sur origin/main de post-processors-runner, ms-storage, workers-runners) ; une seule copie de database dans yarn.lock. Commande ms-storage `src/commands/request-file-purge.ts` (DataSource de `src/config/data-source.ts`, env DB seul) avec domain-storage à jour. `yarn up` storage-client dans ms-user, ms-post, ms-event.
5. api-gateway#104 : passer l'`it.failing` en `it`, matrice sur la branche post-processors-runner, puis retour sur `main` après merge.
6. Notifications de posts : relancer l'E2E de main d'api-gateway (run 42030386199, une relance est partie avant la pause) et analyser un échec avec `e2e-diagnostics`. Script : `rerun-e2e.sh` (à réécrire, il était dans le scratchpad de la session).
7. Fin de lot : `docs-handoff-e2e-async.md`, `evolve.py plan/learn/sync`, mémoire projet, PR meta.

## Diagnostic G7 (faits du run 42009171163)
- ms-user démarre à 10:20:55, ms-storage écoute à 10:21:11. L'appel `ConfirmFileAttachment` part à 10:21:32.397, timeout à 10:21:34.421 ; ms-storage n'a rien reçu (inactif de 32,3 s à 41,9 s). Premier appel du canal de ms-user, boucle d'événements libre (le timer a tiré à 2,02 s).
- Le timeout est un `timeout` rxjs de storage-client, pas une deadline gRPC.
- Prototype local (grpc-js 1.14.6) : premier appel en 14 ms, même avec un serveur qui démarre après le client.
- Inférence non vérifiée : résolution DNS (`dns.lookup`, image `node:24-alpine`, musl) ou connexion du canal IDLE lente en CI.

## Décisions
- G2 : un géocodage sans résultat termine le gather en `event.creation_failed`, comme le reaper aujourd'hui, mais tout de suite.
- G9 : la purge est globale (`listPurgeCandidates`), donc le bug peut être masqué en E2E par une autre suite. La preuve rouge déterministe est le test d'intégration de domain-storage.
- `adminGetUserEvent` : décision du Lead Dev, non tranchée.

## Clôture (2026-11-05, ~17:45 UTC)
Lot terminé : détail et preuves dans la section « Lot 4 » de `docs-handoff-e2e-async.md` et dans le rapport.
- npm-packages#291 (domain-storage 0.14.0, storage-client 0.3.10), post-processors-runner#68, ms-storage#47 et #49, ms-user#86, ms-post#73, ms-event#87, api-gateway#104, ci-tools#74, deploy#38 : mergées.
- G7 : cause réelle = DNS de compose au démarrage, corrigée par ci-tools#74. L'hypothèse « connexion du canal » ci-dessus était fausse.
- Les étapes « Reste à faire » ci-dessus sont toutes faites.
- `adminGetUserEvent` : le Lead Dev a décidé de la supprimer (lot 5).
