# Handoff : montée en charge (rampe de charge) et goulots de la plateforme

État vérifié le 2026-11-08 à 22:55Z. Tout ce qui est marqué INFERENCE ou NON VERIFIE n'a pas été mesuré.
Mémoire de projet associée : `project-load-ramp` (index `MEMORY.md`, chargé automatiquement). Méthode, scripts et chiffres de référence : skill `volontariapp-load-ramp`.

## 1. Question de départ et réponse

Victor (Lead Dev) voulait savoir combien d'utilisateurs simultanés la plateforme tient, et ce qu'il faut pour 300 puis 1 000 req/s. Méthode : rampe de lecture seule depuis son Mac vers la gateway publique, par paliers, avec enregistreurs côté cluster et côté VM.

Réponse mesurée (mélange de l'application `events-list-app:40,posts-list:30,me:20,is-following:10`, VM de 14 vCPU) :
- **200 req/s tiennent sans erreur mais sans marge** (p95 1 316 ms, p99 2 219 ms, nœud à 74-81 %). **250 req/s s'effondre** (p50 10 s, 51,7 % d'erreurs).
- Hypothèse non mesurée : un utilisateur actif émet une requête toutes les 5 à 10 s, soit 1 000 à 2 000 utilisateurs actifs à 200 req/s.
- **300 req/s ne tient pas sur cette VM sans baisser le coût par requête d'environ un tiers** (INFERENCE : coût marginal de 52m de CPU par req/s au-delà de 150 req/s, 14 CPU) **ou sans seconde machine physique** (l'hôte Proxmox n'a que 16 threads, la VM en a déjà 14).
- 1 000 req/s : plusieurs nœuds (les bases sont en `local-path`, épinglées au nœud), non étudié.

## 2. Résultats mesurés

Soir du 2026-11-08, `ms-social` 2 réplicas à 512Mi, exclusions de recherche en 1 appel, enregistreurs `rec3`.

| Palier | p50 | p95 | Erreurs | Nœud (vCPU) | Remarque |
| ---: | ---: | ---: | ---: | ---: | :--- |
| 25 | 47-53 ms | 63-75 ms | 0 % | | palier lancé 2 min après le déploiement de la gateway |
| 50 | 46-48 ms | 61-67 ms | 0 % | 2,0 | |
| 75 | 46-47 ms | 63-78 ms | 0 % | 2,7 | |
| 100 | 48 ms | 68 ms | 0 % | 3,3 | |
| 150 | 55 ms | 167 ms | 0 % | 5,9 | à-coup d'une seconde (992 ms) fenêtre 5 |
| 200 | 171 ms | 1 316 ms | 0 % | 10,5-11,4 | HPA gateway de 3 à 5 pods à 22:43:39 et 22:43:54Z |
| 250 | 10 000 ms | 10 002 ms | 51,7 % | 12,0 | arrêt par l'abort-policy après 30 s |

À 250 req/s, par route : `events-list-app` 2 255 erreurs sur 2 658, `is-following` 432 sur 599, `posts-list` 415 sur 1 703, `me` 0 erreur mais p50 825 ms. Seules les routes qui appellent `ms-social` échouent. Au pic (22:47:39Z), un `ms-social` est à 726m sur sa limite de 800m, l'autre à 473m ; Traefik (un seul pod) 845m, Datadog 676m, `ms-post-db` 825m, gateway 685-809m par pod (6 pods, maximum de l'HPA). Latence moyenne Traefik : 680, 1 563, 1 423, 1 260, 3 004, 4 156, 6 012 ms sans trou de débit (signature de saturation, pas de gel de la VM). Aucun redémarrage, aucune terminaison `OOMKilled`, lectures disque sous 1,5 Mo/s.

Répartition du CPU du nœud à 200 req/s (22:44:20Z) : gateway 3,48 vCPU (5 pods), `ms-event` 1,21, `ms-social` 1,13, `ms-post-db` 0,82, `ms-post` 0,73, `ms-event-db` 0,64, `neo4j` 0,62, `datadog-agent` 0,57, `ms-user` 0,35, `traefik` 0,28 ; somme des pods 10,36 pour un nœud à 11,45.

Historique : avant les correctifs de ce chantier, la limite était entre 100 et 125 req/s ; l'après-midi du 2026-11-08 sur 12 vCPU et sans filtres, 200 tenait (p95 1 236 ms) et 225 cédait.

## 3. Causes trouvées et corrigées

1. **Neo4j saturé** par `worker-ranking` : `workers-runners#62`.
2. **Comptage SQL de `posts-list`** : `npm-packages#309` (`domain-post` 3.10.16).
3. **Gels de la VM** par des lectures disque continues de l'outbox (index manquant, lignes `COMPLETED` jamais purgées) : `npm-packages#310` (`database` 3.13.0), migration poussée dans 9 dépôts.
4. **`ms-social` OOMKilled à 256Mi** (123Mi au repos) 17 s après le début d'un palier à 100 req/s avec la route `events-list-app`. Cause : chaque requête de l'application faisait 5 lectures paginées d'exclusions plus 1 comptage, soit 6 appels `ms-social` et 10 requêtes Cypher, jusqu'à 10 000 identifiants par liste alors que `ms-event` n'en garde que 1 000.
   - Correctif : RPC `GetSearchExclusions` (1 appel, 1 000 identifiants au plus par liste, drapeaux de troncature) : `proto-registry#43`, `npm-packages#311` et `#312` (`domain-social` 0.19.1, `contracts` 4.13.1, `contracts-nest` 3.4.10), `ms-social#69`, `api-gateway#115`. Vérifié : 2 appels `ms-social` par requête au lieu de 6.
   - Marge : `deploy#67` (`ms-social` à 512Mi, 2 réplicas).

## 4. État des changements (2026-11-08)

| Quoi | Où | État |
| :--- | :--- | :--- |
| Index outbox, purge | `npm-packages#310`, migration dans 9 dépôts | fusionnés et déployés |
| `GetSearchExclusions` | `proto-registry#43`, `npm-packages#311` et `#312`, `ms-social#69` (image `2d033fb`), `api-gateway#115` (image `bd122ed`) | fusionnés et déployés, ordre `ms-social` puis gateway respecté |
| `ms-social` 512Mi et 2 réplicas | `deploy#67` | fusionnée et déployée |
| Route de rampe `events-list-app` | `traffic-simulator#10` | fusionnée |
| Simulateur remis (revert de `deploy#64`) | `deploy#66` | **OUVERTE, à fusionner par Victor maintenant que les mesures sont finies** (le simulateur redémarre à la fusion) |
| Skills et handoff | `meta` | commités (voir section 9) |

## 5. Non vérifié, à ne pas supposer

- Pourquoi le palier 200 a vu l'HPA ajouter 2 pods : pic réel ou seuil à 500m trop bas. L'effet des pods froids sur le p95 du 200 n'est pas isolé.
- Si c'est la boucle d'événements de `ms-social` ou Neo4j qui limite à 250 req/s (le CPU de `neo4j` est à 556m au pic). Aucune mesure de la boucle d'événements.
- Le coût de la gateway : 17 ms de CPU par requête (3,5 vCPU pour 200 req/s) est un calcul, pas un profil. Rôle de la journalisation (lignes `debug` en production dans `ms-social`) non mesuré.
- Datadog : 0,57 à 0,68 vCPU, cause (volume de journaux ?) non établie.
- Le gain d'une répartition gRPC équilibrée : constat de 62 contre 2 469 lignes `gRPC:` après le déploiement, puis 345 contre 693 pendant la rampe ; aucune mesure du gain attendu.
- La cause de l'à-coup d'une seconde à 150 req/s (22:41:12Z).
- `psi.log` de la VM : jamais lu (la lecture de Traefik montre une saturation, pas un gel).
- Doublons `errors` dans `node_modules` de `ms-social` (0.7.0 à la racine, 0.6.5 sous `auth`) : existent aussi ailleurs, effet non testé.
- Cause de 2 lignes `PROCESSING` et 4 `FAILED` de `event_queue` de `ms-ranking`, et des 248 000 `COMPLETED` de `jobs_outbox` jamais supprimées : non cherchées.
- Volume des tables d'outbox des autres bases : jamais lu (accord explicite requis pour toute lecture de base de production).

## 6. Décisions de Victor

- Pas de cache avant 300 req/s (un seul niveau, en mémoire, à la gateway, jamais dans `redis-master-0`). Pas de seconde base. Le cache a été renvoyé à une PR séparée, après mesure : il faut d'abord savoir ce que l'appel unique a gagné (ce handoff répond : le palier 250 reste limité par `ms-social` et la gateway).
- Si un cache est fait : variante « tout en cache 5 s, blocages compris », à valider par Victor (un blocage serait visible 5 s de plus dans le fil). Variante « participation seule en cache » déconseillée : 2 appels à chaque échec, rentable seulement au-dessus de 50 % de réussite.
- Index et purge partout, rétention 1 jour. Poussée directe sur `main` autorisée pour les dépôts de ce chantier ; pour `deploy`, c'est Victor qui fusionne. L'agent peut lever le verrou du STOP après les conditions de `AGENTS.md` section 1 (fait le 2026-11-08 après vérification de 16 versions).

## 7. Outils et commandes

Tout est dans la skill `volontariapp-load-ramp` : commande de la rampe, `jq` par route, `scripts/record-ramp.sh` (30 pods de tous les namespaces plus `SOMME-PODS`), `scripts/traefik-percentiles.py`, `scripts/disk-read-rate.py`, enregistreur de pression E/S de la VM. Pour la route de l'application : `LOAD_MIX="events-list-app:40,posts-list:30,me:20,is-following:10"`.

## 8. Prochaines étapes proposées (à soumettre, rien n'est fait)

1. **Fusionner `deploy#66`** (Victor) : le simulateur revient.
2. **Répartition gRPC** : service headless et `round_robin` côté client dans `api-gateway`, puis 3 réplicas de `ms-social`. `ms-social` est le premier composant qui casse à 250 req/s et un réplica prend les deux tiers du trafic.
3. **Alléger la gateway** : profil CPU (journalisation `JSON.stringify` par requête, masquage des données personnelles, mapping des DTO). 17 ms de CPU par requête est la plus grosse ligne.
4. **Journaux** : passer les lignes `debug` de `ms-social` (et des autres `ms-*`) à `info` en production ; l'agent Datadog consomme plus que `ms-user`.
5. **Traefik et CoreDNS à 2 réplicas** (Traefik à 845m au pic, un seul pod).
6. **Cache** (PR séparée, après 2 à 4) : voir section 6.
7. Index `job_audit(status, created_at)` et lignes `PROCESSING` coincées de `ms-ranking`.
8. **Plus de CPU** : l'hôte Proxmox a 16 threads et la VM 14 ; au-delà, seconde machine physique avec les `ms-*` sans état dessus.

## 9. Pièges appris

- Une migration TypeORM qui déclare `transaction = false` est refusée en mode `all` : pas de `CREATE INDEX CONCURRENTLY` dans une migration.
- Une gateway redémarrée donne plusieurs secondes de p95 pendant 2 à 3 minutes. Un déploiement progressif de la gateway renouvelle ses connexions gRPC (utile pour répartir sur 2 `ms-social`). L'HPA ajoute des pods froids en cours de palier : relever `kubectl describe hpa api-gateway`.
- `yarn up` de `bridge-nest` seul casse `/health` : `health-check-nest` 0.1.42 épingle `bridge-nest` 0.3.21 (deux copies de `NestNeo4jProvider`). Monter `health-check-nest` 0.1.43 et `errors-nest` 0.14.1 avec lui, et vérifier qu'il ne reste qu'une copie.
- `ci-docker` échoue exprès sans le label `docker-and-e2e` ; le poser avec `scripts/pr-label.sh` puis `gh run rerun <id> --failed`. Ne pas poser `notify-discord` sur une PR qui ne doit pas être fusionnée tout de suite (la gateway avant `ms-social`).
- Une PR automatique de sync proto peut entrer en conflit de version avec une PR fusionnée avant elle : fusionner `origin/main` dans la branche du bot, bumper en patch, mettre la section de dépendances au-dessus. Le registre npm répond avec un délai après `Definitive Release`.
- Les deux déploiements (`ms-social` puis gateway) s'ordonnent par la durée de chaque CI : surveiller `deploy` et `kubectl` avant de croire à l'ordre.
- `gh run list --commit` exige le SHA complet. Le `bash` du Mac n'a pas `declare -A`. `cd` est surchargé par `z` : chemins absolus ou `bash -c 'cd ... && ...'`. `echo "====="` casse dans zsh.
- Le build complet de l'overlay `prod` ne passe pas en local (chart Helm de `db-postgres`) : valider la base avec `kustomize build` et un bloc `replicas`.
- Un hook refuse emoji et tirets cadratins dans les messages de commit et de PR, y compris la ligne d'attribution (écrire « Generated with [Claude Code](https://claude.com/claude-code) » sans emoji).
- Ne jamais lancer l'E2E en local. Commits au format `type(scope): ...` avec la ligne `Co-Authored-By` demandée par la session.

## 10. Worktrees

Supprimés à la clôture (travail fusionné et poussé, 18 worktrees) : ceux des PR du chantier, dont `outbox-index-*`, `npm-outbox-purge`, `outbox-runners-purge`, `ppr-jobs-outbox`, `deploy-social-mem`, `proto-search-exclusions`, `npm-search-exclusions`, `npm-sync-proto-conflicts`, `ms-social-exclusions`, `gateway-exclusions`.

**À conserver pour l'instant** : `deploy-resume-simulator` (PR `deploy#66` ouverte) et `ts-load-realistic` (il contient `load-report-app.json` et `load-report-app-high.json`, les rapports de rampe de Victor, non suivis ; les copier ailleurs avant de le supprimer).

## 11. Skills à appeler

`volontariapp-load-ramp` (méthode et lecture), `diagnosing-bugs` (nouveau goulot), `volontariapp-api-gateway` et `volontariapp-grpc-microservice` (répartition gRPC, allègement de la gateway), `volontariapp-deploy-gitops` (réplicas, Traefik), `volontariapp-shared-npm-package-change` et `volontariapp-proto-contract-evolution` (toute évolution de contrat), `tdd`, `volontariapp-skill-evolution` en fin de session.

## 12. Pointeurs

PR : `proto-registry#43`, `npm-packages#309` à `#312`, `ms-social#69`, `api-gateway#115`, `deploy#65` à `#67`, `traffic-simulator#8` à `#10`, `workers-runners#62`, tous sur `github.com/Volontariapp/<dépôt>`. Documentation du ranking : `docs/matching/`. Rapports de rampe : `load-report-*.json` sur le Mac de Victor (non accessibles à l'agent, les lui demander). Enregistreurs du soir : dossier `rec3` du répertoire de session de l'agent.
