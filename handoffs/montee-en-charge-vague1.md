# Handoff : montée en charge vers 300 req/s, avant la vague 1

État au 2026-11-09 vers 10:55Z. Handoffs précédents : `handoffs/montee-en-charge-300.md` (nuit), `handoffs/load-ramp.md`. Documentation de référence, dépôt `docs`, dossier `montee-en-charge/` : `04-resultats.md` (résultats), `05-plan-vers-300.md` (plan à phases), `analyses-services/` (5 rapports d'analyse CPU et une synthèse, dont `README.md`).

## 1. Où on en est (FAIT)

- Livré et déployé : phases 1 à 3 (logs `info`, traces 10 %, HPA 5 pods, `round_robin` gRPC sur Services headless, caches gateway et ms-post), phase B (`NODE_OPTIONS=--max-semi-space-size` 16 Mo gateway, ms-event, ms-post, ms-user ; 32 Mo ms-social, deploy#71), compteurs de cache C1 (api-gateway#120, ms-post#78).
- Plafond : **250 req/s tiennent** (p95 489 ms, 0 % d'erreur), 275 s'effondre quand le nœud atteint 85 % de 14 vCPU. Hôte : i7-1360P, PL1 28 W, baisse de fréquence d'environ 18 % et 93 °C au-delà de 225 req/s.
- Mesure de la vague 0 (palier 225 lancé par Victor à 10:48:27Z) :
  - Profils propres (30 s, 10:48:52Z) : `/Users/victoragahi/Developer/meta/profiles/{gateway,ms-social,ms-event,ms-post}-104852.cpuprofile` (non versionnés, ne pas écraser). Analyse : `node .agents/skills/volontariapp-load-ramp/scripts/analyze-cpuprofile.mjs <fichier> 25` (familles TypeORM, pg, Neo4j, OpenTelemetry ajoutées ce jour, fichier non commité dans le checkout `meta`).
  - Occupation : gateway 42 %, ms-social 53 %, ms-event 45 %, ms-post 41 %. Ramasse-miettes 5 à 7 % (contre 13 à 15 % avant la phase B). OpenTelemetry 11 à 14 % (gateway, ms-event, ms-post), Neo4j driver 20 % (ms-social), TypeORM 13 à 14 % (ms-event, ms-post), JWT 4,5 à 5,6 %.
  - Nœud à 225 req/s : 7,5 à 8,9 vCPU (pas de baisse mesurable par rapport à 7,2-8,4 avant la phase B). Hôte : 3 000 à 3 500 MHz, 77 à 92 °C.
  - Caches : participants et événements 98-99 % (flatté par la rampe), total des posts 60-62 %.
  - **Mémoire après la phase B** : gateway 188-198 Mi sur 256 Mi, ms-event 175-183 Mi, ms-user 166 Mi, ms-post 164-169 Mi. Risque d'OOM pour la gateway à 300 req/s.
- La sortie complète du palier vague 0 (fenêtres 10 à 12, tableau final) n'a pas été relevée ; rapport JSON : `traffic-simulator/load-report-vague0-225.json`.

## 2. À faire ensuite : vague 1 (sans paquet partagé)

Ordre, une PR par ligne, mesure (rampe 225, 250, 275 lancée à la main par Victor) après la vague :

1. PR `deploy` : `OTEL_NODE_DISABLED_INSTRUMENTATIONS=express,router,nestjs-core,net,undici,generic-pool` sur gateway et `ms-*` (mécanisme vérifié dans `auto-instrumentations-node` 0.75.0 par les rapports) **et** limite mémoire de la gateway 256 Mi vers 320 Mi (vérifier le quota `prod-quota`).
2. Logs : lignes `info` par appel des lectures chaudes en `debug` (gateway, ms-social, ms-event, ms-post, ms-user).
3. Gateway : ETag coupé, `keepAliveTimeout` aligné sur Traefik, `RefreshTokenMiddleware` limité à sa route.
4. Gateway : cache des exclusions 5 s par utilisateur (C2), vidé par le pod qui traite un blocage.
5. ms-post : cache des liens post vers événement (30 s si lien, 5 s sinon).
6. ms-event : une vérification rapide de la liste d'identifiants au lieu d'un `@IsUUID` par identifiant.
7. Gateway : deadlines gRPC sur les routes chaudes.

Puis vague 2 (une PR `npm-packages` : `auth` jeton réutilisé et jetons vérifiés en cache ; `domain-social` une requête Cypher pour les exclusions ; `domain-event` `knownTotal`, listes en paramètre tableau, relations en requêtes séparées ; `domain-post` une requête par page, total exact, mode auteur ; `domain-user` une requête, colonnes sensibles non lues), STOP, vague 3 (consommateurs), vague 4 (rampe 250, 275, 300 deux fois). Détail dans la synthèse de `analyses-services/README.md`.

## 3. Décisions de Victor en attente (valeurs par défaut proposées)

| # | Décision | Défaut proposé |
| :--- | :--- | :--- |
| D1 | Délai d'application d'un blocage dans la liste des événements | jusqu'à 5 s |
| D2 | Total de la recherche d'événements | cache 10 s (`knownTotal`), contrat inchangé |
| D3 | Validation des identifiants dans ms-event | une vérification rapide de toute la liste |
| D4 | Réutilisation du jeton interne | 30 s par utilisateur et rôle, revue de sécurité |
| D5 | Délai d'apparition d'un lien post-événement | 30 s si lien, 5 s sinon |
| D6 | Cache de la page du fil global | non, en réserve |

Constat de sécurité non corrigé (décision de Victor : plus tard) : `ListUsers` sans `GrpcInternalGuard` (`ms-user/src/modules/user/controllers/queries/user.query.controller.ts:75-91`).

## 4. Règles de travail apprises

- Victor lance lui-même les rampes et les profils (`kubectl exec` refusé à l'agent) ; l'agent prépare les commandes, lance `record-ramp.sh`, lit les sorties. Noms de profils horodatés, ne pas supprimer les pods avant les lignes « ecrit ».
- `gh pr merge --admin` refusé à l'agent sur `deploy` et sur les dépôts protégés (`ms-user`, `ms-post`, `api-gateway`) : donner la commande à Victor. Les dépôts non protégés (ms-social, ms-event, runners, docs) se fusionnent quand la CI est verte.
- Règle du STOP : après publication, vérifier **chaque** paquet bumpé avec `npm view --prefer-online` (propagation de quelques minutes), puis `.claude/hooks/stop-rule-guard.sh release`.
- Un `yarn up` partiel laisse des copies imbriquées de `@volontariapp/logger` : faire `yarn up "@volontariapp/*"` et vérifier `yarn why`.
- Jest : `--no-watchman` (watchman cassé sur le Mac).
