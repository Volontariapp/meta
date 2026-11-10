---
name: volontariapp-load-ramp
description: "Mesurer la limite de la plateforme avec la rampe de charge (traffic-simulator, yarn load) : mode routes (4 routes de référence) ou mode app (toutes les lectures de nativapp, écritures du pool load.NNNN), profil d'attaque à froid, préparation et nettoyage des écritures, enregistreurs (Traefik, CPU, disque, flux asynchrones), lecture d'un palier, chiffres de référence séparés par mode."
type: Agent Skill
title: "Montée en charge : rampe, enregistreurs et lecture des résultats"
tags: [load-test, capacity, performance, playbook]
status: stable
paths:
  - "traffic-simulator/src/load/**"
  - traffic-simulator/src/load.ts
  - traffic-simulator/src/load-admin.ts
  - traffic-simulator/README.md
mesh_keys:
  - load
  - ramp
  - traffic-simulator
generated:
  by: claude-code/agent
  at: "2026-11-08T21:11:52Z"
verified:
  - by: claude-code/agent
    at: "2026-11-08T21:11:52Z"
  - by: claude-code/agent
    at: "2026-11-08T21:14:27Z"
    digest: 11f0d0ff3efc906d
  - by: claude-code/agent
    at: "2026-11-08T22:50:47Z"
    digest: 11f0d0ff3efc906d
  - by: claude-code/agent
    at: "2026-11-10T13:36:56Z"
    digest: da39a3ee5e6b4b0d
  - by: claude-code/agent
    at: "2026-11-10T13:55:09Z"
    digest: da39a3ee5e6b4b0d
sources:
  - id: runner
    kind: local_file
    resource: traffic-simulator/src/load/load-runner.ts
    title: load-runner.ts
  - id: abort
    kind: local_file
    resource: traffic-simulator/src/load/abort-policy.ts
    title: abort-policy.ts
  - id: readme
    kind: local_file
    resource: traffic-simulator/README.md
    title: traffic-simulator README (section Rampe de charge)
---

# Montée en charge : rampe, enregistreurs et lecture des résultats

## Quand utiliser cette skill

Pour chiffrer combien de requêtes par seconde (et donc d'utilisateurs actifs) la plateforme tient, trouver le goulot suivant, ou vérifier qu'un changement de performance a un effet. La mesure a été faite le 2026-11-08 ; les chiffres de référence sont plus bas.

## La rampe

`yarn load` (dossier `traffic-simulator`) envoie, en mode `routes` (défaut), des **lectures seules** vers la gateway publique, par paliers de `LOAD_STEP_SECONDS` secondes (60 par défaut) à `LOAD_STEPS` req/s, avec un mélange `events-list` 40, `posts-list` 30, `me` 20, `is-following` 10[^readme]. Elle demande une confirmation avant chaque palier, utilise 200 acteurs déterministes (`LOAD_ACTORS`) et le jeton Cloudflare Access de `nativapp/.env` (`CF_ACCESS_CLIENT_ID` et `CF_ACCESS_CLIENT_SECRET`, ne jamais les afficher). Elle s'arrête seule après deux fenêtres de 10 s consécutives au-dessus de 5 % d'erreurs ou de 429, ou d'un p95 de 2 s[^abort]. Elle se lance depuis le Mac de Victor, pas depuis l'agent :

```bash
ulimit -n 10240 && set -a && source /Users/victoragahi/Developer/meta/nativapp/.env && set +a && LOAD_BASE_URL="$API_GATEWAY_URL" LOAD_STEPS="150,175,200" LOAD_STEP_SECONDS=90 LOAD_REPORT_PATH="load-report.json" yarn load
```

Le mélange par défaut envoie `/events` sans filtre : il ne reproduit pas le coût de nativapp, qui ajoute `excludeBlockedUsers`, `excludeParticipatedByMe`, `excludeCreatedByMe` et `excludeWishedByMe` (lectures paginées dans ms-social à chaque requête). Pour une mesure fidèle à l'application, remplacer la route par `events-list-app` (traffic-simulator#10) : `LOAD_MIX="events-list-app:40,posts-list:30,me:20,is-following:10"`. Les chiffres de référence ci-dessous sont ceux du mélange sans filtre, donc une borne haute.

### Deux modes : `routes` (référence) et `app` (toute l'application)

**Leçon du 2026-11-10 :** nativapp lit son accueil sur `GET /ranking/feed` (`use-home-screen.ts:60`) et son swipe sur `GET /ranking/events` (`use-swipe-screen.ts:60`). `GET /posts` et `GET /events` ne sont que des **replis** (206, échec ou liste vide). Les chiffres du mode `routes` ne sollicitent donc jamais `ms-ranking` : ils ne disent pas ce que tient l'application.

- `LOAD_MODE=routes` (défaut) : les 4 routes ci-dessus, requêtes identiques depuis la première version (test de non-régression), pour comparer d'une rampe à l'autre.
- `LOAD_MODE=app` : les 16 lectures de nativapp, mélange `app-v1` (`traffic-simulator/src/load/app/app-profile.ts`, poids **hypothétiques**, à recaler sur les hits par route de Datadog) : ranking feed 15, likes-summary 10 (un `POST` qui est une lecture), ranking events 8, recherche d'events 8, me 8, détail d'event 7, commentaires 6, participants 5, is-following 4, profil public 3, listes personnelles 3, posts 2, posts liés 2, follows 2, classement 2, divers 3. Les routes de détail visent des identifiants lus dans les réponses (de préférence la dernière liste du même acteur) ; une préparation hors mesure (5 acteurs, 4 listes) les remplit. Le rapport donne, par palier, la part réelle de chaque route avec ses 206 et 4xx, puis lectures contre écritures.

### Écritures (mode app) : pool `load.NNNN`, fixtures DRAFT, nettoyage

`LOAD_WRITES` : `off` par défaut ; `default` = souhait et participation (bascules sur 10 events de fixture en DRAFT, invisibles du ranking qui ne propose que les events PUBLISHED, `worker-ranking event-ranking.client.ts:51`), follow entre comptes load, passes du swipe. En liste : `ranking-refresh`, `like-toggle`, `comment-cycle`, `post-cycle`. `location` et `event-cycle` sont refusées. Toutes les écritures partent des comptes `load.NNNN@simulator.volontariapp.test` et ne visent que des objets du pool. Like et commentaire sont diffusés par ws-service à **tous** les clients connectés (`broadcastExcept`), vrais utilisateurs compris, et les posts du pool apparaissent dans les fils pendant leurs 60 s de vie : ne les activer qu'avec l'accord de Victor.

```bash
yarn --cwd traffic-simulator load:setup                 # une fois : comptes absents et events de fixture
yarn --cwd traffic-simulator load:cleanup --dry-run     # ce que le pool a laissé
yarn --cwd traffic-simulator load:cleanup               # retire et relit (code 2 s'il reste quelque chose)
```

Une rampe qui écrit lance le nettoyage seule à la fin et sort en code 2 s'il reste un objet. Effets asynchrones des écritures par défaut (règle R3, 2026-11-10) : follow et participate n'écrivent que Neo4j (aucune ligne `event_queue` dans `domain-social` hors like, wish, unwish et attendance) ; wish alimente `post-processor-ranking` et les badges du compte load.

### Profil d'attaque (démarrage à froid, montée rapide)

`LOAD_RAMP_UP_SECONDS` monte de 0 au débit du palier (hors statistiques) ; 0 = plein débit dès la première seconde. `LOAD_ONSET_SECONDS=N` lit à part les N premières secondes du palier, chaque requête rangée par seconde de lancement (tableau « Debut de palier », `steps[].onset.series`). Attaque brutale : `LOAD_WARMUP_SECONDS=0 LOAD_ONSET_SECONDS=10`. En journée, avec de vrais utilisateurs : montée d'au moins 10 s, jamais d'attaque brutale.

Latence par route d'un rapport (en mode `routes`, le tableau final n'en donne pas) :

```bash
jq -r '.steps[] | .targetRate as $r | .stats.byRoute | to_entries[] | "\($r) \(.key) n=\(.value.count) p50=\(.value.p50|round) p95=\(.value.p95|round) err=\(.value.errors)"' load-report.json
```

## Avant de lancer

1. **Simulateur à 0 réplica.** `traffic-simulator` envoie de l'activité de fond (environ 20 actions par seconde, rafales de 1 000) qui fausse la mesure. ArgoCD a `selfHeal` : seul Git coupe vraiment (overlay prod `apps/overlays/prod/traffic-simulator/kustomization.yaml`, bloc `replicas` à 0 ; `kubectl scale` est annulé). Le revert se fait par PR `deploy` que Victor fusionne.
2. **Gateway chaude.** Ne pas redémarrer ni mettre à jour la gateway dans les 3 minutes qui précèdent : un palier lu sur des pods neufs affiche plusieurs secondes de p95 sur toutes les routes (le 125 req/s « froid » : p95 4,5 s ; le même palier chaud : 157 ms). L'HPA de la gateway (cible 500m par pod, de 3 à 6 pods) peut aussi monter pendant un palier et créer des pods froids : démarrer à 6 pods si possible.
3. **Enregistreurs lancés avant** (section suivante). Un `kubectl top` ponctuel ne montre que l'instant.
4. Si le test s'arrête sur un gel, ne pas le relire comme un plafond : voir « Lire un palier ».

## Enregistreurs

Lancer avant que Victor ne démarre, et garder les horodatages en UTC :

```bash
.agents/skills/volontariapp-load-ramp/scripts/record-ramp.sh /chemin/dossier-de-session 360
```

Il démarre trois relevés : `traefik.log` (histogramme de latence vu par Traefik via `kubectl -n kube-system port-forward deploy/traefik 19100:9100`), `cpu.log` (`kubectl top` du nœud et des 30 pods les plus gourmands de tous les namespaces, plus une ligne `SOMME-PODS`, toutes les 5 s, résolution réelle d'environ 12 s) et `disk.log` (lectures et écritures par pod, `scripts/disk-read-rate.py`, via l'API cadvisor du nœud, lecture seule). Traefik n'écrit aucun journal d'accès : ses métriques sont la seule mesure de latence côté cluster.

Lecture : `scripts/traefik-percentiles.py traefik.log HH:MM:SS HH:MM:SS --series` donne la part des requêtes sous 100 ms, 300 ms, 1,2 s et 5 s et, avec `--series`, le débit et la latence moyenne par tranche de 5 s.

Sur la VM du nœud (par ssh, Victor ; la VM de production s'appelle `ubuntu-worker-2`), lancer en arrière-plan une seconde de résolution de la pression E/S, qui est la seule façon de voir un gel :

```bash
cat > /tmp/psi.sh <<'EOS'
#!/bin/bash
pf=0; ps=0; pc=0
while true; do
  f=$(awk '/^full/{sub("total=","",$5);print $5}' /proc/pressure/io)
  s=$(awk '/^some/{sub("total=","",$5);print $5}' /proc/pressure/io)
  c=$(awk '/^some/{sub("total=","",$5);print $5}' /proc/pressure/cpu)
  if [ "$pf" -ne 0 ]; then echo "$(date -u +%H:%M:%S) io_full_ms=$(( (f-pf)/1000 )) io_some_ms=$(( (s-ps)/1000 )) cpu_some_ms=$(( (c-pc)/1000 ))"; fi
  pf=$f; ps=$s; pc=$c; sleep 1
done
EOS
nohup bash /tmp/psi.sh > /tmp/psi.log 2>&1 &
sudo iostat -x -t 1 > /tmp/iostat.log 2>&1 &
```

Attention : ces commandes se lancent sur la VM (Linux), pas sur le Mac (macOS n'a ni `/proc` ni `nf_conntrack`, et `grep` y est parfois un alias de `rg`).

### Flux asynchrones (`async.log`)

Pour une rampe qui écrit, lancer aussi (lecture seule sur Redis, mot de passe jamais affiché) :

```bash
.agents/skills/volontariapp-load-ramp/scripts/async-recorder.sh /chemin/dossier-de-session 180   # 30 min, un relevé par 10 s
.agents/skills/volontariapp-load-ramp/scripts/async-recorder.sh /tmp/x --once                    # état instantané
```

Par relevé : chaque groupe de chaque stream (`pending`, `behind_ms` : âge du dernier message généré moins celui du dernier livré au groupe), chaque `<stream>-dlq`, chaque file BullMQ (`wait`, `active`, `delayed`, `failed`) et une ligne `total`. **Toute DLQ non nulle arrête l'essai.** Ne pas lire le champ `lag` de `XINFO GROUPS` : il reste à 12 à 146 sur des groupes à jour (streams tronqués à environ 10 000 entrées), constaté le 2026-11-10. Repos du 2026-11-10 13:35Z : `pending=0 max_behind_ms=0 dlq=0`, 17 jobs BullMQ en échec anciens (12 `ranking-queue`, 5 `storage-queue`), à soustraire.

Quand `like-toggle` ou `comment-cycle` sont actives, la rampe ouvre aussi 20 sockets (`LOAD_PROBE_SOCKETS`) et mesure le délai entre l'écriture acceptée et son message WebSocket à l'émetteur ; arrêt si le p95 dépasse 30 s ou si plus de 2 % des effets sont perdus.

## Profil CPU d'un pod Node (sans redéployer)

Pour savoir où part le CPU d'un service Node (gateway, `ms-*`) : un profil de 30 s pendant une charge stable. Le processus Node est le PID 1 du conteneur (`ENTRYPOINT ["node"]`), donc `SIGUSR1` y active l'inspecteur, qui n'écoute que sur la boucle locale du pod ; seul un `kubectl port-forward` l'atteint. Le profileur échantillonne à 1 ms et ajoute quelques pour cent de CPU à ce seul pod pendant la capture.

1. Choisir un pod et activer l'inspecteur (`kubectl exec` dans un pod de production : le classificateur peut le refuser, ne pas le contourner) :

```bash
POD=$(kubectl -n prod get pods -l app=api-gateway -o name | head -1)
kubectl -n prod exec "$POD" -- sh -c 'kill -USR1 1'
kubectl -n prod port-forward "$POD" 9229:9229 &
```

2. Lancer une charge stable (rampe à un seul palier, par exemple `LOAD_STEPS="150" LOAD_STEP_SECONDS=120`), attendre 20 s de chauffe, puis capturer :

```bash
node .agents/skills/volontariapp-load-ramp/scripts/capture-cpu-profile.mjs 30 gateway.cpuprofile
node .agents/skills/volontariapp-load-ramp/scripts/analyze-cpuprofile.mjs gateway.cpuprofile 25
```

3. Nettoyer : arrêter le `port-forward`, puis supprimer le pod profilé (`kubectl -n prod delete "$POD"`), car l'inspecteur reste ouvert jusqu'au redémarrage du processus. Le Deployment le recrée.

Lecture : `analyze-cpuprofile.mjs` range le temps occupé par famille (notre code, gRPC `grpc-js`, protobuf, JWT et cryptographie, validation et DTO, logger, Nest, Express, Node natif, ramasse-miettes). Un appel à `JSON.stringify` ou `JSON.parse` apparaît soit dans « natif / sans source », soit dans la fonction appelante. La signature RSA tourne dans le pool de threads de libuv, hors du fil principal : elle n'apparaît pas dans ce profil. Le fichier s'ouvre aussi dans Chrome DevTools (onglet Performance, « Load profile »).

Règle de décision utilisée le 2026-11-08 pour Go : plus de la moitié du temps dans gRPC, protobuf, JSON et ramasse-miettes (coût inhérent à Node) oriente vers un portage ; plus de la moitié dans notre code, la validation ou le logger oriente vers une optimisation en Node, moins chère.

## Lire un palier

- **Comparer ce que voit le client et ce que voit Traefik.** Les deux ont concordé sur toutes les mesures : le retard n'est pas introduit par le Mac ni par Cloudflare.
- **Un gel de la VM n'est pas un plafond.** Signature : le débit vu par Traefik tombe presque à zéro pendant 5 à 12 s puis rattrape d'un coup, les p95 de toutes les routes montent ensemble (y compris `me` et `is-following`, qui n'appellent qu'un service), sans erreur applicative, avec des sondes qui expirent sur des services sans rapport (redis, une base, coredns). Confirmer avec `io_full_ms` au-dessus de 300 par seconde dans `psi.log`. Toute fenêtre qui contient une telle seconde se classe « gel », et on relance le palier.
- **Une saturation CPU se reconnaît autrement** : la latence moyenne monte régulièrement sur 20 à 30 s (file qui grossit : 62 ms, 334, 1 074, 1 854, 2 652, 4 528), le nœud dépasse 85 à 90 % de CPU (`kubectl top node`), `cpu_some_ms` monte à 700 à 990 par seconde. Les limites de CPU des pods ne brident pas (part des périodes bridées sous 5 % : vérifiable par `container_cpu_cfs_throttled_periods_total` dans cadvisor).
- **Qui lit le disque ?** `disk.log` dit quel pod dépasse 0,5 Mo/s. En novembre 2026 une seule base lisait 125 à 245 Mo/s en continu (voir `volontariapp-db-migration`, section tables d'outbox).
- **Répartition gRPC.** Compter les lignes `gRPC:` par réplica : `for p in $(kubectl -n prod get pods -l app=ms-post -o name); do echo -n "$p "; kubectl -n prod logs $p -c ms-post --since=5m | grep -c 'gRPC:'; done`. Les services sont des `ClusterIP`, la répartition se fait par connexion : un seul `ms-post` a reçu 100 % du trafic dans toutes les mesures, `ms-event` 2 pour 1.

## Chiffres de référence, mode `routes` (2026-11-08, VM de 12 vCPU, mélange ci-dessus)

| Palier | p50 | p95 | Erreurs | Remarque |
| ---: | ---: | ---: | ---: | :--- |
| 125 req/s, avant correctifs | 97 ms | 2 053 ms | 0 % | limite entre 100 et 125 |
| 150 req/s | 59 ms | 176 ms | 0 % | |
| 175 req/s | 72 ms | 305 ms | 0 % | confortable |
| 200 req/s | 215 ms | 1 236 ms | 0 % | tient, nœud à 86 % de CPU |

### Mode app, lectures seules (2026-11-10 08:05Z, après les phases 1 à 3 du chapitre 04)

| Palier | p50 | p95 | p99 | Erreurs | 206 | 4xx | Remarque |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| 10 req/s, montée 10 s | 54 ms | 348 ms | 874 ms | 0 % | 26 sur 602 | 0 | 16 routes servies ; 10 premières secondes : p95 809 ms, puis p95 108 ms en dernière fenêtre |

Routes les plus lentes à 10 req/s : `ranking-feed` p95 874 ms, `my-events` 649 ms, `likes-summary` 472 ms. Pas encore de palier au-delà : ne pas comparer ces chiffres à ceux du mode `routes`.

### Mélange de l'application (`events-list-app`), soir du 2026-11-08, VM de 14 vCPU, `ms-social` 2 réplicas à 512Mi, exclusions en 1 appel

| Palier | p50 | p95 | Erreurs | Nœud (vCPU) | Remarque |
| ---: | ---: | ---: | ---: | ---: | :--- |
| 25 à 100 req/s | 47 à 50 ms | 62 à 78 ms | 0 % | 2,0 à 3,3 | latence plate |
| 150 req/s | 55 ms | 167 ms | 0 % | 5,9 | un à-coup de 1 s à 992 ms |
| 200 req/s | 171 ms | 1 316 ms | 0 % | 10,5 à 11,4 | p99 2 219 ms, HPA gateway de 3 à 5 pods en cours de palier |
| 250 req/s | 10 000 ms | 10 002 ms | 51,7 % | 12,0 | effondrement, arrêt après 30 s |

À 250 req/s seules les routes qui appellent `ms-social` échouent (`events-list-app` 85 %, `is-following` 72 %, `posts-list` 24 %) ; `me` reste à 0 % d'erreur mais à 825 ms de p50. Au pic, un `ms-social` est à 726m sur sa limite de 800m, l'autre à 473m. Coût marginal du nœud : 29m par req/s jusqu'à 100 req/s, environ 52m au-delà de 150. Plafond pratique : environ 200 req/s, sans marge. 300 req/s demande de baisser le coût par requête d'environ un tiers ou une seconde machine (inférence).

Avant l'index et la purge des tables d'outbox (npm-packages#310), le 200 s'effondrait (nœud à 93 %, p50 6,7 s, 30 % d'erreurs) et les paliers 125 et 150 échouaient sur des gels de la VM. CPU du nœud par req/s : environ 41 à 56m. Hypothèse (non mesurée) : un utilisateur actif émet une requête toutes les 5 à 10 s, donc 175 à 200 req/s correspondent à environ 900 à 2 000 utilisateurs actifs.

## Prochaines marches (inférences à vérifier)

- Plafond du nœud : un peu au-delà de 200 req/s sur 12 vCPU.
- 300 req/s : environ 15 à 17 vCPU de nœud, plus une répartition gRPC correcte (service headless et `round_robin` côté client) et des réplicas pour `ms-social` (un seul, environ 60 % d'un cœur Node à 200 req/s), `ms-post` et `ms-user`.
- 1 000 req/s : de l'ordre de 50 à 56 vCPU en extrapolation linéaire optimiste, donc plusieurs nœuds (les bases sont en `local-path`, épinglées au nœud), un cache en mémoire à la gateway (décision de Victor : seulement au-delà de 300 req/s) et moins d'appels en série dans `posts-list` (3 appels : `ms-post`, `ms-social`, puis `ms-event`).
- CoreDNS et Traefik sont des réplicas uniques avec une quinzaine de redémarrages chacun.

## Règles

- Ne jamais lancer la rampe sans accord de Victor ni sans enregistreurs ; ne jamais afficher le jeton Cloudflare Access.
- Lecture de base de production : seulement après un accord explicite de Victor, en lecture seule (`PGOPTIONS="-c default_transaction_read_only=on"`), mots de passe lus dans le pod et jamais affichés.
- Ne pas redémarrer la gateway sans l'accord de Victor, ni juste avant un palier.
- Citer pour chaque conclusion de goulot l'outil et le périmètre ; séparer fait mesuré, inférence et non vérifié.

## Références

- [Leçons apprises](/volontariapp-load-ramp/references/lessons.md)

## Scripts

- `scripts/record-ramp.sh <dossier> [relevés]` : lance les trois enregistreurs côté cluster.
- `scripts/async-recorder.sh <dossier> [relevés] [--once]` : streams, DLQ et files BullMQ toutes les 10 s (`async.log`).
- `scripts/traefik-percentiles.py <journal> <début> <fin> [--series]` : répartition de latence et débit vus par Traefik.
- `scripts/disk-read-rate.py <échantillons> [nœud]` : lectures et écritures disque par pod.
- `scripts/capture-cpu-profile.mjs [secondes] [sortie] [hôte:port]` : profil CPU d'un processus Node dont l'inspecteur est ouvert (Node 22 ou plus, sans dépendance).
- `scripts/analyze-cpuprofile.mjs <profil> [nombre]` : part du temps CPU par famille et fonctions les plus chaudes.

[^runner]: traffic-simulator/src/load/load-runner.ts
[^abort]: traffic-simulator/src/load/abort-policy.ts
[^readme]: traffic-simulator/README.md
