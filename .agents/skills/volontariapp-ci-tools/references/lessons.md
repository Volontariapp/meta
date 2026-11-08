---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-ci-tools, du plus récent au plus ancien."
tags: [lessons, volontariapp-ci-tools]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T09:12:34Z"
sources:
  - id: src-471bbb9a
    resource: ci-tools/.github/workflows/service-docker-build-push.yml
    title: ci-tools/.github/workflows/service-docker-build-push.yml
  - id: src-cbb46bc1
    resource: ci-tools/.github/workflows/e2e-orchestrator.yml
    title: ci-tools/.github/workflows/e2e-orchestrator.yml
  - id: src-44d20cb6
    resource: ci-tools/.github/workflows/runner-pipeline.yml
    title: ci-tools/.github/workflows/runner-pipeline.yml
  - id: src-71dc1dab
    resource: ci-tools/.github/workflows/sync-all.yml
    title: ci-tools/.github/workflows/sync-all.yml
  - id: src-5601ca7f
    resource: ci-tools/docker-compose.yml
    title: ci-tools/docker-compose.yml
  - id: src-f3a7c24a
    resource: ci-tools/.github/workflows/pr-ready-notify.yml
    title: ci-tools/.github/workflows/pr-ready-notify.yml
  - id: src-b055c722
    resource: "https://www.githubstatus.com/"
    title: "https://www.githubstatus.com/"
  - id: src-3eedff94
    resource: "https://github.com/Volontariapp/ci-tools/pull/73"
    title: "https://github.com/Volontariapp/ci-tools/pull/73"
  - id: src-58fb5d2c
    resource: "https://github.com/Volontariapp/post-processors-runner/pull/66"
    title: "https://github.com/Volontariapp/post-processors-runner/pull/66"
  - id: src-1b8aa8aa
    resource: "https://github.com/Volontariapp/api-gateway/pull/102"
    title: "https://github.com/Volontariapp/api-gateway/pull/102"
  - id: src-191c6e6a
    resource: "https://github.com/Volontariapp/ws-service/pull/52"
    title: "https://github.com/Volontariapp/ws-service/pull/52"
  - id: src-b4ad13c6
    resource: "https://github.com/Volontariapp/ci-tools/pull/74"
    title: "https://github.com/Volontariapp/ci-tools/pull/74"
  - id: src-1eaef6a8
    resource: "https://github.com/Volontariapp/api-gateway/pull/104"
    title: "https://github.com/Volontariapp/api-gateway/pull/104"
  - id: src-e177b427
    resource: "https://github.com/Volontariapp/api-gateway/pull/107"
    title: "https://github.com/Volontariapp/api-gateway/pull/107"
---

# Leçons

## 2026-11-08 - Conteneur runner unhealthy en E2E : deux copies de @volontariapp/bridge

- **Type :** pitfall
- **Leçon :** Le healthcheck des runners est wget sur /health. Un /health qui repond 500 (Postgres provider missing for health-check) vient d un registre de providers en double : en epinglant des versions exactes (bridge-nest 0.3.22, database 3.12.10) sans aligner health-check-nest, l image contenait bridge 1.0.10 en tete et 1.0.11 sous bridge-nest, database et post-processors. Verifier avec find node_modules -path */@volontariapp/bridge/package.json dans l image ; corriger en epinglant bridge, health-check et health-check-nest (0.1.43) ensemble. Reproduction locale hors suite E2E : copier docker-compose.yml dans un dossier temporaire, generer les certificats (scripts/generate-certs.sh), docker compose --profile e2e up -d <service> avec un override platform linux/amd64 pour le seul service applicatif (redis segfault sous qemu amd64 sur Apple Silicon).[^src-5601ca7f]
- **Consigné par :** claude-code/agent

## 2026-11-06 - Assertion « n'est pas compté » dans un E2E: utiliser un utilisateur-barrière

- **Type :** rule
- **Leçon :** Les flux sont lus dans l'ordre par un seul consommateur. Pour prouver qu'une action n'a pas été comptée sans pause fixe, un second utilisateur effectue la même action ensuite et on attend que son propre compteur bouge: tout ce qui précède dans le flux est alors traité. Voir e2e/scenarios/badge-scenarios.e2e.spec.ts.[^src-e177b427]
- **Consigné par :** claude-code/agent

## 2026-11-06 - Pile E2E: le saga de création d'événement ne se termine pas (géocodage coupé)

- **Type :** pitfall
- **Leçon :** post-processor-event tourne avec GEOCODING_ENABLED=false pour ne pas déplacer les événements des scénarios. Il acquitte event.created sans émettre EVENT_GEOCODED, donc la collecte EVENT_CREATION ne se clôt pas et event.creation_successfull n'est pas émis dans cette pile (aucune trace dans les logs de la CI du 2026-11-06). Les badges et notifications qui en dépendent (EVENT_HOST_COUNT_1) ne sont pas testables: it.todo.[^src-5601ca7f]
- **Consigné par :** claude-code/agent

## 2026-11-06 - Diagnostiquer une CI E2E en échec sans la relancer

- **Type :** command
- **Leçon :** Consigne du Lead Dev: ne jamais lancer les E2E en local. Récupérer les logs du job (gh run view), puis l'artefact e2e-diagnostics (gh run download <run> -n e2e-diagnostics): logs de chaque conteneur, tables event_queue, longueurs des streams Redis. L'étape de collecte ne s'exécute qu'en cas d'échec.[^src-cbb46bc1]
- **Consigné par :** claude-code/agent

## 2026-11-06 - Le job qui lance les E2E s'appelle e2e / Run End-to-End Tests

- **Type :** pitfall
- **Leçon :** ci-docker / docker ne fait que construire l'image (moins d'une minute). Surveiller ce job pour savoir si les E2E sont terminés, et lire ses logs avec gh run view <run> --job <id> --log. Sans le label docker-and-e2e le job échoue à l'étape de contrôle du label.[^src-cbb46bc1]
- **Consigné par :** claude-code/agent

## 2026-11-05 - Tester un changement de ci-tools avant son merge : pointer le sous-module d'une PR sur la branche

- **Type :** command
- **Leçon :** L'E2E lit ci-tools/docker-compose.yml depuis le sous-module ci-tools du repo appelant (checkout submodules: recursive), pas depuis ci-tools main. Pour valider une PR ci-tools : dans une PR api-gateway, git -C ci-tools checkout <sha de la branche>, commit, push ; l'E2E joue alors la branche. Après le merge (squash : nouveau sha), sync-all.yml met à jour le sous-module de tous les repos sur main ; remettre ensuite le sous-module de la PR sur ce sha (merge de origin/main, conflit de sous-module résolu par checkout du sha de main).[^src-1eaef6a8]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-11-05 - Un client gRPC ouvert au démarrage exige que le conteneur cible existe déjà

- **Type :** pitfall
- **Leçon :** Dans compose, un nom de service ne résout dans le DNS de Docker qu'une fois son conteneur créé. ms-user, ms-post et ms-event ouvrent leur canal storage-client au démarrage (storage-client 0.3.10) alors que ms-storage démarre en dernier (il attend clamd et minio) : 'Name resolution failed for target dns:ms-storage:5006', canal en TRANSIENT_FAILURE, ConfirmFileAttachment en 503 à chaque run (G7). Correctif : depends_on ms-storage service_healthy pour chaque client. Tout nouveau client gRPC vers un service qui démarre tard suit la même règle. Kubernetes n'est pas concerné, le nom du Service résout toujours.[^src-b4ad13c6]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-11-05 - La CI de ws-service ne lance pas d'E2E

- **Type :** pitfall
- **Leçon :** Le 2026-11-05, ws-service#52 (G8) avait seulement Build & Test, Trivy, Validate Versions et ci-docker : aucun job E2E, contrairement aux ms-* et aux runners. L'image de branche est quand meme publiee sur GHCR (tag = nom de branche, '/' remplace par '-'). Pour valider un changement de ws-service de bout en bout, pointer e2e-matrix.json d'une PR api-gateway sur la branche ws-service (validate-matrix echoue tant que la matrice n'est pas revenue sur main).[^src-191c6e6a]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-11-05 - Relancer un E2E de main qui a tire une image avant sa publication

- **Type :** pitfall
- **Leçon :** Le 2026-11-05, les E2E de ms-user, ms-post, ms-storage, ms-ranking et api-gateway, declenches par la synchro ci-tools a 09:49, ont tire les images a 09:51 alors que post-processor-event:latest (GEOCODING_ENABLED) n'a ete pousse qu'a 09:52:17 : event-search a echoue (geocodage Paris). Comparer l'heure de 'Docker Compose Pull' du run avec la fin de 'Build & Push Docker Image' du runner avant de chercher un bug ; une relance suffit.[^src-1b8aa8aa]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-11-05 - L'E2E d'une PR de runner ne joue que les scenarios du main d'api-gateway

- **Type :** pitfall
- **Leçon :** post-processors-runner#65 (domain-storage 0.13.0) etait vert alors qu'il cassait post-processor-storage (JobsOutboxModel absent des entites TypeORM : releaseForOwner annule, USER_STORAGE_DELETED jamais envoye). Le scenario de suppression qui l'aurait revele n'etait pas encore sur main (api-gateway#102). Quand un changement de runner sert un scenario pas encore merge, le valider sur la PR du scenario avec la matrice pointee sur la branche du runner (api-gateway#103), avant de merger le runner. Corrige par post-processors-runner#66.[^src-58fb5d2c]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-11-04 - Stack E2E de la saga de suppression de compte

- **Type :** decision
- **Leçon :** ci-tools#73 ajoute post-processor-post, -event, -storage, -user, outbox-storage, outbox-ws et worker-storage au profil e2e. post-processor-event tourne avec GEOCODING_ENABLED=false (post-processors-runner#64) : en NODE_ENV=test le geocodeur renvoie Paris et ecraserait les coordonnees des scenarios ; le gather EVENT_CREATION ne se termine donc jamais en E2E, et le reaper est coupe en NODE_ENV=test (ws-service gather-reaper.service.ts:43), donc outbox-ws n'injecte aucun creation_failed. api-gateway-e2e recoit E2E_S3_ORIGIN=http://minio:9000 : l'URL d'upload est signee pour localhost:9000, une politique POST ne signe pas l'hote, le test poste le meme formulaire a minio.[^src-3eedff94]
- **Consigné par :** claude-code/claude-opus-5-5

## 2026-11-04 - Job E2E fige pendant un incident GitHub Actions

- **Type :** pitfall
- **Leçon :** Pendant un incident Actions (githubstatus.com), un job peut finir toutes ses etapes en succes et rester in_progress sans completed_at, et l'annulation est refusee. Lire les etapes avec gh api repos/<org>/<repo>/actions/jobs/<id> : si Run E2E Tests est en succes et Collect E2E Diagnostics saute, le resultat est fiable. Ne pas relancer en boucle pendant l'incident.[^src-b055c722]
- **Consigné par :** claude-code/agent

## 2026-11-04 - post-processor-event hors de la stack E2E

- **Type :** pitfall
- **Leçon :** En NODE_ENV=test, la strategie OpenStreetMap de post-processor-event renvoie des coordonnees fixes (Paris) et ecraserait la localisation de chaque event, ce qui casse event-search : il n'est volontairement pas dans le profil e2e (ci-tools#72). Consequence : le gather event.created de ws-service attend GEOCODED_SUCCESS que rien n'emet et expire. Les runners du lot 2 dans la stack : outbox-event, outbox-post, outbox-ranking, post-processor-ranking, worker-ranking, ms-ranking (+ migration).[^src-5601ca7f]
- **Consigné par :** claude-code/agent

## 2026-11-04 - Matrice E2E : services dans e2e-services.txt, merger les repos avant ci-tools

- **Type :** rule
- **Leçon :** La liste des services E2E vit dans ci-tools/scripts/e2e-services.txt (lue par e2e-matrix-parsing.sh et validate-matrix-main.sh) ; une cle absente de e2e-matrix.json vaut main avec un warning. runner-pipeline.yml lance validate-e2e-matrix sur chaque evenement, y compris push sur main : quand un repo doit recevoir un nouveau e2e-matrix.json, merger sa PR AVANT la PR ci-tools, sinon le bump sync-all fait echouer son main. Les runners construisent toutes leurs images taguees par branche sur PR labellisee docker-and-e2e (input extra-tag de docker-build-push).[^src-44d20cb6]
- **Consigné par :** claude-code/agent

## 2026-11-04 - pg_isready par TCP avec un healthcheck rapide

- **Type :** pitfall
- **Leçon :** Avec start_interval 1s, pg_isready sans -h (socket unix) repond pret pendant l'init de l'image postgres (serveur temporaire socket-only, puis redemarrage) : les migrations partent trop tot et echouent en ECONNREFUSED, ce qui a casse l'E2E des 7 repos (ci-tools#68, corrige par #70). Toujours pg_isready -h 127.0.0.1 dans le compose.[^src-5601ca7f]
- **Consigné par :** claude-code/agent

## 2026-11-03 - PR empilee fermee au merge de sa base

- **Type :** pitfall
- **Leçon :** Une PR dont la base est une autre branche de PR est fermee automatiquement quand cette base est mergee avec --delete-branch (ci-tools#67 fermee au merge de #66). Avant de merger la base, rebaser la PR empilee (git rebase --onto origin/main <ancien sha de base>) et changer sa base vers main, ou ouvrir une nouvelle PR (ci-tools#68).[^src-71dc1dab]
- **Consigné par :** claude-code/agent

## 2026-11-03 - Runners async dans l'E2E et creation manuelle de noeuds

- **Type :** rule
- **Leçon :** Avec outbox-user et post-processor-social dans le profil e2e (ci-tools#66), un test ne doit plus creer a la main le noeud social d'un user inscrit via POST /users : la creation manuelle fait la course avec le post-processor et renvoie 409 quand il gagne. Utiliser waitForSocialUserNode (api-gateway e2e/helpers/social-node.helper.ts). Les runners exigent un /health (outbox-runners#41) et ne vont que dans le profil e2e, jamais dans le profil par defaut.[^src-5601ca7f]
- **Consigné par :** claude-code/agent

## 2026-11-03 - Projet compose local partage avec le dev

- **Type :** pitfall
- **Leçon :** Sans -p, docker compose -f ci-tools/docker-compose.yml prend le projet ci-tools : celui des volumes de dev locaux (ci-tools_postgres_*_data). Un replay local de l'E2E y applique les migrations des images latest et un down -v effacerait les donnees de dev. Rejouer l'E2E avec COMPOSE_PROJECT_NAME=volontariapp-e2e-local. Sur Mac arm64 les images GHCR n'existent qu'en amd64 : docker pull --platform linux/amd64, sans DOCKER_DEFAULT_PLATFORM au up (il refuse les images construites localement en arm64).[^src-5601ca7f]
- **Consigné par :** claude-code/agent

## 2026-11-03 - E2E compose lu depuis le sous-module de l'appelant

- **Type :** pitfall
- **Leçon :** e2e-orchestrator.yml vient de ci-tools@main, mais il lance docker compose -f ci-tools/docker-compose.yml depuis le sous-module ci-tools du repo appelant (checkout submodules: recursive). Un changement du compose n'atteint un repo qu'au bump de son pointeur (sync-all). Pour tester un compose non merge dans la CI d'une PR, pointer le sous-module de la PR sur le commit de la branche ci-tools, puis le re-pointer sur main apres merge (api-gateway#91).[^src-cbb46bc1]
- **Consigné par :** claude-code/agent

## 2026-11-03 - Label docker-and-e2e requis pour le CI Docker et e2e

- **Type :** pitfall
- **Leçon :** service-docker-build-push.yml et e2e-orchestrator.yml lisent le label docker-and-e2e (payload de la PR puis gh pr view en direct avec ORG_REPO_TOKEN, 10 essais espaces de 30 s). Sans lui, le job docker echoue avec une erreur; les repos declarent e2e avec needs: [ci-docker], donc le job e2e est saute et la PR n'est pas mergeable. Une PR sans le label ne valide donc jamais l'e2e avant merge: ajouter le label des l'ouverture de la PR, sinon les regressions e2e se decouvrent apres coup.[^src-cbb46bc1]
- **Consigné par :** claude-code/agent

## 2026-11-04 - Juger un test de notification Dependabot avec l'historique des labels et l'acteur du run

- **Type :** rule
- **Leçon :** Sur npm-packages#280, le message est parti sans label notify-discord : le job détecte l'auteur de la PR (dependabot[bot]) et pose lui-même discord-notified. Preuve : gh api repos/<repo>/issues/<n>/events (labeled par github-actions[bot], aucun notify-discord) et gh api repos/<repo>/actions/runs/<id> (actor). Un run dont l'acteur est un humain (push de merge dans la branche Dependabot) valide la détection par auteur, mais pas les restrictions Dependabot (jeton en lecture seule, secrets Dependabot), qui ne s'appliquent peut-être que si l'acteur est dependabot[bot] (non vérifié dans la doc GitHub). Ne pas conclure qu'un test est invalide ou valide avant d'avoir lu les événements de labels et l'acteur du run.[^src-f3a7c24a]
- **Consigné par :** claude-code/agent

## 2026-10-06 - CI d'un service : label docker-and-e2e, et le merge sur main deploie

- **Type :** rule
- **Leçon :** Sur une PR d'un service (ms-*), le job ci-docker / docker echoue avec 'The docker-and-e2e label is missing' tant que le label docker-and-e2e n'est pas pose (garde-fou dans ci-tools/.github/workflows/service-docker-build-push.yml et e2e-orchestrator.yml) : poser le label lance le build et le push de l'image sur GHCR puis les e2e (docker compose --profile e2e). Les depots de services n'ont pas de protection de branche : l'echec n'empeche pas le merge, et gh pr merge --auto peut merger immediatement. Le merge sur main declenche ci-docker, e2e puis deploy-push, qui met a jour le depot deploy (image epinglee par sha, ArgoCD) : verifier avant merge que deploy porte les variables d'environnement necessaires (par ex. MS_<SERVICE>_URL=0.0.0.0:3000, S3_*, SCANNER_*). Une PR empilee sur une autre branche n'a aucune CI : retargeter vers main apres le merge de la PR de base.[^src-471bbb9a]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : ci-tools/.github/workflows/**, ci-tools/docker-compose.yml, ci-tools/scripts/**.
- **Consigné par :** claude-code/claude-opus-5-5

[^src-471bbb9a]: ci-tools/.github/workflows/service-docker-build-push.yml
[^src-cbb46bc1]: ci-tools/.github/workflows/e2e-orchestrator.yml
[^src-44d20cb6]: ci-tools/.github/workflows/runner-pipeline.yml
[^src-71dc1dab]: ci-tools/.github/workflows/sync-all.yml
[^src-5601ca7f]: ci-tools/docker-compose.yml
[^src-f3a7c24a]: ci-tools/.github/workflows/pr-ready-notify.yml
[^src-b055c722]: https://www.githubstatus.com/
[^src-3eedff94]: https://github.com/Volontariapp/ci-tools/pull/73
[^src-58fb5d2c]: https://github.com/Volontariapp/post-processors-runner/pull/66
[^src-1b8aa8aa]: https://github.com/Volontariapp/api-gateway/pull/102
[^src-191c6e6a]: https://github.com/Volontariapp/ws-service/pull/52
[^src-b4ad13c6]: https://github.com/Volontariapp/ci-tools/pull/74
[^src-1eaef6a8]: https://github.com/Volontariapp/api-gateway/pull/104
[^src-e177b427]: https://github.com/Volontariapp/api-gateway/pull/107
