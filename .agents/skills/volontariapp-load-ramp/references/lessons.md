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
---

# Leçons

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
