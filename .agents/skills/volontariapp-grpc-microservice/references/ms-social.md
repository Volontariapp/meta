---
type: Reference
title: ms-social
description: "Domaine Social (Neo4j) : noeuds miroirs, relations, invariants, requête de recommandation et services gRPC de ms-social (repris du CLAUDE.md du repo)."
tags: [ms-social, domain-social, neo4j]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T10:30:00Z"
sources:
  - id: modules
    resource: ms-social/src/modules
    title: Modules par agrégat
  - id: repositories
    resource: npm-packages/packages/domain-social/src/repositories
    title: Repositories Neo4j (Cypher)
  - id: services
    resource: npm-packages/packages/domain-social/src/services
    title: Services de domain-social
---

# Domaine

`ms-social` ne stocke que des noeuds miroirs réduits à un id (`SocialUser`, `SocialPost`, `SocialEvent`) et leurs relations dans Neo4j ; les données riches appartiennent aux autres services. Modules[^modules] :

| Module | Contenu |
| :--- | :--- |
| `user-node` | Existence des noeuds `SocialUser` |
| `relationship` | `FOLLOW`, `BLOCK` entre `SocialUser` |
| `publication` | Noeuds `SocialPost`, relation `CREATED` (propriété) |
| `interaction` | `LIKE` entre user et post |
| `participation` | Noeuds `SocialEvent`, relations `CREATED`, `PARTICIPATE`, `WISH_TO_PARTICIPATE` |
| `event-post-link` | Lien post vers event (`LinkPostToEvent`) |

# Invariants

- Toute création vérifie l'inexistence (`*_ALREADY_EXISTS`), toute suppression l'existence (`*_NOT_FOUND`) dans les services[^services], en plus des `MERGE` / `DELETE` Cypher.
- Aucune règle anti self-follow ou self-block.
- « Amis » = follow réciproque `(u)-[:FOLLOW]->(friend)-[:FOLLOW]->(u)`.

# Neo4j

Repositories `neo4j-*.repository.ts` sur `Neo4jBaseRepository` (`write`, `readOne`, `readPaginated`)[^repositories]. Requête la plus complexe : `getRecommendedEventIds` (participation), Cypher construit dynamiquement avec des `NOT EXISTS {...}` pour exclure les events créés, participés ou souhaités par l'utilisateur ou des comptes bloqués, et restriction aux amis selon `onlyParticipatedByFriends` / `onlyWishedByFriends` / `onlyCreatedByFriends`.

# Événements et gRPC

- **N'émet aucun événement** : les tables outbox existent pour les migrations communes seulement ; aucun consommateur BullMQ. Les écritures arrivent par gRPC ou par les post-processors sociaux.
- Services par agrégat, en paire Command/Query (`SocialUserNodeCommandService`, `InteractionQueryService`...) pour user-node, relationship, publication, interaction, participation et event-post-link, chacun avec ses méthodes `Admin*` ; contrôleurs `@GrpcMethod(GRPC_SERVICES.*, ...)`. DTO avec `@IsString()` sur les `*Id`.

[^modules]: Modules par agrégat
[^repositories]: Repositories Neo4j (Cypher)
[^services]: Services de domain-social
