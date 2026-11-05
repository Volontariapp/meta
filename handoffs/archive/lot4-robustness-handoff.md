# Handoff : lot 4, fiabilité du stockage et des sagas (rédigé le 2026-11-05)

Mandat du Lead Dev pour un orchestrateur. Lire ce fichier en entier, puis `handoffs/e2e-async.md` (historique des lots 1 à 3) et les leçons (`references/lessons.md`) des skills `volontariapp-ci-tools`, `volontariapp-file-storage-flow`, `volontariapp-implement-async-event-flow`, `volontariapp-shared-npm-package-change`, `volontariapp-user-account-deletion`.

## Point de départ (vérifié le 2026-11-05 sur origin/main)

Lot 3 terminé : le scénario `api-gateway/e2e/scenarios/user-deletion-scenarios.e2e.spec.ts` (un user riche supprimé, un test par domaine) passe en CI sur `main`, purge des fichiers comprise. CI de `main` verte dans tous les repos.

Gaps fermés au lot 3 : G5 (purge des fichiers d'un compte supprimé : npm-packages#290, post-processors-runner#65 et #66, workers-runners#55), G6 (deux copies de `@volontariapp/database` dans ms-social : ms-social#65), G8 (mise à jour perdue du gather dans ws-service : ws-service#52). Détail : `handoffs/archive/lot3-user-deletion-handoff.md`.

## Objectif du lot 4

Chaque point ci-dessous est un bug ou un manque prouvé, à corriger avec un scénario E2E qui le prouve (`it.failing` avec son identifiant de gap dans `e2e/scenarios/README.md`, correctif, puis `it`). Ne jamais adapter un test pour qu'il passe.

1. **G9, fichiers d'un post ou d'un événement supprimé, d'un avatar ou d'une cover remplacé toujours téléchargeables.** Seul `releaseForOwner` écrit le job `storage.cleanup_files` (`npm-packages/packages/domain-storage/src/repositories/postgres-file.repository.ts:651`) ; `releaseForEntity` (ligne 538) et `releaseFile` (ligne 588) passent les fichiers en `ORPHANED` sans job. Correctif proposé : écrire le job dans la même transaction (comme `releaseForOwner`), puis `yarn up` de domain-storage dans post-processor-storage, et dans ms-storage si elle appelle ces méthodes (vérifier avec `find_dependents`). Scénario : supprimer un post avec média, puis remplacer un avatar ; l'URL publique de l'ancien fichier ne répond plus et le fichier passe `DELETED`.
2. **Déclencheur périodique de la purge** (filet de sécurité, doc `docs/stockage-fichiers/07-nettoyage-et-orphelins.md`, section 3) : commande de ms-storage qui écrit un job `storage.cleanup_files`, CronJob Kubernetes dans le repo `deploy` (skill `volontariapp-deploy-gitops`). Pas d'E2E possible (cron) : test unitaire de la commande et validation kustomize.
3. **G7, avatar en 503 au premier appel de ms-user vers ms-storage.** `ConfirmFileAttachment timed out after 2000ms`, la requête n'atteint pas ms-storage (aucun log `GrpcInternalGuard`) ; 1 run E2E sur 3 (api-gateway run 42009171163). Hypothèse non vérifiée : établissement du canal gRPC de `@volontariapp/storage-client` au premier appel, plus long que la deadline (ms-user `src/modules/user/storage-client-config.module.ts:16`). Consommateurs : ms-user, ms-post, ms-event (vérifié avec `find_dependents`). Commencer par prouver la cause (log de durée de connexion, ou test qui mesure le premier appel), puis corriger dans storage-client (ouverture du canal au démarrage du module, `waitForReady`), puis `yarn up` chez les trois.
4. **Notifications de posts intermittentes.** Deux échecs isolés en CI le 2026-11-05 : `post.deleted` (ms-social#65, premier run) et `post.created` (« concurrent posts of one author », api-gateway main, run 42005543337, premier passage). Les gathers POST_CREATION et POST_DELETION n'attendent qu'une clé : G8 ne les explique pas (inférence). Diagnostiquer avec `volontariapp-trace-async-flow` sur les artefacts `e2e-diagnostics` d'un run en échec (relancer l'E2E de `main` d'api-gateway plusieurs fois pour en obtenir un), corriger, ou documenter si la cause est l'infrastructure CI.
5. **G2, pas de feedback `event.geocoding_failed`** : post-processor-event logue et ignore un géocodage sans résultat (`event-created.post-processor.ts`) ; le gather EVENT_CREATION n'aboutit qu'au reaper.
6. **Scénario d'échec de la suppression** (`user.deletion_failed`, compte resté `PENDING_DELETION`) : `it.todo`, aucune route publique ne fait échouer une purge. N'y toucher que si un moyen sans injection de panne fragile existe ; sinon le laisser en `it.todo` et le dire.
7. **Hook du STOP** : `.claude/hooks/post-edit.sh` (ligne 22) et `stop-rule-guard.sh` (lignes 23-46) ne posent le verrou que si le premier dossier du chemin est `npm-packages` ou `proto-registry` ; une édition sous `.worktrees/` échappe au verrou. Corriger (résoudre le repo réel du fichier, par exemple avec `git -C <dossier> rev-parse --show-toplevel` puis le remote) et tester les deux cas.

En attente d'une décision du Lead Dev (ne pas trancher) : pour exclure les événements des utilisateurs bloqués, la gateway appelle `adminGetUserEvent` de ms-social au nom d'un utilisateur normal (ms-social n'a pas de garde de rôle). Garder, ou ajouter une RPC dédiée (changement proto).

Ordre recommandé : 7 (petit, protège la suite), 1 puis 2 (même zone, npm d'abord), 3, 4, 5. Chaque passage par npm-packages applique la règle du STOP (AGENTS.md, section 1).

## Ce que le Lead Dev fait, ce que l'orchestrateur fait

Constaté au lot 3 : le classifieur de permissions de Claude Code refuse `gh pr merge` (« Merge Without Review ») et `.claude/hooks/stop-rule-guard.sh release` (« Security Weaken »), même avec le mandat écrit. Donc :
- **le Lead Dev merge les PR et lève le verrou du STOP** (`! .claude/hooks/stop-rule-guard.sh release`) ;
- **l'orchestrateur** prépare chaque PR jusqu'à l'état « prête à merger » (CI verte, sans conflit, E2E qui joue le scénario concerné), donne le lien et l'ordre de merge, attend le « c'est mergé », vérifie la CI de `main` et la publication des images avant l'étape suivante.

Si le Lead Dev a ajouté des règles de permission entre-temps, l'orchestrateur essaie, et sur refus il ne contourne pas : il demande.

## Règles de travail apprises (lots 1 à 3)

- Vérifier l'état réel sur `origin/main` (`git -C <repo> show origin/main:<fichier>`) : les checkouts locaux sous `meta` sont souvent sur une autre branche. Travailler en worktree depuis `origin/main` sous `meta/.worktrees/`, jamais sur les branches locales du Lead Dev.
- **L'E2E d'une PR de runner ne joue que les scénarios déjà sur le `main` d'api-gateway.** Un changement de runner qui sert un nouveau scénario se valide sur la PR du scénario, matrice `e2e-matrix.json` pointée sur la branche du runner (le check `validate-matrix` échoue tant qu'elle n'est pas remise sur `main`). Post-processors-runner#65 était vert en cassant post-processor-storage pour cette raison.
- **La CI de ws-service ne lance pas d'E2E.** Valider un changement de ws-service via la matrice d'une PR api-gateway ; l'image de branche est publiée sur GHCR (tag = nom de branche, `/` remplacé par `-`).
- **Après un merge, attendre la publication de l'image** (`Build & Push Docker Image` de la CI de `main`, ou les tags de `gh api orgs/Volontariapp/packages/container/<image>/versions`) avant de relancer un E2E. Des E2E de `main` partis avant ont tiré l'ancienne image : comparer l'heure de « Docker Compose Pull » à celle du push avant de chercher un bug.
- **Après un `yarn up` de domain-*, une seule copie de chaque package partagé** dans `yarn.lock` (`database`, `outbox`, `messaging`, `post-processors`, `workers`) : deux copies de `database` ont cassé les likes (G6). Monter les dépendances directes aux versions que tire le domain-*.
- **Un nouveau modèle TypeORM utilisé par un repository partagé** doit être déclaré dans les entités du runner qui l'appelle (`forFeature` ou `entities`), sinon `EntityMetadataNotFoundError` : les tests unitaires qui mockent le repository ne le voient pas.
- **État partagé par plusieurs consommateurs** (gather, compteurs) : une seule instruction conditionnelle (`UPDATE ... RETURNING`), décision sur l'état renvoyé (G8).
- Un drapeau booléen lu depuis l'environnement passe par `booleanFlag` (`"false"` devient `true` par conversion implicite).
- Échec CI : télécharger les artefacts `e2e-diagnostics` (`gh run download <id> -n e2e-diagnostics`) : logs de chaque conteneur, `gather_state`, `event_queue`, `jobs_outbox`, streams Redis. Un échec Docker Hub ou un incident GitHub Actions se relance (`gh run rerun <id> --failed`).
- Tests de délai : horloge manuelle (`jest.spyOn(Date, 'now')`). Watchman est cassé sur la machine : `jest --watchman=false`.
- `cd` est surchargé par `z` : `builtin cd`, chemins absolus ou `git -C`.

## Fin du lot

Le lot est fini quand chaque point 1 à 5 et 7 est mergé avec son scénario (ou sa preuve) vert sur `main`, que la CI de `main` est verte partout, et que `handoffs/e2e-async.md`, les leçons de skills (`evolve.py plan`, `learn`, `sync`) et la mémoire de projet sont à jour dans une PR `meta`.
