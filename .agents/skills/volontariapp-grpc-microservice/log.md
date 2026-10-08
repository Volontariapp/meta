# Historique

## 2026-10-08

- **Vérification** - Add badge_progress and badge_progress_events tables (claude-code/agent)
- **Vérification** - Ajout des tables badge_progress et badge_progress_events dans ms-user et vérification du rôle dans changeEventState de ms-event (claude-code/agent)

## 2026-10-07

- **Vérification** - Relu : ms-post ajoute media/mediaStatus a PostDTO (PostMediaDTO), fileIds obligatoire et idempotencyKey a CreatePostCommandDTO, gardes inutiles retirees, aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : ms-user storage.client.ts, gardes inutiles retirees (fileIds, missingFileIds typés non optionnels) et formatage Prettier, aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : ms-user ajoute iconFileId et idempotencyKey au CreateBadgeCommandDTO pour suivre les contrats storage, aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : ms-event aligne ses DTO et factories de test sur les contrats storage (coverFileId, coverStatus, idempotencyKey), aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : ajout de champs de contrat (coverFileId, coverStatus, idempotencyKey) dans les DTO de ms-event, aucune regle de la skill modifiee (claude-code/agent)
- **Vérification** - Relu : modifications partielles non commitees de ms-event (champs coverFileId, coverStatus, import IsNotEmpty) pour suivre les contrats storage, aucune regle de la skill modifiee. Les DTO doivent rester alignes sur les interfaces de @volontariapp/contracts-nest apres chaque bump. (claude-code/agent)

## 2026-10-06

- **Vérification** - source de la lecon corrigee vers un fichier existant (unprocessable-entity.error.ts) (claude-code/claude-sonnet-5-5)
- **Vérification** - ajout de la regle sur le code gRPC des erreurs de domaine (BaseApiError) (claude-code/claude-sonnet-5-5)
- **Leçon** - Code gRPC d'une erreur de domaine : etendre BaseApiError, pas de mapping par code (rule) (claude-code/agent)
- **Vérification** - noms réels des migrations et des services sociaux (claude-code/claude-opus-5-5)
- **Vérification** - contenu des CLAUDE.md des repos rapatrié (fiches par service, carte des routes), sources repointées vers le code (claude-code/claude-opus-5-5)
- **Vérification** - création depuis les CLAUDE.md des repos, vérifiée contre le code (2026-10-06) (claude-code/claude-opus-5-5)
- **Création** - squelette OKF généré par evolve.py new (claude-code/claude-opus-5-5)
- **Leçon** - Création de la skill (decision) (claude-code/claude-opus-5-5)
