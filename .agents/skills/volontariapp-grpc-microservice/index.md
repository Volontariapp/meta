# Anatomie d'un microservice gRPC

Implémenter ou modifier un RPC dans un microservice gRPC (ms-user, ms-event, ms-post, ms-social) : contrôleur @GrpcMethod command/query, DTO implémentant le contrat, logique dans le package domain-*, guard du token interne, fallback, clients gRPC sortants, migrations. À utiliser pour tout travail dans un ms-*.

## Concepts

- [SKILL.md](/volontariapp-grpc-microservice/SKILL.md) - point d'entrée de la skill
- [Leçons apprises](/volontariapp-grpc-microservice/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-grpc-microservice, du plus récent au plus ancien.
- [ms-event](/volontariapp-grpc-microservice/references/ms-event.md) - Domaine Event : agrégats, CDC, fallback, RPC, client sortant et mapping DTO vers entité de ms-event (repris du CLAUDE.md et de l'AGENT.md périmé de ws-service).
- [ms-post](/volontariapp-grpc-microservice/references/ms-post.md) - Domaine Post : agrégats, invariants, événements outbox, RPC implémentés ou non et enrichissement via ms-social (repris du CLAUDE.md du repo).
- [ms-social](/volontariapp-grpc-microservice/references/ms-social.md) - Domaine Social (Neo4j) : noeuds miroirs, relations, invariants, requête de recommandation et services gRPC de ms-social (repris du CLAUDE.md du repo).
- [ms-user](/volontariapp-grpc-microservice/references/ms-user.md) - Domaine User : agrégats, règles métier, événements, RPC et clients sortants de ms-user (repris du CLAUDE.md du repo, supprimé au profit de meta).
- [Services gRPC : faits par service](/volontariapp-grpc-microservice/references/services.md) - Agrégats, RPC, événements émis et consommés, dépendances sortantes et invariants de chaque microservice, relevés dans le code.

Historique : [log.md](/volontariapp-grpc-microservice/log.md)
