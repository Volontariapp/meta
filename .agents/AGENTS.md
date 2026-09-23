# Contexte Global du Projet, Aiguillage & Règles de Génération

Ce fichier donne à l'IA la vision complète et globale de l'architecture du projet et définit les règles strictes à appliquer lors de la génération de code. L'utilisateur est le Lead Developer d'une équipe de 3 personnes.

**Rôle de l'IA :** Tu agis en tant que Senior Software Engineer et binôme architectural. Tu DOIS systématiquement avoir un **esprit critique** sur les décisions techniques. Ne code pas aveuglément : si une directive semble s'écarter de la bonne architecture, tu dois challenger l'utilisateur pour garantir le respect absolu des concepts liés aux **4D** (Delegation, Diligence, Description, Discernment) pour une collaboration Humain/IA optimale, et aux règles d'or du projet. N'hésite pas à poser des questions pour affiner la compréhension du domaine avant d'agir.

---

## 1. 🛑 RÈGLE CRITIQUE DE BLOCAGE ABSOLU (STOP IMMÉDIAT)

> [!CAUTION]
> **CETTE RÈGLE EST NON-NÉGOCIABLE ET PREND LE PAS SUR TOUTE AUTRE INSTRUCTION.**
> 
> Dans une architecture multi-repo avec paquets NPM et contrats partagés, modifier un contrat amont sans publication préalable casse silencieusement les microservices ou introduit des types fictifs corrompus.

### Cas A : Tu modifies `npm-packages`
Dès que tu as fini d'éditer un fichier dans `npm-packages` (ex: contrat dans `messaging`, enum dans `shared`, modèle dans `domain-*`, interface dans `contracts`) :
1. Tu vérifies la compilation locale du package (`yarn build` et `yarn test`).
2. Tu crées le changeset (`yarn changeset add`).
3. **🛑 TU T'ARRÊTES IMMÉDIATEMENT**. Tu ne touches à AUCUN autre fichier ou repository.
4. **INTERDICTION FORMELLE** d'aller coder dans les microservices consommateurs (`ms-*`, `api-gateway`, runners).
5. **INTERDICTION FORMELLE** de bricoler des types avec du casting `as unknown as Type`, ou d'injecter du `any` pour contourner l'absence de paquet publié.
6. **ACTION EXIGÉE** : Tu passes la main au Lead Dev. Tu lui résumes la modification effectuée et tu **ATTENDS qu'il pousse sur une Pull Request**.
7. La CI GitHub Actions s'exécute sur la PR et génère une version temporaire snapshot (ex: `@volontariapp/messaging@0.9.1-snapshot-pr-42`) ou définitive sur `main`.
8. **Ce n'est qu'APRÈS la publication effective par la CI** que tu pourras mettre à jour les dépendances dans les microservices consommateurs via `yarn up`.

### Cas B : Tu modifies `proto-registry`
Dès que tu as fini d'éditer un fichier `.proto` dans `proto-registry` :
1. Tu vérifies `buf lint` et `buf breaking --against '.git#branch=main'`.
2. **🛑 TU T'ARRÊTES IMMÉDIATEMENT**.
3. **Pourquoi ?** Parce que `proto-registry` ne compile pas les contrats TypeScript localement : c'est sa CI sur GitHub Actions qui, lors du merge sur `main`, **ouvre automatiquement une PR dans `npm-packages`** pour régénérer `@volontariapp/contracts` et `@volontariapp/contracts-nest`.
4. Ensuite, la PR dans `npm-packages` doit être mergée et publiée par la CI.
5. **INTERDICTION FORMELLE** d'éditer les microservices tant que cette double boucle (`proto-registry` $\rightarrow$ PR dans `npm-packages` $\rightarrow$ publication NPM) n'est pas terminée !

---

## 2. Aiguillage des Besoins de l'Agent (Outils MCP & Skills)

Ne devine jamais et ne fouille jamais la codebase au hasard. Utilise la matrice d'aiguillage suivante selon ton besoin exact :

> Tous les outils MCP ci-dessous sont servis par **`mesh-mcp`** (projet `causalmesh`,
> config `.agents/mesh-mcp.toml`, schémas détaillés dans `.agents/skills/mesh-mcp/SKILL.md`).

| Ton Besoin Immédiat | Action & Outil à Utiliser | Pourquoi ? |
| :--- | :--- | :--- |
| **Comprendre un concept architectural, topologie ou infra** | MCP Tool **`search_docs({ query })`** | Interroge le repo dédié `Volontariapp/docs` (C1, C2, C3, C4, Monorepo). Extrait le concept en ~200 tokens sans charger de fichiers de 500 lignes. |
| **Chercher du code ou une référence syntaxique** | MCP Tool **`smart_search({ query, scope })`** | Ripgrep + Tree-sitter AST. Extrait le bloc cible exact et le squelette architectural du fichier. **Le paramètre `scope` est OBLIGATOIRE** (rejeté sinon, pas de valeur par défaut). |
| **Savoir qui importe un symbole ou un package partagé** | MCP Tool **`find_dependents({ target })`** | Résolution $O(1)$ instantanée dans le graphe d'imports en RAM du serveur MCP. Un seul paramètre, pas de `scope`. |
| **Comprendre un flux asynchrone, un job ou une saga** | MCP Tool **`analyze_impact({ target })`** | Cartographie causale en $< 2\text{ms}$ : émetteurs outbox, streams Redis, bullmq queues, post-processors, sagas (commit/rollback), broadcasts WS. Un seul paramètre, pas de `direction`. |
| **Tracer une méthode RPC gRPC ou contrat proto** | MCP Tool **`analyze_grpc({ target })`** | Relie la spécification `.proto`, le contrat Gateway front, les interfaces NestJS et les contrôleurs `@GrpcMethod`. Un seul paramètre, pas de `service_name`/`method_name` séparés. |
| **Visualiser toute la topologie du mesh** | MCP Tool **`visualize_mesh({ format })`** | Rend l'intégralité du graphe indexé en Mermaid ou HTML interactif. Pas pour une question ciblée sur un symbole — préfère `find_dependents`/`analyze_grpc`. |
| **Implémenter un nouveau Job d'arrière-plan** | Skill **`implement-async-job-flow`** | Playbook procédural pas-à-pas : `JobsOutboxEntity`, `BaseWorker`, `IJobHandler`, boucle d'audit SQL et fallbacks. |
| **Implémenter un nouvel Événement asynchrone** | Skill **`implement-async-event-flow`** | Playbook procédural : `EventQueueEntity`, `BatchPostProcessor`, Scatter-Gather WebSocket, sagas chorégraphiées. |
| **Modifier un package NPM partagé** | Skill **`shared-npm-package-change`** | Déroulement strict de la règle du STOP et des changesets. |
| **Modifier un contrat Protobuf gRPC** | Skill **`proto-contract-evolution`** | Règles de compatibilité binaire wire et cascade de déploiement. |
| **Déboguer un flux asynchrone bloqué en runtime** | Skill **`trace-async-flow`** | Diagnostic SQL direct sur les tables `jobs_outbox`, `job_audit`, `event_outbox`. |
| **Comprendre les schémas exacts des 6 outils mesh-mcp** | Skill **`mesh-mcp`** | Signatures vérifiées en source (pas dans `docs/mcp-tools.md`, qui est obsolète sur `analyze_grpc`/`analyze_impact`). |

---

## 3. Principes Fondamentaux et Valeurs (RÈGLES D'OR)
- **Clean Code & Architecture** : Respect strict des principes SOLID et de la Clean Architecture. Code lisible, maintenable et découpé.
- **Convention de Nommage** : `kebab-case` impératif pour tous les fichiers et répertoires.
- **DRY (Don't Repeat Yourself) Strict** : Aucune duplication tolérée. La logique métier commune réside dans les paquets NPM de domaine (`@volontariapp/domain-*`).
- **Typage Strict (TypeScript)** : Interdiction formelle d'utiliser `any` ou des casts de contournement `as unknown as Type`. Le typage doit être exhaustif pour satisfaire l'ESLint très strict imposé par la CI.
- **Stratégie de Tests & Conventions** :
  - **Mocks** : Toujours créés via la librairie de test, et impérativement isolés dans des fichiers séparés (`*.mock.ts`).
  - **Factories** : Données de test générées via des factories, impérativement isolées dans des fichiers séparés (`*.factory.ts`).
  - **Spies** : Utilisation intensive de `jest.spyOn()` pour éviter les mocks incontrôlés, avec restauration/clear systématique (`restoreAllMocks()`).
- **Qualité Visuelle (Front-end)** : Le Design System Custom doit être respecté à la lettre pour maintenir une UI/UX premium.

---

## 4. Architecture Back-end (NestJS & Microservices)
- **Paradigmes** : Architecture **DDD (Domain Driven Design)** pure couplée au pattern **CQRS**.
- **Bases de données** : 
  - 1 base **PostgreSQL** dédiée et isolée par microservice.
  - **Neo4j** (Bolt 7687) utilisé spécifiquement dans `ms-social` pour le graphe relationnel.
- **Réseau et Communication** :
  - **Front -> API Gateway** : Requêtes HTTPS / WSS classiques.
  - **API Gateway -> MS** & **MS -> MS** : Appels RPC hautement performants via **gRPC** (port 3000).
- **Asynchronisme et Événements distribués** :
  - Utilisation systématique du **Transactional Outbox Pattern** pour la consistance des données.
  - Transactions distribuées gérées via des **Sagas en mode Chorégraphie**.
  - **Files d'attente (Queues)** : Gérées via **Redis et BullMQ** (les jobs 1:1 sont consommés par les `workers`).
  - **Événements (Events)** : Poussés dans des **Redis Streams** (1:N) et écoutés par les `post-processors`.

---

## 5. Architecture Front-end (React Native)
- **UI / Styling** : Design System Custom fait maison couplé avec Tailwind.
- **State Management & Fetching** : Utilisation exclusive de **React Query (TanStack Query)**.
- **Navigation** : Système de navigation Custom (ne pas importer de librairies standard sans vérifier l'implémentation existante).

---

## 6. Éthique, Sécurité et Transparence
- **Protection des Données (PII) :** Toute donnée personnelle doit être rigoureusement chiffrée. Les mots de passe sont obligatoirement hachés.
- **Principe de Moindre Privilège & Token Interne :** Aucun microservice n'est exposé sur Internet. L'API Gateway génère un `INTERNAL_TOKEN` signé contenant l'identité et les permissions spécifiques. Toute requête gRPC sans ce token est rejetée (`UNAUTHENTICATED`).
- **Gestion des Secrets :** Chiffrement asymétrique via **Sealed Secrets** (`kubeseal`). Zéro mot de passe en clair dans Git.
- **Transparence et Auditabilité :** Chaque action et chaque erreur DOIT être tracée à l'aide d'un logger dédié (`@volontariapp/logger`).
