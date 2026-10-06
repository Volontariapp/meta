---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-grpc-microservice, du plus récent au plus ancien."
tags: [lessons, volontariapp-grpc-microservice]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
sources:
  - id: src-8d7f15d6
    resource: npm-packages/packages/errors/src/exceptions/unprocessable-entity.error.ts
    title: npm-packages/packages/errors/src/exceptions/unprocessable-entity.error.ts
---

# Leçons

## 2026-10-06 - Code gRPC d'une erreur de domaine : etendre BaseApiError, pas de mapping par code

- **Type :** rule
- **Leçon :** Le filtre global (GlobalExceptionFilter de errors-nest) renvoie exception.grpcCode tel quel pour toute BaseApiError : il n'existe aucun mapping par code metier dans les services. Les classes du package errors fixent leur grpcCode (UnprocessableEntityError donne INVALID_ARGUMENT, avec statusCode 422). Pour un autre code gRPC (par ex. FAILED_PRECONDITION pour un rattachement refuse), etendre directement BaseApiError en declarant statusCode et grpcCode (GrpcStatus est exporte par @volontariapp/errors), comme FileAttachmentRefusedException dans domain-storage. Ne pas compter sur ms-* pour remapper.[^src-8d7f15d6]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : ms-user/src/**, ms-event/src/**, ms-post/src/**, ms-social/src/**, sync-migrations.sh.
- **Consigné par :** claude-code/claude-opus-5-5

[^src-8d7f15d6]: npm-packages/packages/errors/src/exceptions/unprocessable-entity.error.ts
