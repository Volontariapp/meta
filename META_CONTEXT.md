# META_CONTEXT

Résumé auto-généré (scripts/setup-ai-context.sh) — ne pas éditer à la main, régénérer via le script.

## api-gateway
- Responsabilité : Routes REST -> microservice
- Dépend de (packages partagés) : @volontariapp/auth,@volontariapp/bridge-nest,@volontariapp/config,@volontariapp/contracts,@volontariapp/contracts-nest,@volontariapp/errors,@volontariapp/errors-nest,@volontariapp/eslint-config,@volontariapp/health-check,@volontariapp/health-check-nest,@volontariapp/logger,@volontariapp/monitoring,@volontariapp/shared,@volontariapp/testing

## ms-event
- Responsabilité : Domaine ms-event
- Dépend de (packages partagés) : @volontariapp/auth,@volontariapp/bridge-nest,@volontariapp/config,@volontariapp/contracts,@volontariapp/contracts-nest,@volontariapp/database,@volontariapp/domain-event,@volontariapp/errors,@volontariapp/errors-nest,@volontariapp/eslint-config,@volontariapp/health-check,@volontariapp/health-check-nest,@volontariapp/logger,@volontariapp/messaging,@volontariapp/monitoring,@volontariapp/outbox,@volontariapp/shared,@volontariapp/validation-nest

## ms-post
- Responsabilité : ms-post gere les agregats `Post` (id, authorId, title, content, saga_status, eventId?) et `Comment`
- Dépend de (packages partagés) : @volontariapp/auth,@volontariapp/bridge-nest,@volontariapp/config,@volontariapp/contracts,@volontariapp/contracts-nest,@volontariapp/database,@volontariapp/domain-post,@volontariapp/errors,@volontariapp/errors-nest,@volontariapp/eslint-config,@volontariapp/health-check,@volontariapp/health-check-nest,@volontariapp/logger,@volontariapp/monitoring,@volontariapp/validation-nest

## ms-social
- Responsabilité : Domaine ms-social
- Dépend de (packages partagés) : @volontariapp/auth,@volontariapp/bridge-nest,@volontariapp/config,@volontariapp/contracts,@volontariapp/contracts-nest,@volontariapp/database,@volontariapp/domain-social,@volontariapp/errors,@volontariapp/errors-nest,@volontariapp/eslint-config,@volontariapp/health-check-nest,@volontariapp/logger,@volontariapp/monitoring,@volontariapp/validation-nest

## ms-user
- Responsabilité : Domaine ms-user
- Dépend de (packages partagés) : @volontariapp/auth,@volontariapp/bridge-nest,@volontariapp/config,@volontariapp/contracts,@volontariapp/contracts-nest,@volontariapp/database,@volontariapp/domain-user,@volontariapp/errors,@volontariapp/errors-nest,@volontariapp/eslint-config,@volontariapp/health-check-nest,@volontariapp/logger,@volontariapp/messaging,@volontariapp/monitoring,@volontariapp/outbox,@volontariapp/shared,@volontariapp/validation-nest

## ci-tools
- Responsabilité : CI/CD central du projet

## proto-registry
- Responsabilité : Structure de proto/volontariapp/
- Services gRPC exportés : BadgeService,EventCommandService,EventPostLinkCommandService,EventPostLinkQueryService,EventQueryService,InteractionCommandService,InteractionQueryService,ParticipationCommandService,ParticipationQueryService,PostService,PublicationCommandService,PublicationQueryService,RelationshipCommandService,RelationshipQueryService,SocialUserNodeCommandService,SocialUserNodeQueryService,TagCommandService,TagQueryService,UserService

## npm-packages
- Responsabilité : Volontariapp npm-packages monorepo
- Dépend de (packages partagés) : @volontariapp/npm-packages,@volontariapp/shared

## outbox-runners
- Responsabilité : Outbox runners processus dmons "Lean Mode"

## workers-runners
- Responsabilité : Workers Runners

## post-processors-runner
- Responsabilité : Post-Processors Runners

## ws-service
- Responsabilité : WebSocket Service (ws-service)
- Dépend de (packages partagés) : @volontariapp/auth,@volontariapp/bridge-nest,@volontariapp/config,@volontariapp/contracts,@volontariapp/contracts-nest,@volontariapp/database,@volontariapp/domain-event,@volontariapp/errors,@volontariapp/errors-nest,@volontariapp/eslint-config,@volontariapp/health-check,@volontariapp/health-check-nest,@volontariapp/logger,@volontariapp/messaging,@volontariapp/monitoring,@volontariapp/post-processors,@volontariapp/shared,@volontariapp/testing,@volontariapp/validation-nest

## changelog-checker
- Responsabilité : Outil CLI Go validation de CHANGELOG.md

## nativapp
- Responsabilité : React Native Front-End Skills (MANDATORY)
- Dépend de (packages partagés) : @volontariapp/config,@volontariapp/contracts,@volontariapp/errors,@volontariapp/logger,@volontariapp/messaging,@volontariapp/shared

