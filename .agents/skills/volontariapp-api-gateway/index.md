# Exposer ou Modifier une Route REST Edge

Playbook opérationnel pas-à-pas pour exposer ou modifier une route REST Edge sur api-gateway : DTO Swagger, contrôleur REST, guards, token interne propagé en métadonnée gRPC, support HTTP 206 et tests.

## Concepts

- [SKILL.md](/volontariapp-api-gateway/SKILL.md) - point d'entrée de la skill
- [Leçons apprises](/volontariapp-api-gateway/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-api-gateway, du plus récent au plus ancien.
- [Carte des routes REST](/volontariapp-api-gateway/references/routes.md) - Routes REST de api-gateway et microservice cible de chacune (reprise du CLAUDE.md du repo, supprimé au profit de meta).
- [Sécurité, Risques et Modules de l'API Gateway](/volontariapp-api-gateway/references/security-and-risks.md) - Architecture de sécurité de l'API Gateway : token interne, modules existants, clients gRPC et inventaire des risques et failles connus.

Historique : [log.md](/volontariapp-api-gateway/log.md)
