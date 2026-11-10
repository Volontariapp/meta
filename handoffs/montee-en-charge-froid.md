# Handoff : démarrage à froid, rampe réaliste, arrêt des post-processors, écritures

État au 2026-11-10 vers 08:30 (UTC). Handoff précédent : `handoffs/montee-en-charge-vague2.md`. Référence : dépôt `docs`, `montee-en-charge/` chapitres **08** (mémoire, vague 2, 400 req/s), **09** (démarrage à froid) et **10** (suites), PR docs#20.

## 1. Où on en est (FAIT)

- **VM** : plancher du ballon à 14 Go appliqué à chaud ; 16 Go fixes (`balloon 0`) en attente du prochain démarrage de la VM 101. Pire cas sur l'hôte à ce moment-là : 32 Go pour 31,8 Go physiques.
- **Livré et déployé** :
  - vague 2 : npm-packages#317 (`auth` 3.4.0, `domain-social` 0.19.3, `domain-post` 3.11.1, `domain-user` 2.17.13) et consommateurs api-gateway#125, ms-social#74, ms-event#97, ms-post#81, ms-user#94 ;
  - limites de Traefik : deploy#74.
- **Rampes** (mélange de 4 routes) : 300 req/s à 0 erreur, p95 166 ms ; 400 req/s à 0 erreur, p95 196 ms, nœud à 52 %.
- **Démarrage à froid** : Neo4j redémarré, puis 100 req/s, donne 80 % d'erreurs ; Neo4j reste saturé 1 min 45 après la rafale.
  - Cause : 1 CPU par une clé de chart ignorée, lectures sans timeout, pools de 100 par pod, Neo4j froid.
  - Correctifs ouverts, CI verte : deploy#75, ms-social#75, npm-packages#318.
- **Rampe réaliste** : L1 (traffic-simulator#11) et L2 (#12) fusionnés. L2 validé à 10 req/s en mode `app` : 0 erreur, 16 routes servies.
- **SIGTERM** : étape A ouverte (npm-packages#319, `post-processors` 3.6.0).
- **Verrou STOP posé** pour la session (`npm-packages`). Il bloque aussi `traffic-simulator`, qui dépend de `@volontariapp/contracts`.

## 2. À faire ensuite (ordre)

1. **Victor fusionne** dans cet ordre (le classifieur refuse les fusions de l'agent, avec ou sans `--admin`) :
   - deploy#75 : Neo4j à 2 CPU, requests, gateway à 7 pods, quota, readiness. Neo4j redémarre et ms-social est coupé 1 à 2 min. Forcer la synchro d'ArgoCD en commençant par `prod-security` pour le quota.
   - ms-social#75 : driver Neo4j et préchauffage.
   - npm-packages#318 et #319 ensemble : un seul cycle de publication.
   - docs#20.
2. **Après la publication** : `npm view @volontariapp/domain-social@0.20.0` et `@volontariapp/post-processors@3.6.0`, puis `stop-rule-guard.sh release`, rapporté.
3. **Consommateurs** :
   - `yarn up @volontariapp/domain-social@^0.20.0` dans ms-social ;
   - étape B du SIGTERM (ws-service et les 6 apps de post-processors-runner), décrite au chapitre 10 section 3.3.
4. **Critère d'acceptation du froid** : redémarrer `neo4j-0`, 30 s sans trafic, puis :
   `LOAD_MIX="events-list-app:40,posts-list:30,me:20,is-following:10" LOAD_STEPS=100 LOAD_STEP_SECONDS=60 LOAD_WARMUP_SECONDS=0 LOAD_ONSET_SECONDS=15 LOAD_ABORT_WINDOWS=99`.
   Réussite : moins de 1 % d'erreurs.
5. **Rampe réaliste**, lots L3 à L8 (orchestrés par un sous-agent) :
   - L8 d'abord sans like, commentaire ni création de post : les posts de fixture seraient visibles des vrais utilisateurs ;
   - ces trois actions ensuite.
6. **Écritures** :
   - un sous-agent Opus rédige `docs/optimisation-ecritures/`, à partir de `meta/fable_tought.md` ;
   - relecture, puis un sous-agent l'implémente par lots.

## 3. Règles de travail apprises

- Victor a autorisé l'agent à lancer les rampes et toutes les commandes `kubectl`. L'agent annonce toujours une action perturbante, évite les minutes `*/15` de `ms-storage-purge`, et n'affiche aucun secret.
- Le verrou du STOP vaut pour toute la session, sous-agents compris. Il faut ordonner : d'abord les consommateurs, puis `npm-packages`, puis une seule publication.
- Pour reproduire un démarrage à froid : redémarrer le composant soupçonné, puis lancer une rafale immédiate (`LOAD_WARMUP_SECONDS=0`, `LOAD_ONSET_SECONDS`, `LOAD_ABORT_WINDOWS=99`).
- Chart Neo4j 5.20.0 : les ressources se règlent sous `neo4j.resources`. Une clé `resources:` à la racine est ignorée sans avertissement.
- Les tests à froid déclenchent des alertes Datadog : mettre les monitors en sourdine avant.
- Relevés (non versionnés) : `profiles/ramp-vague2-deps`, `cold-neo4j`, `cold-neo4j-restart`.
- `neo4j-0` a été redémarré à 21:49:07 le 2026-11-09 par une origine non déterminée (ni l'agent des correctifs, ni un test).
