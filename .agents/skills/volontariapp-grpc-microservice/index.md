# Anatomie d'un microservice gRPC

Implémenter ou modifier un RPC dans un microservice gRPC (ms-user, ms-event, ms-post, ms-social) : contrôleur @GrpcMethod command/query, DTO implémentant le contrat, logique dans le package domain-*, guard du token interne, fallback, clients gRPC sortants, migrations. À utiliser pour tout travail dans un ms-*.

## Concepts

- [SKILL.md](/volontariapp-grpc-microservice/SKILL.md) - point d'entrée de la skill
- [Leçons apprises](/volontariapp-grpc-microservice/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-grpc-microservice, du plus récent au plus ancien.
- [Services gRPC : faits par service](/volontariapp-grpc-microservice/references/services.md) - Agrégats, RPC, événements émis et consommés, dépendances sortantes et invariants de chaque microservice, relevés dans le code.

Historique : [log.md](/volontariapp-grpc-microservice/log.md)
