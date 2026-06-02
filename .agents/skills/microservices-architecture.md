# Volontariapp Microservices Architecture Skills

## Communication Inter-Services
- **Architecture Hybride** : HTTP/REST pour l'entrée utilisateur via **api-gateway**, et **gRPC** pour la communication backend.
- **Ports Standards** :
  - L'api-gateway expose des points d'entrée HTTP (reverse proxy via Traefik en Ingress sur 80/443).
  - En interne, la communication gRPC entre les microservices (api-gateway, ms-user, ms-post, ms-event, ms-social) se fait sur le **port 3000**.
  - Bases de données : PostgreSQL sur le port **5432**, Neo4j (Bolt) sur le port **7687**.

## Cycle de vie et Résilience
- **Wait-For Lifecycle** : Pour éviter les `CrashLoopBackOff`, les microservices ne démarrent pas tant que la connectivité réseau à leur base de données n'est pas "Open" (vérifiée via initContainers).
- **Ressources & Quotas** :
  - **API Gateway** : Requests 50m/64Mi, Limits 200m/128Mi.
  - **Microservices** : Requests 100m/128Mi, Limits 500m/256Mi.

## Stack Technique
- NestJS (v11) pour tous les microservices et l'API Gateway.
- Yarn 4 (Berry) avec workspaces.
- Base de données : PostgreSQL avec TypeOrm.
- Cache/Queue : Redis (BullMQ, Redis Stream).
