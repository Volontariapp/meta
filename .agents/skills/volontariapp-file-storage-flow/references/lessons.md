---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-file-storage-flow, du plus récent au plus ancien."
tags: [lessons, volontariapp-file-storage-flow]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-07T08:42:02Z"
sources:
  - id: src-3aa1bf0d
    resource: ci-tools/scripts/init-buckets.sh
    title: ci-tools/scripts/init-buckets.sh
---

# Leçons

## 2026-10-07 - Test manuel local de ms-storage : ce qui est testable et ce qui ne l'est pas

- **Type :** rule
- **Leçon :** Procedure deduite des fichiers (scripts de ms-storage/package.json, ci-tools/docker-compose.yml, ci-tools/scripts/init-buckets.sh), non executee de bout en bout. Base jetable : docker run postgres:16-alpine sur 127.0.0.1:5437 (user/password, base ms_storage) ; jamais le port 5433 (tunnel SSH et base d'un autre projet) ; le conteneur postgres-storage de ci-tools garde d'anciennes donnees. MinIO : docker compose up -d minio dans ci-tools (ports 9000 et 9001, minioadmin / minioadminpassword), puis docker compose --profile migrations up minio-init cree les buckets volontariapp-public et volontariapp-private. Service : yarn migration:run:local puis yarn start:local dans ms-storage ; verifier les logs (gRPC 0.0.0.0:5006, HTTP 3006), curl localhost:3006/health (seul Postgres est controle), Swagger sur /api. Schema : psql \d files et \d released_entities (22 colonnes, 7 index dont 5 partiels). Seul upload reel possible : le test s3.service.int.spec.ts (PUT presigne) avec MinIO. Le repository PostgresFileRepository n'a aucun point d'entree (ms-storage n'enregistre aucun handler gRPC avant les tickets 3.4 et 3.6) : l'exercer par yarn test:integration dans packages/domain-storage, ou par un script dedie. Non testable : appels gRPC, scan antivirus (pas de clamd dans ci-tools), consommation des evenements de scan (StorageStream absent), routage Kubernetes (MS_STORAGE_URL absent de deploy). Jest peut planter sur watchman (Homebrew cassé) : ajouter --watchman=false.[^src-3aa1bf0d]
- **Consigné par :** claude-code/agent

[^src-3aa1bf0d]: ci-tools/scripts/init-buckets.sh
