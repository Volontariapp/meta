---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-sealed-secrets, du plus récent au plus ancien."
tags: [lessons, volontariapp-sealed-secrets]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-12T12:02:16Z"
sources:
  - id: src-926acc09
    resource: deploy/apps/overlays/prod/shared-infra/db-sealed-secret.yaml
    title: deploy/apps/overlays/prod/shared-infra/db-sealed-secret.yaml
---

# Leçons

## 2026-10-19 - Nouveau service : un wizard de scellement doit passer AVANT le merge de la PR deploy

- **Type :** pitfall
- **Leçon :** ArgoCD synchronise automatiquement : si les manifests d'un nouveau service sont mergés avant que ses secrets scellés soient commités, ses pods restent en CreateContainerConfigError. Le mot de passe de base d'un service se fusionne dans apps/overlays/prod/shared-infra/db-sealed-secret.yaml (kubeseal --merge-into) ; la copie infrastructure/databases/overlays/prod/db-sealed-secret.yaml est périmée (sans ms-storage-password) et ne doit pas être touchée. Un wizard par service vit dans deploy/scripts/wizards/seal-<service>-secrets.sh, lancé par le Lead Dev (l'agent ne génère ni ne commite aucun secret). Pour un secret de chiffrement applicatif (ex. RANKING_LOCATION_KEY) la perte de la clé rend les données illisibles : la sauvegarder hors cluster.[^src-926acc09]
- **Consigné par :** claude-code/agent

## 2026-10-12 - Création de la skill

- **Type :** decision
- **Leçon :** Skill créée pour couvrir : deploy/infrastructure/security/sealed-secrets/**, deploy/apps/overlays/prod/**.
- **Consigné par :** claude-code/agent

[^src-926acc09]: deploy/apps/overlays/prod/shared-infra/db-sealed-secret.yaml
