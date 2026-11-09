# Handoff : montée en charge, après la vague 2 partielle

État au 2026-11-09 vers 14:05Z. Handoffs précédents : `handoffs/montee-en-charge-vague1.md`, `handoffs/montee-en-charge-300.md`. Référence : dépôt `docs`, dossier `montee-en-charge/`, chapitres **06** (vague 1, 300 req/s) et **07** (ms-event-db, mémoire de la VM).

## 1. Où on en est (FAIT)

- Vague 1 fusionnée et déployée (deploy#72, api-gateway#121 à #124, ms-social#73, ms-event#94 et #95, ms-post#79 et #80, ms-user#93).
- 300 req/s tenus une fois (p95 196 ms, nœud 56 %), puis à la limite au second passage (p95 483 ms, `ms-event-db` 799m sur 800m).
- EXPLAIN en prod : le `COUNT` de `searchAdvanced` lit toute la table `events` (15 333 lignes, environ 5,7 ms), la page 61 lignes (environ 1 ms).
- Livré ensuite : `domain-event` 3.17.0 (npm-packages#316 : `knownTotal`, listes en `uuid[]`, `relationLoadStrategy: 'query'`), verrou STOP levé après `npm view` ; ms-event#96 (cache du total 10 s, `event-search-total`), en prod `sha-0695761` depuis 13:41 ; deploy#73 (HPA gateway 6 à 7, sonde HTTP `/api/v1/health`).
- **Bloqué par la mémoire** : rampes de 13:44 (275) et 13:53 (montée douce, 200) effondrées, 504 de la deadline de 2 s, 0 erreur dans les `ms-*`, nœud à 26-30 % de CPU, pods système qui lisent 20 à 80 Mo/s sur le disque. VM : 11,8 Gi, environ 2 Go disponibles, Traefik de 134 à 598 Mi sans limite.
- L'effet du cache du total sur `ms-event-db` **n'est pas mesuré**.

## 2. À faire ensuite (ordre)

1. Victor, sur `pve` : `qm config 101 | grep -E '^(memory|balloon)'; free -m`. Si l'hôte a de la marge, VM à 14-16 Go fixes.
2. PR `deploy` : limite mémoire de Traefik (comprendre d'abord pourquoi il gonfle), gateway de retour à 5 pods minimum tant que la mémoire n'est pas réglée (garder la sonde HTTP).
3. Refaire la mesure : montée douce 100, 150, 200 (60 s) puis 250, 275, 300 (90 s, 45 s de pause), hors des minutes de `ms-storage-purge` (`*/15`), enregistreurs lancés avant, et relevé de `availableBytes` et `majorPageFaults` (API du kubelet, voir les leçons de `volontariapp-load-ramp`).
4. Vague 2, suite (`npm-packages`, règle du STOP) : jeton interne réutilisé (`auth`), une requête Cypher pour les exclusions (`domain-social`), une requête SQL par page (`domain-post`), `domain-user`.
5. Suivis : cache des exclusions à 10 % de réussite (le déplacer dans ms-social ou le retirer) ; cache borné et rapporteur de stats copiés entre ms-post et ms-event (à remonter dans un paquet) ; `http.route` perdu dans l'APM de la gateway depuis deploy#72 (`express` avec `ignoreLayersType` dans `@volontariapp/monitoring`) ; `GRPC_READ_DEADLINE_MS` lu dans `process.env` au lieu de `AppConfigService` ; `ListUsers` sans `GrpcInternalGuard` (sécurité, décision de Victor en attente) ; deploy#66 (remettre le simulateur) à fusionner après la mesure.

## 3. Règles de travail apprises ce jour

- `kubectl exec` dans un pod de prod est refusé à l'agent : donner la commande à Victor avec le préfixe `!`.
- Lancer une rampe en prod de façon automatique est refusé ; Victor la lance, ou donne un feu vert explicite pour chaque rampe. `LOAD_CONFIRM=false`, `yarn --cwd .../traffic-simulator load`, `LOAD_REPORT_PATH` absolu.
- Après plusieurs fusions coup sur coup dans un dépôt, vérifier l'image dans `deploy` (bump dans le désordre, leçon dans `volontariapp-deploy-gitops`).
- `kubectl logs -l` : toujours `--tail=-1`.
- `gh pr merge --admin` : Victor pour deploy, api-gateway, ms-post, ms-user ; l'agent fusionne ms-social, ms-event, docs quand la CI est verte (label `docker-and-e2e` requis, sinon `ci-docker` échoue exprès).
- Relevés de la journée (non versionnés) : `profiles/ramp-vague1-1200`, `ramp-vague1-confirm`, `ramp-vague2-event`, `ramp-vague2-warm`.
