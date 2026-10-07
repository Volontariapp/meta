---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-api-gateway, du plus récent au plus ancien."
tags: [lessons, volontariapp-api-gateway]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:54:04Z"
sources: []
---

# Leçons

## 2026-10-07 - Les DTO de mise a jour heritent des champs de creation

- **Type :** rule
- **Leçon :** UpdateEventRequestDTO et UpdatePostRequestDTO etendent PartialType(OmitType(CreateXRequestDTO)). Tout champ ajoute au DTO de creation (idempotencyKey, coverFileId, fileIds) se retrouve dans la mise a jour, et pour les events il entre dans updateMask (cles definies de this) donc le PATCH est rejete par ms-event. Ajouter ces champs a la liste d'OmitType des DTO de mise a jour. Les factories e2e doivent poser idempotencyKey (event, post, badge) : ms-user, ms-event et ms-post la valident cote microservice, pas le gateway.
- **Consigné par :** claude-code/agent

## 2026-10-07 - Le contrat REST impose idempotencyKey au client

- **Type :** rule
- **Leçon :** Les interfaces REST de @volontariapp/contracts (gateway/*) etendent les commandes gRPC : CreateEventRequest, CreatePostRequest (avec fileIds) et CreateBadgeRequest exigent idempotencyKey, avec coverFileId / iconFileId optionnels, et EventResponseDTO expose coverStatus. Un bump de contracts casse donc le build du gateway et l'API REST tant que nativapp n'envoie pas idempotencyKey. Seed et factories e2e utilisent randomUUID().
- **Consigné par :** claude-code/agent

## 2026-10-06 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : api-gateway/src/**.
- **Consigné par :** claude-code/claude-opus-5-5
