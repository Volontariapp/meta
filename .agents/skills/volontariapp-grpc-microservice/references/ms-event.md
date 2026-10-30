---
type: Reference
title: ms-event
description: "Domaine Event : agrégats, CDC, fallback, RPC, client sortant et mapping DTO vers entité de ms-event (repris du CLAUDE.md et de l'AGENT.md périmé de ws-service)."
tags: [ms-event, domain-event]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T10:30:00Z"
sources:
  - id: controllers
    resource: ms-event/src/modules/event/controllers
    title: Contrôleurs command/query
  - id: transformers
    resource: ms-event/src/modules/event/transformers
    title: Transformers DTO vers entité
  - id: triggers
    resource: npm-packages/packages/domain-event/src/database/triggers
    title: Triggers CDC de domain-event
  - id: services
    resource: npm-packages/packages/domain-event/src/services
    title: "EventService, GeocodingService"
  - id: clients
    resource: ms-event/src/modules/event/clients
    title: Client participation (SOCIAL_PACKAGE)
---

# Domaine

Events (sorties bénévoles), Tags, Requirements, entièrement dans `@volontariapp/domain-event` (entités, services, repositories Postgres, géocodage)[^services] :

- `EventEntity` : name, description, startAt/endAt, location géocodée, type (`SOCIAL`, `ECOLOGY`), state (`DRAFT`, `PUBLISHED`, `IN_PROGRESS`, `FINISHED`, `CANCELLED`), `saga_status`, awardedImpactScore, maxParticipants/currentParticipants, organizerId, tags, requirements.
- `RequirementEntity` : name, quantity/currentQuantity, isSystem, createdBy/updatedBy. `TagEntity` : slug, name, balise, updatedBy.

`ms-event` ne fournit que contrôleurs gRPC, DTO, transformers, migrations et intégration outbox.

# Événements et fallback

- `event_queue` alimenté par CDC : triggers `EVENTS_TRIGGER`, `REQUIREMENTS_TRIGGER`, `TAGS_TRIGGER`, `EVENT_TAGS_TRIGGER` de `domain-event`, installés par la migration `1776786226146-SetupEventTriggers.ts`, payload `{before, after}`[^triggers].
- `jobs_outbox` uniquement en fallback : `withFallback` sur createEvent, updateEvent, changeEventState, manageRequirements, deleteEvent pousse `JobMessagingType.FALLBACK_*` vers `EventsQueue.FALLBACK_EVENTS` (emitter `ms-event`), puis `FALLBACK_ACTIVATED`. Les erreurs 400/404/409 ne déclenchent jamais de fallback.
- Aucun consommateur dans `ms-event`.

# gRPC

`EventCommandService` : CreateEvent, UpdateEvent (`update_mask`), ChangeEventState, ManageRequirements (oneof add/remove), DeleteEvent. `EventQueryService` : GetEvent, GetEventsByIds, SearchEvents, ListRequirements, GetUserCreatedEvents, GetUserParticipatedEvents, GetUserWishedEvents. `TagCommandService` : CreateTag, UpdateTag, DeleteTag. `TagQueryService` : GetTags[^controllers].

Client sortant `SocialParticipationQueryClientService` (`SOCIAL_PACKAGE`) : résout les ids d'events créés, participés ou souhaités puis charge les entités localement ; propage `x-internal-token`[^clients].

# Mapping DTO vers entité (transformers)

Les transformers sont le seul endroit de conversion[^transformers] :

| DTO | Entité | Note |
| :--- | :--- | :--- |
| `EventDTO.title` | `EventEntity.name` | Noms différents, ne jamais les intervertir |
| `RequirementDTO.neededQuantity` | `RequirementEntity.quantity` | Noms différents |
| `Point { latitude, longitude }` | `EventLocation` | Valide les bornes, sinon `INVALID_LOCATION` |
| Mise à jour | `has('<champ>')` sur `update_mask` | Proto3 décode un champ absent en valeur zéro : ne copier que les champs du masque |

# Règles observées

- `ManageRequirements` : `REQUIREMENT_NOT_FOUND` si l'id à retirer n'existe pas sur l'event.
- Géocodage OpenStreetMap puis Google Maps en secours, désactivé en test.

[^controllers]: Contrôleurs command/query
[^transformers]: Transformers DTO vers entité
[^triggers]: Triggers CDC de domain-event
[^services]: EventService, GeocodingService
[^clients]: Client participation (SOCIAL_PACKAGE)
