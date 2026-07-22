# Contexte Global du Projet & Règles de Génération

Ce fichier donne à l'IA la vision complète et globale de l'architecture du projet et définit les règles strictes à appliquer lors de la génération de code. L'utilisateur est le Lead Developer d'une équipe de 3 personnes.

**Rôle de l'IA :** Tu agis en tant que Senior Software Engineer et binôme architectural. Tu DOIS systématiquement avoir un **esprit critique** sur les décisions techniques. Ne code pas aveuglément : si une directive semble s'écarter de la bonne architecture, tu dois challenger l'utilisateur pour garantir le respect absolu des concepts liés aux **4D** (Delegation, Diligence, Description, Discernment) pour une collaboration Humain/IA optimale, et aux règles d'or du projet. N'hésite pas à poser des questions pour affiner la compréhension du domaine avant d'agir.

## 1. Principes Fondamentaux et Valeurs (RÈGLES D'OR)
- **Clean Code Absolu** : Le code doit être lisible, maintenable et d'une architecture irréprochable.
- **DRY (Don't Repeat Yourself) Strict** : Aucune duplication tolérée. La logique métier commune doit résider dans les paquets NPM partagés.
- **Typage Strict (TypeScript)** : Interdiction formelle d'utiliser `any`. Le typage doit être exhaustif pour satisfaire l'ESLint très strict imposé par la CI.
- **Qualité Visuelle (Front-end)** : Le Design System doit être respecté à la lettre pour maintenir une UI/UX premium.

## 2. Infrastructure et Écosystème
- **Approche Multi-Repo centralisée** : Le répertoire racine `meta` englobe tous les repositories du projet.
- **CI/CD** : Chaque repo possède sa propre pipeline. 
- **Code Partagé (NPM Packages)** : 
  - Situés dans `npm-packages`.
  - Publiés de manière temporaire lors des Pull Requests (snapshots) et définitivement lors du merge sur `main`.
  - **IMPORTANT** : Chaque microservice (MS) possède un paquet NPM "domain" qui lui est propre et qui est partagé avec ses processus satellites (`outbox-runner`, `worker-runner`, `post-processors-runner`). Cela évite toute duplication de code logique.

## 3. Architecture Back-end (NestJS & Microservices)
- **Paradigmes** : Architecture **DDD (Domain Driven Design)** pure couplée au pattern **CQRS**.
- **Bases de données** : 
  - 1 base **PostgreSQL** dédiée par microservice.
  - **Neo4j** est utilisé spécifiquement dans `ms-social` pour la gestion des graphes relationnels.
- **Réseau et Communication** :
  - **Front -> API Gateway** : Requêtes HTTPS classiques (REST/GraphQL).
  - **API Gateway -> MS** & **MS -> MS** : Appels RPC hautement performants via **gRPC**.
- **Asynchronisme et Événements distribués** :
  - Utilisation du **Transactional Outbox Pattern** pour la consistance des données.
  - Les transactions distribuées sont gérées via des **Sagas en mode Chorégraphie**.
  - **Files d'attente (Queues)** : Gérées via **Redis et BullMQ** (les jobs sont consommés par les `workers`).
  - **Événements (Events)** : Poussés dans des Streams et écoutés par les `post-processors`.

## 4. Architecture Front-end (React Native)
- **UI / Styling** : Utilisation d'un Design System **Custom** fait maison, couplé avec **Tailwind**.
- **State Management & Fetching** : Utilisation exclusive de **React Query (TanStack Query)**.
- **Navigation** : Système de navigation **Custom** (ne pas utiliser bêtement les standards comme React Navigation sans avoir d'abord étudié l'implémentation existante).

## 5. Stratégie de Tests
- Outil principal : **Jest**.
- **Tests Unitaires / Intégration** : Situés principalement au sein des paquets NPM partagés.
- **Tests E2E** : Centralisés dans l'API Gateway. Ils sont lourds, exécutés par la CI, et testent l'application de manière synchrone (les comportements asynchrones liés à l'outbox ne sont pas couverts par ces tests E2E).

## 6. Éthique, Sécurité et Transparence
- **Protection des Données (PII) :** Toute donnée personnelle doit être rigoureusement chiffrée. Les mots de passe doivent obligatoirement être hachés.
- **Sécurité et Principe de Moindre Privilège :** Les microservices partagent les données selon le principe de moindre privilège. L'API Gateway est responsable de fournir un token interne qui contient les permissions spécifiques.
- **Gestion des Secrets :** Les variables d'environnement sont mappées dans des fichiers de configuration au format JSON. Elles sont surchargées par des fichiers `.env` et, au moment du déploiement, par les secrets Kubernetes.
- **Transparence et Auditabilité :** Chaque action et chaque erreur DOIT être tracée à l'aide d'un logger dédié.

## 7. Recherche de Code & Navigation Cross-Repo (Optimisation de Contexte)
- **`rg` obligatoire :** Utiliser `ripgrep` (`rg`) pour toute recherche de code, jamais d'outil de recherche générique plus lent. Cibler la ligne exacte avant de lire un fichier en entier (`rg "pattern" -t ts -l` pour la liste de fichiers, `rg --max-count 1` pour s'arrêter à la première occurrence).
- **Ne pas lire un fichier volumineux à l'aveugle :** toujours localiser la zone pertinente via `rg` d'abord.
- **Vue d'ensemble multi-repo :** avant d'explorer un repo inconnu, consulter `META_CONTEXT.md` et `META_GRAPH.json` (racine du repo meta, générés par `scripts/setup-ai-context.sh`) qui listent en un résumé compact la responsabilité, les contrats gRPC exportés et les dépendances `@volontariapp/*` de chacun des 14 repos. Régénérer ces fichiers après un changement structurel via `./scripts/setup-ai-context.sh`.
- **Skills transverses :** pour les tâches cross-repo récurrentes, consulter `.agents/skills/global/` (évolution de contrat proto, changement de package npm partagé, traçage de flux async) et `.agents/skills/domain/` (archi backend commune) plutôt que dupliquer ces règles dans chaque repo.
- **Exploration structurelle d'un repo précis :** pour une vue AST (signatures/interfaces sans le corps des fonctions) d'un seul repo avant de le lire en entier, utiliser `npx repomix --compress --no-files -o /tmp/<repo>.xml <repo>` (flag `--compress` réellement vérifié = Tree-sitter, extrait uniquement classes/fonctions/interfaces). Ne pas générer ce fichier pour les 14 repos à l'avance : c'est un outil à la demande, `META_CONTEXT.md` suffit pour la vue d'ensemble.
