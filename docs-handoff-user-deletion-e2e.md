# Handoff : E2E de la suppression de compte complète (rédigé le 2026-11-04)

Mandat du Lead Dev pour un orchestrateur autonome. Lire ce fichier en entier, puis `docs-handoff-e2e-async.md` (état du chantier E2E asynchrone) et les leçons des skills `volontariapp-implement-async-event-flow`, `volontariapp-user-account-deletion`, `volontariapp-ci-tools`, `volontariapp-api-gateway`, `volontariapp-shared-npm-package-change` (`references/lessons.md`).

## Objectif (le seul résultat que le Lead Dev regardera)

Un scénario E2E dans `api-gateway` (`e2e/scenarios/`, à côté de `user-scenarios.e2e.spec.ts`) qui tourne en CI et passe :

1. **Construire un utilisateur riche**, avec des interactions dans chaque domaine, via les routes REST et les sockets réelles :
   - profil complet et avatar (storage) ;
   - suit des utilisateurs et est suivi, en bloque un ;
   - crée des posts (dont un avec média et un rattaché à un événement), commente les posts des autres, like des posts ;
   - crée des événements (dont un avec cover et des participants), participe à et souhaite (wish) des événements d'autres organisateurs ;
   - laisse des traces dans ms-ranking (feed calculé, interactions comptées) ;
   - si accessible sans fragilité : badge ou score d'impact.
2. **Le supprimer** (`DELETE /api/v1/users/me`) et attendre la fin de la saga : notification WebSocket `user.deleted` (gather `USER_DELETION` réussi), puis suppression physique de la ligne `users` (`finalizeDeletion`).
3. **Prouver qu'il ne reste rien de récupérable**, domaine par domaine, en lisant comme un autre utilisateur et comme admin :
   - ms-user : `GET /users/:id` en 404, login refusé, ligne supprimée ;
   - ms-social : nœud absent, plus aucun lien follow, block, like, participation, wish, CREATED ou OWN ;
   - ms-post : ses posts en 404, absents des listes et de la recherche ; ses **commentaires conservés mais anonymisés** (auteur sentinelle, contenu remplacé) ;
   - ms-event : ses événements supprimés, y compris ceux qui avaient des participants ; absents de la recherche et des listes `participated/me` des autres ;
   - ms-storage : avatar, médias et covers purgés ;
   - ms-ranking : plus aucune donnée du user (`user_ranking.deleted`), ses contenus absents des feeds des autres ;
   - les autres utilisateurs restent intacts : leurs posts, commentaires, follows et participations entre eux.
4. **Un second scénario d'échec**, si faisable sans injection de panne fragile : un domaine qui échoue sa purge donne `user.deletion_failed` et le compte reste `PENDING_DELETION`.

Les `it.todo` à remplacer : `api-gateway/e2e/scenarios/user-scenarios.e2e.spec.ts`, bloc `describe('needs post-processor-post, post-processor-event, post-processor-storage, outbox-storage, outbox-ws and post-processor-user')`. Le catalogue `e2e/scenarios/README.md` est à mettre à jour (lignes `user.deleted`, `user_*.deleted`, `user.deletion_successfull`).

## Ce qui existe déjà (vérifié le 2026-11-04 sur origin/main)

- Flux (skill `volontariapp-user-account-deletion`) : `UserService.requestDeletion` passe le user en `PENDING_DELETION` et écrit `user.deleted` dans `event_queue`, dans une seule transaction. Ses `targetServices` sont `USER_DELETED` (ws-service, créateur du gather), `SOCIAL_USER`, `USER_DELETED_POST`, `USER_DELETED_EVENT`, `USER_DELETED_STORAGE` et `USER_DELETED_RANKING`. Le gather attend les retours des domaines, puis `user.deletion_successfull` part par outbox-ws vers post-processor-user, qui appelle `finalizeDeletion` (idempotent, seulement si `PENDING_DELETION`). `impact_score_credits` est supprimé en cascade avec le user.
- Décisions produit (leçon de 2026-10-11 dans `volontariapp-implement-async-event-flow`) : les événements du user sont supprimés même avec des participants ; les likes sont supprimés (DETACH DELETE) ; les commentaires sont conservés avec un `authorId` sentinelle et un contenu remplacé.
- Scénarios déjà verts (`user-scenarios.e2e.spec.ts`, bloc `account deletion`) : le nœud social et les follows disparaissent ; une seconde suppression est idempotente ; l'ordre création puis suppression rapprochées est couvert (G3).
- Stack E2E (`ci-tools/docker-compose.yml`, profil `e2e`) : api-gateway, les 6 ms-*, ws-service, outbox-user, -social, -event, -post, -ranking, post-processor-social, post-processor-ranking, worker-ranking.
- **Absents de la stack et nécessaires** : post-processor-post, post-processor-event, post-processor-storage, post-processor-user, outbox-storage, outbox-ws, worker-storage. Le scan antivirus (clamd) et minio sont déjà dans le compose.
- **Piège connu** : post-processor-event a été exclu au lot 2 parce que le géocodage est figé sur Paris en test. Il traite aussi `user.deleted` (`user_event.deleted`). Le réintégrer sans casser `event-search` : géocodage neutralisé en configuration de test, ou coordonnées toujours fournies par les scénarios. Choisir, documenter dans le README du catalogue.

## État au 2026-11-04 au soir (première session de l'orchestrateur)

Rapport : https://claude.ai/artifact/AoedfzS4DYxQnNMmuV4fE6. Étapes 1 à 3 faites, aucune PR mergée.

- **Blocage** : `gh pr merge <n> --squash --admin --delete-branch` est refusé par le classifieur de permissions de Claude Code (« Merge Without Review ») malgré le mandat ci-dessous. Pour qu'un orchestrateur merge lui-même, ajouter une règle `Bash(gh pr merge:*)` dans les settings avant de le lancer ; sinon le Lead Dev merge.
- **Ordre de merge** :
  1. ms-social#65 : une seule copie de `@volontariapp/database` (3.12.1). Corrige G6 : depuis ms-social#64, l'E2E de `main` échoue sur les 3 scénarios de like. Tout vert.
  2. post-processors-runner#64 : interrupteur `GEOCODING_ENABLED` (vrai par défaut). Son E2E n'a échoué que sur G6 : le relancer une fois l'image `latest` de ms-social publiée.
  3. ci-tools#73 : les 7 runners de la saga dans le profil `e2e`, `GEOCODING_ENABLED=false`, `E2E_S3_ORIGIN`.
  4. api-gateway#102 (brouillon) : le scénario. Son E2E est vert sur une matrice temporaire (ppr#64 et ms-social#65) et le sous-module ci-tools pointe sur la branche de #73. Avant de merger, remettre `e2e-matrix.json` sur `main`, pointer le sous-module sur `main` de ci-tools, relancer, puis sortir du brouillon.
- **G5 à corriger ensuite** (npm-packages, donc en dernier) : `releaseForOwner` passe les fichiers en `ORPHANED`, mais la purge `storage.cleanup_files` (doc `docs/stockage-fichiers/07`, section 3) n'existe pas, et l'avatar reste lisible à son URL publique (`it.failing`). Correctif proposé : domain-storage écrit un job `storage.cleanup_files` dans la transaction de `releaseForOwner` et expose une purge par lots des `ORPHANED` (`FOR UPDATE SKIP LOCKED` : suppression des objets public et quarantaine, puis `DELETED`) ; worker-storage ajoute le handler ; post-processor-storage fait `yarn up` de domain-storage ; l'`it.failing` repasse en `it`.
- **Scénario d'échec** : `it.todo`. Aucune route publique ne fait échouer une purge sans injecter de panne.

## Plan, dans cet ordre (une PR par repo, merge avant de passer à la suite)

1. **Cartographier** (`analyze_impact` sur `user.deleted` et `USER_DELETION`, profondeur 3 ou plus ; skill `volontariapp-trace-async-flow`) : la liste exacte des processors de purge, leurs retours et les clés `expects` du gather dans `ws-service/config/default.config.json`. Écrire la table « domaine, processor, retour attendu, observable REST » en tête du scénario.
2. **ci-tools** : ajouter les 7 services manquants au profil `e2e` (images taguées par branche, healthchecks rapides, comme au lot 2 : ci-tools#71, #72). Merger les PR des runners concernés avant celle de ci-tools si elles changent le compose.
3. **api-gateway** : écrire le scénario riche et le scénario d'échec. Toute création de nœud social manuelle concurrente du pipeline est interdite (cause du 409 du lot 2) : le graphe vient des runners. Pointer le sous-module ci-tools de la PR sur la branche ci-tools tant qu'elle n'est pas mergée, puis sur main (arbres identiques).
4. **Chaque trou révélé par le scénario** est un bug de code : `it.failing` avec un identifiant de gap (G5, G6...) dans le README du catalogue, puis correctif dans le repo concerné, puis retour à `it`. Ne jamais adapter le test pour qu'il passe.
5. **npm-packages en dernier si un package doit changer** (STOP, AGENTS.md section 1) : build, tests, `yarn changeset add` et `yarn changeset version` une seule fois par branche, PR, merge, release CI, vérification `npm view ... --prefer-online` de chaque version, levée du verrou (mandat ci-dessous), puis `yarn up` chez les consommateurs.
6. **Fin** : CI de `main` verte partout, handoff `docs-handoff-e2e-async.md` mis à jour, leçons et vérifications de skills (`evolve.py plan`, `learn`, `sync`), mémoire de projet, PR `meta`.

## Mandat d'autonomie

- **Merges** : la règle `Bash(gh pr merge:*)` est autorisée par le Lead Dev. Merger soi-même (`gh pr merge <n> -R Volontariapp/<repo> --squash --admin --delete-branch`) seulement si tous les checks sont `SUCCESS` ou `SKIPPED` et `mergeable` vaut `MERGEABLE`. Jamais de merge avec une CI rouge ou en cours.
- **Verrou STOP** : l'orchestrateur est mandaté pour lancer `.claude/hooks/stop-rule-guard.sh release` aux trois conditions d'AGENTS.md section 1.
- **Ne jamais demander au Lead Dev** : trancher selon les décisions produit ci-dessus et les skills ; à défaut, choisir l'option la plus conservatrice (rien de supprimé ou d'exposé en plus de ce qu'impose le RGPD), l'écrire dans le README du catalogue et dans le rapport, continuer.
- **Discord** : 1 PR = 1 message, envoyé par le job `notify-ready` de la CI quand la PR est verte et sans conflit. Aucun webhook manuel.
- **Interdits qui restent** : `--force` sur une branche partagée, `git reset --hard` sur le travail d'un autre, `--dangerously-skip-permissions`, contourner un hook, `as unknown as` ou `any`, toucher aux branches locales en cours du Lead Dev (travailler en worktree depuis `origin/main`).

## Règles de travail apprises (sessions du 2026-11-03 et du 2026-11-04)

- Les checkouts locaux sous `meta` sont souvent en retard ou sur une autre branche : lire l'état réel avec `git -C <repo> show origin/main:<fichier>` et travailler en worktree. `consumers.py` lit les checkouts locaux.
- Après un merge qui change un runner, attendre que la CI de `main` du runner ait publié son image avant de relancer l'E2E d'une PR qui en dépend.
- Une course corrigée côté consommateur rend un `it.failing` intermittent : le repasser en `it` dès que le correctif est mergé.
- Un post-processor qui avale une erreur acquitte le message et le perd ; une erreur d'infrastructure doit être relancée (elle reste pending, pas de DLQ).
- Tests de délai : horloge manuelle (`jest.spyOn(Date, 'now')`), jamais de vraies attentes.
- Job CI figé pendant un incident GitHub Actions (vérifier githubstatus.com) : lire les étapes avec `gh api repos/Volontariapp/<repo>/actions/jobs/<id>` avant de conclure.
- La machine locale ne tient pas la stack complète : se fier à la CI. Un Redis jetable (`docker run --rm -p 127.0.0.1:6379:6379 redis:7.2.4-alpine redis-server --requirepass password`) suffit pour les tests d'intégration de post-processors.
- `cd` est surchargé par `z` dans ce shell : chemins absolus et `git -C`.
