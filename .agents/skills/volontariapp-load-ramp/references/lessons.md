---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-load-ramp, du plus récent au plus ancien."
tags: [lessons, volontariapp-load-ramp]
status: stable
generated:
  by: claude-code/agent
  at: "2026-11-08T21:11:52Z"
sources:
  - id: src-7b42dd73
    resource: traffic-simulator/src/load/load-request.ts
    title: traffic-simulator/src/load/load-request.ts
  - id: src-32ad0128
    resource: traffic-simulator/src/load/load-config.ts
    title: traffic-simulator/src/load/load-config.ts
  - id: src-800cc0ea
    resource: traffic-simulator/src/load/load-runner.ts
    title: traffic-simulator/src/load/load-runner.ts
  - id: src-84d4712d
    resource: "https://github.com/Volontariapp/docs/pull/19"
    title: "https://github.com/Volontariapp/docs/pull/19"
  - id: src-bd24daba
    resource: .agents/skills/volontariapp-load-ramp/scripts/async-recorder.sh
    title: .agents/skills/volontariapp-load-ramp/scripts/async-recorder.sh
  - id: src-3b2b636e
    resource: "https://github.com/Volontariapp/traffic-simulator/pull/12"
    title: "https://github.com/Volontariapp/traffic-simulator/pull/12"
---

# Leçons

## 2026-11-10 - L application lit ranking, posts et events sont des replis

- **Type :** pitfall
- **Leçon :** nativapp lit l accueil sur GET /ranking/feed (use-home-screen.ts:60) et le swipe sur GET /ranking/events (use-swipe-screen.ts:60) ; /posts et /events ne partent qu en repli (206, echec, liste vide). Le mode routes de yarn load ne touche donc jamais ms-ranking : pour dire ce que tient l application, mesurer en LOAD_MODE=app.[^src-3b2b636e]
- **Consigné par :** claude-code/agent

## 2026-11-10 - XINFO GROUPS lag n est pas fiable sur nos streams

- **Type :** pitfall
- **Leçon :** Le champ lag reste a 12-146 sur des groupes a jour (last-delivered-id egal a last-generated-id), streams tronques a environ 10 000 entrees. Mesurer le retard par l age (last-generated-id moins last-delivered-id), comme async-recorder.sh (behind_ms).[^src-bd24daba]
- **Consigné par :** claude-code/agent

## 2026-11-09 - Lancer yarn load sans invite, depuis n'importe quel dossier

- **Type :** command
- **Leçon :** LOAD_CONFIRM=false coupe la confirmation par palier (traffic-simulator src/load/load-config.ts). Utiliser yarn --cwd /Users/victoragahi/Developer/meta/traffic-simulator load et un LOAD_REPORT_PATH absolu : depuis un autre dossier, yarn load echoue (script introuvable). Eviter les minutes de la tache ms-storage-purge (*/15 : :00, :15, :30, :45), qui fait lire minio.[^src-84d4712d]
- **Consigné par :** claude-code/agent

## 2026-11-09 - kubectl logs -l ne renvoie que 10 lignes par pod

- **Type :** pitfall
- **Leçon :** Avec un selecteur (-l), kubectl logs applique --tail=10 par defaut : un comptage d'erreurs sur les ms-* peut sortir vide a tort. Toujours ajouter --tail=-1 (et --max-log-requests) pour compter des erreurs pendant un palier.[^src-84d4712d]
- **Consigné par :** claude-code/agent

## 2026-11-09 - Effondrement a faible CPU : la VM relit son disque faute de memoire

- **Type :** pitfall
- **Leçon :** Signe : des pods qui ne lisent jamais (traefik, coredns, agent Datadog, argocd) lisent 20 a 80 Mo/s dans disk.log, le noeud reste a 26-30 % de CPU, la gateway renvoie des 504 (deadline 2 s) et les ms-* n'ont aucune erreur. 2026-11-09 : effondrement a 200 req/s avec 11,8 Gi de VM et environ 2 Go disponibles. Avant de lire un palier comme un plafond CPU, comparer disk.log a un palier sain (aucune lecture) et relever majorPageFaults et availableBytes via kubectl get --raw /api/v1/nodes/<noeud>/proxy/stats/summary.[^src-84d4712d]
- **Consigné par :** claude-code/agent

## 2026-11-08 - Compter les pods apres chaque palier : l HPA ajoute des pods froids

- **Type :** pitfall
- **Leçon :** Le palier 200 a vu l HPA de la gateway passer de 3 a 5 pods en 15 s : la latence monte pendant leur demarrage puis redescend (p95 141 a 2391 puis 702 ms). Relever kubectl describe hpa api-gateway apres chaque palier ; une montee de latence suivie d une baisse sans erreur n est pas un plafond.[^src-800cc0ea]
- **Consigné par :** claude-code/agent

## 2026-11-08 - Plafond mesure le 2026-11-08 soir : 200 req/s sur 14 CPU, le 250 sature

- **Type :** decision
- **Leçon :** Mix events-list-app:40 posts-list:30 me:20 is-following:10, VM 14 vCPU, ms-social 2 replicas 512Mi, GetSearchExclusions en 1 appel. 25 a 100 req/s : p95 62 a 78 ms, 0 erreur. 150 : p95 167 ms. 200 : p95 1316 ms, p99 2219 ms, 0 erreur, HPA gateway 3 a 5 pods en cours de palier. 250 : effondrement (p50 10 s, 51,7 pour cent d erreurs) : seules les routes qui appellent ms-social echouent (events-list-app 85, is-following 72, posts-list 24 pour cent), me reste a 0 erreur mais p50 825 ms. Au pic un ms-social est a 726m sur sa limite de 800m, l autre a 473m. Marginal CPU nœud : 29m par req/s a 50-100, 52m au dela de 150.[^src-32ad0128]
- **Consigné par :** claude-code/agent

## 2026-11-08 - Une rampe sans filtres sous-estime le cout de events-list

- **Type :** pitfall
- **Leçon :** Le melange par defaut envoie /events sans filtre : la gateway ne fait alors aucun appel ms-social avant la recherche. nativapp envoie excludeBlockedUsers, excludeParticipatedByMe, excludeCreatedByMe et excludeWishedByMe (use-swipe-screen.ts, use-nearest-live-events.ts) : 5 lectures paginees ms-social par requete avant GetSearchExclusions. Mesurer avec la route events-list-app (traffic-simulator#10). Avec 5 lectures, ms-social (limite 256Mi) a ete OOMKilled 17 s apres le debut d un palier a 100 req/s.[^src-7b42dd73]
- **Consigné par :** claude-code/agent

## 2026-11-08 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : traffic-simulator/src/load/**, traffic-simulator/README.md.
- **Consigné par :** claude-code/agent

[^src-7b42dd73]: traffic-simulator/src/load/load-request.ts
[^src-32ad0128]: traffic-simulator/src/load/load-config.ts
[^src-800cc0ea]: traffic-simulator/src/load/load-runner.ts
[^src-84d4712d]: https://github.com/Volontariapp/docs/pull/19
[^src-bd24daba]: .agents/skills/volontariapp-load-ramp/scripts/async-recorder.sh
[^src-3b2b636e]: https://github.com/Volontariapp/traffic-simulator/pull/12
