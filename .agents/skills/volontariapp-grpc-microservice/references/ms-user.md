---
type: Reference
title: ms-user
description: "Domaine User : agrégats, règles métier, événements, RPC et clients sortants de ms-user (repris du CLAUDE.md du repo, supprimé au profit de meta)."
tags: [ms-user, domain-user]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T10:30:00Z"
sources:
  - id: controllers
    resource: ms-user/src/modules/user/controllers
    title: Contrôleurs command/queries
  - id: clients
    resource: ms-user/src/modules/user/clients
    title: Clients gRPC sortants
  - id: triggers
    resource: npm-packages/packages/domain-user/src/database/triggers/index.ts
    title: Trigger user.created
  - id: services
    resource: npm-packages/packages/domain-user/src/services
    title: "AuthService, UserService, BadgeService"
---

# Domaine

Agrégats `UserEntity` (email, pseudo, role, rna, bio, logoPath, totalImpactScore, badges, passwordHash) et `BadgeEntity` (name, slug, description, iconPath). Rôles : `VOLUNTEER` (défaut), `ORGANIZATION` (si `rna` fourni), `ADMIN`. La logique vit dans `@volontariapp/domain-user` : `AuthService`, `UserService`, `BadgeService`, repositories Postgres[^services].

# Règles métier

- `rna` doit matcher `^W[0-9]{9}$`, sinon `INVALID_RNA` ; sinon trim et majuscules. Présence de `rna` : rôle `ORGANIZATION`.
- `pseudo` généré (adjectif + nom + 3 chiffres) s'il est absent.
- Mot de passe haché via `@volontariapp/crypto` (`hashPassword`, `verifyPassword`), jamais stocké ni loggé en clair ; un changement exige `previousPassword` (`WRONG_PASSWORD`).
- E-mail jamais loggé en clair : `calculateHash(email).slice(0, 8)`.
- `incrementImpactScore` refuse un incrément inférieur ou égal à 0 (`INVALID_SCORE_INCREMENT`).
- JWT via `@volontariapp/auth` (`JwtService`) : access et refresh signés en parallèle.

# Événements

- Émis : `user.created`, inséré dans `event_queue` par le trigger SQL `users_created_event_queue_trigger` (emitter `ms-user`, target `social:user`, payload `{ after: { id, role } }`)[^triggers].
- `user.deleted` : type déclaré dans `messaging`, **aucun émetteur** (`UserService.delete` n'écrit rien).
- Aucun consommateur dans `ms-user`. `jobs_outbox` sert au fallback : `withFallback` pousse `UserJobType.FALLBACK_*` sur `UserQueue.FALLBACK_USER` (UpdateUser, DeleteUser, AddBadgeToUser, RemoveBadgeFromUser, IncrementImpactScore).

# gRPC

`UserService` : GetUser, GetPublicUser, GetUsersByIds, ListUsers, SignUp, UpdateUser, DeleteUser, AdminGetUser, AdminUpdateUser, AdminDeleteUser, Login, RefreshToken, IncrementImpactScore, AddBadgeToUser, RemoveBadgeFromUser, GetMyFollowsProfiles, GetMyFollowersProfiles, GetEventParticipantsProfiles, GetPostLikersProfiles. `BadgeService` : CreateBadge, UpdateBadge, DeleteBadge, GetBadge, ListBadges, GetBadgeBySlug.

Contrôleurs `src/modules/user/controllers/command/{user,badge}.command.controller.ts` et `controllers/queries/`[^controllers] ; mutations sensibles protégées par `GrpcInternalGuard` posé par contrôleur et `@CurrentUser()`.

Clients sortants (`SOCIAL_PACKAGE`) : `social-relationship.query-client.ts`, `social-interaction.query-client.ts`, `social-participation.query-client.ts`[^clients].

[^controllers]: Contrôleurs command/queries
[^clients]: Clients gRPC sortants
[^triggers]: Trigger user.created
[^services]: AuthService, UserService, BadgeService
