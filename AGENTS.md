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
2. Tu crées le changeset puis tu appliques le bump : `yarn changeset add` puis `yarn changeset version`, une seule fois par branche (la CI vérifie que `CHANGELOG.md` contient la version de `package.json`).
3. **🛑 TU T'ARRÊTES IMMÉDIATEMENT**. Tu ne touches à AUCUN autre fichier ou repository.
4. **INTERDICTION FORMELLE** d'aller coder dans les microservices consommateurs (`ms-*`, `api-gateway`, runners).
5. **INTERDICTION FORMELLE** de bricoler des types avec du casting `as unknown as Type`, ou d'injecter du `any` pour contourner l'absence de paquet publié.
6. **ACTION EXIGÉE** : Tu passes la main au Lead Dev. Tu lui résumes la modification effectuée et tu **ATTENDS qu'il pousse sur une Pull Request**.
7. La CI GitHub Actions s'exécute sur la PR et génère une version snapshot `<version>-snap-<sha court>`, publiée sous le dist-tag `next` et listée en commentaire de la PR (ex: `@volontariapp/messaging@2.17.1-snap-a1b2c3d`) ou définitive sur `main`.
8. **Ce n'est qu'APRÈS la publication effective par la CI** que tu pourras mettre à jour les dépendances dans les microservices consommateurs via `yarn up`.

### Cas B : Tu modifies `proto-registry`
Dès que tu as fini d'éditer un fichier `.proto` dans `proto-registry` :
1. Tu vérifies `buf lint` et `buf breaking --against '.git#branch=main'`.
2. **🛑 TU T'ARRÊTES IMMÉDIATEMENT**.
3. **Pourquoi ?** Parce que `proto-registry` ne compile pas les contrats TypeScript localement : c'est sa CI sur GitHub Actions qui, lors du merge sur `main`, **ouvre automatiquement une PR dans `npm-packages`** pour régénérer `@volontariapp/contracts` et `@volontariapp/contracts-nest`.
4. Ensuite, la PR dans `npm-packages` doit être mergée et publiée par la CI.
5. **INTERDICTION FORMELLE** d'éditer les microservices tant que cette double boucle (`proto-registry` $\rightarrow$ PR dans `npm-packages` $\rightarrow$ publication NPM) n'est pas terminée !

### Garde-fou automatique (Claude Code)

Le hook `PreToolUse` `.claude/hooks/stop-rule-guard.sh` applique cette règle mécaniquement : dès qu'un fichier de `npm-packages/` ou de `proto-registry/` est édité dans une session, toute édition d'un repo qui dépend de `@volontariapp/*` (`ms-*`, `api-gateway`, `ws-service`, `nativapp`, runners) est refusée pour le reste de la session. Après une modification de `proto-registry`, les packages générés `npm-packages/packages/contracts*` sont aussi verrouillés.

Le déverrouillage revient **au Lead Dev uniquement**, une fois la version publiée par la CI : `! .claude/hooks/stop-rule-guard.sh release`. **INTERDICTION FORMELLE** pour l'agent de lancer cette commande ou de contourner le hook (édition via `sed`, `cat >`, script...).

---

## 2. Aiguillage des Besoins de l'Agent (Outils MCP & Skills)

Ne devine jamais et ne fouille jamais la codebase au hasard. Utilise la matrice d'aiguillage suivante selon ton besoin exact. Une recherche `grep`/`rg` lancée à la racine de `meta` (donc sur tous les repos) est refusée par un hook Claude Code : passer par `mesh-mcp`, ou cibler un seul repo (`path: "ms-user"`) pour un identifiant exact.

> Tous les outils MCP ci-dessous sont servis par **`mesh-mcp`** (projet `causalmesh`,
> config `.agents/mesh-mcp.toml`, schémas détaillés dans `.agents/skills/volontariapp-mesh-mcp/SKILL.md`).

| Ton Besoin Immédiat | Action & Outil à Utiliser | Pourquoi ? |
| :--- | :--- | :--- |
| **Comprendre un concept architectural, topologie ou infra** | MCP Tool **`search_docs({ query })`** | Interroge le repo dédié `Volontariapp/docs` (C1, C2, C3, C4, Monorepo). Extrait le concept en ~200 tokens sans charger de fichiers de 500 lignes. |
| **Chercher du code ou une référence syntaxique** | MCP Tool **`smart_search({ query, scope })`** | Ripgrep + Tree-sitter AST. Extrait le bloc cible exact et le squelette architectural du fichier. **Le paramètre `scope` est OBLIGATOIRE** (rejeté sinon, pas de valeur par défaut). |
| **Savoir qui importe un symbole ou un package partagé** | MCP Tool **`find_dependents({ target, granularity? })`** | Résolution dans le graphe d'imports en RAM. Pas de `scope`. `granularity: "package"` donne les services dépendants, `"file"` les fichiers ; `include_tests`, `limit`, `offset` optionnels. |
| **Comprendre un flux asynchrone, un job ou une saga** | MCP Tool **`analyze_impact({ target, depth? })`** | Cartographie causale : émetteurs outbox, triggers SQL, jobs `withFallback` et leurs handlers, streams Redis, queues BullMQ, post-processors, sagas, push WebSocket et listeners `nativapp`. `depth` (1 par défaut, max 5) suit les réémissions ; pas de `direction`. |
| **Tracer une méthode RPC gRPC ou contrat proto** | MCP Tool **`analyze_grpc({ target, base? })`** | Relie le `.proto`, les contrôleurs `@GrpcMethod` et les clients (y compris via `commandService`/`queryService` hérités). `base` (ex. `main`) active la vérification wire-format, enums compris. Pas de `service_name`/`method_name` séparés. |
| **Visualiser toute la topologie du mesh** | MCP Tool **`visualize_mesh({ format, service? })`** | Vue agrégée par service en `mermaid`, `json` ou `html` ; `service` zoome sur un service. Pas pour une question ciblée : préfère `find_dependents`/`analyze_grpc`. |
| **Implémenter un nouveau Job d'arrière-plan** | Skill **`volontariapp-implement-async-job-flow`** | Playbook procédural pas-à-pas : `JobsOutboxEntity`, `BaseWorker`, `IJobHandler`, boucle d'audit SQL et fallbacks. |
| **Implémenter un nouvel Événement asynchrone** | Skill **`volontariapp-implement-async-event-flow`** | Playbook procédural : `EventQueueEntity`, `BatchPostProcessor`, Scatter-Gather WebSocket, sagas chorégraphiées. |
| **Modifier un package NPM partagé** | Skill **`volontariapp-shared-npm-package-change`** | Déroulement strict de la règle du STOP et des changesets. |
| **Faire évoluer ou déprécier un contrat Protobuf gRPC** | Playbook **`volontariapp-proto-contract-evolution`** | Règles de compatibilité binaire wire, cascade de déploiement et cycle de dépréciation en 3 phases (`reserved`). |
| **Travailler sur le stockage de fichiers (upload, scan, image d'un post / event / avatar)** | Skill **`volontariapp-file-storage-flow`** | Invariants (quarantaine, `file_id` jamais d'URL, `ConfirmFileAttachment`), recette pour rattacher une image à une entité, renvoi vers `docs/stockage-fichiers/`. |
| **Ajouter ou modifier une route REST, une règle d'auth ou un appel gRPC côté gateway** | Playbook **`volontariapp-api-gateway`** | `@GatewayController`, token interne en métadonnée, clients gRPC, `FALLBACK_ACTIVATED` (206), proxy WebSocket, risques connus de la gateway. |
| **Implémenter ou modifier un RPC dans un `ms-*`** | Playbook **`volontariapp-grpc-microservice`** | Contrôleurs command/query, DTO du contrat, `GrpcValidationPipe`, `GrpcInternalGuard`, `withFallback` (renvoi vers `volontariapp-db-migration` si migration associée). |
| **Modifier le schéma de base de données PostgreSQL ou propager les migrations** | Playbook **`volontariapp-db-migration`** | Zero-downtime Expand/Contract, partition domain/common, synchronisation via `yarn meta sync-migrations`, tests `migration:run:local`. |
| **Dépiler, rejouer ou débloquer une panne asynchrone (DLQ, Redis Streams, Outbox)** | Playbook **`volontariapp-async-remediation`** | Inspection poison pill `<stream>-dlq`, `XCLAIM`/`XACK`, réinjection `XADD`/`XDEL`, réconciliation d'état SQL. |
| **Créer, sceller ou renouveler un secret sensible Kubernetes (kubeseal)** | Playbook **`volontariapp-sealed-secrets`** | Chiffrement asymétrique `kubeseal`, zéro secret en clair dans Git, déclaration overlays Kustomize prod. |
| **Modifier l'infra Kubernetes (manifests, réseau, Kustomize, ArgoCD)** | Playbook **`volontariapp-deploy-gitops`** | Repo `deploy` (ArgoCD), manifests durcis PSA Restricted, NetworkPolicies default-deny, validation kustomize. |
| **Créer ou scaffolder un nouveau microservice et ses runners** | Playbook **`volontariapp-scaffold-microservice`** | Séquence complète en 10 étapes (proto, domaine, ms, outbox, worker, post-processor, gateway, deploy). |
| **Modifier la CI partagée ou l'infra locale docker-compose** | Skill **`volontariapp-ci-tools`** | Workflows réutilisables appelés par tous les repos, impact multi-repo, services du docker-compose local. |
| **Diagnostiquer un flux asynchrone bloqué en runtime (audit passif)** | Skill **`volontariapp-trace-async-flow`** | Diagnostic SQL direct sur `jobs_outbox`, `job_audit`, `event_queue` (renvoi vers `volontariapp-async-remediation` pour agir). |
| **Comprendre les schémas exacts des 6 outils mesh-mcp** | Skill **`volontariapp-mesh-mcp`** | Signatures vérifiées en source (pas dans `docs/mcp-tools.md`, qui est obsolète sur `analyze_grpc`/`analyze_impact`). |

---

## 2 bis. Workflow : une skill par étape

Avant chaque étape, ouvrir le `SKILL.md` de la skill de l'étape (plugin matt-pocock), puis celui de la skill de domaine `volontariapp-*` concernée. Quand aucune ligne ne correspond, commencer par `ask-matt`.

| Étape | Skill de l'étape | Compléter avec |
| :--- | :--- | :--- |
| Implémenter un ticket ou une spec | `implement`, en `tdd` | la skill `volontariapp-*` du domaine |
| Créer un nouveau microservice de zéro | `implement` | `volontariapp-scaffold-microservice` |
| Évolution de schéma ou migration DB | `implement` | `volontariapp-db-migration` |
| Bug, régression, lenteur | `diagnosing-bugs` | `volontariapp-trace-async-flow` si le flux est asynchrone |
| Incident, blocage ou message en DLQ (flux asynchrone) | `diagnosing-bugs` | `volontariapp-trace-async-flow` puis `volontariapp-async-remediation` |
| Concevoir ou restructurer un module | `codebase-design`, `improve-codebase-architecture` | `AGENT.md` (structure DDD/CQRS d'un microservice) |
| Vocabulaire métier, décision d'architecture (ADR) | `domain-modeling` | `search_docs` (repo `docs`) |
| Éprouver un plan ou une décision | `grill-me` ; `grill-with-docs` pour produire ADR et glossaire | |
| Décision qui revient à un humain (équipe, Lead Dev) | `to-questionnaire` | |
| Transformer une discussion en spec ou en tickets | `to-spec`, `to-tickets` | |
| Chantier sur plusieurs sessions | `wayfinder` | |
| Faits à vérifier dans des sources primaires | `research` | |
| Remplacer un `as unknown as Type` dans un test | `migrate-to-shoehorn` | règle « Typage Strict » ci-dessous |
| Relecture avant PR | `code-review` | |
| Conflit de merge ou de rebase | `resolving-merge-conflicts` | |
| Secret scellé ou rotation de credentials | `implement` | `volontariapp-sealed-secrets` |
| Étape que seul un humain peut faire (consoles externes, infra cloud) | `wizard` | |
| Question de conception à trancher par un essai jetable | `prototype` | |
| Message de l'utilisateur mal compris | `wait-what` | |
| Écrire ou modifier une skill, `AGENTS.md`, `CLAUDE.md` | `writing-for-agents` | `volontariapp-skill-evolution` |
| Fin de session ou passage de relais | `handoff` | `volontariapp-skill-evolution` |

`setup-pre-commit` est hors sujet (Husky est déjà en place). `setup-matt-pocock-skills` se lance une fois avant d'utiliser `to-tickets` ou `triage` avec un tracker. Le guide technique détaillé (carte des repos, structure d'un module, DTO, contrôleurs, tests) reste dans `AGENT.md`.

## 2 quater. `meta`, source de vérité unique

Seuls `meta` et `nativapp` portent des fichiers d'agent : ouvrir les sessions depuis `meta`. Chaque sous-repo a un hook pre-commit qui, quand le repo est cloné dans `meta`, lance `evolve.py check-staged` et bloque tant que les skills décrivant les fichiers commités n'ont pas été revérifiées (`SKILL_CHECK_MODE=warn` pour avertir seulement, `SKIP_SKILL_CHECK=1` pour contourner). Après un clone : `./scripts/install-skill-hooks.sh`.

## 2 ter. Boucle d'apprentissage

Les skills `volontariapp-*` sont des bundles OKF v0.2 tenus à jour par `volontariapp-skill-evolution`, qui suit tous les repos clonés sous `meta`. Avant de terminer une tâche qui a modifié du code :

```bash
python3 .agents/skills/volontariapp-skill-evolution/scripts/evolve.py plan
```

Le plan liste exactement quelles skills relire, à cause de quels fichiers (et de quel repo), et quelles commandes lancer (`sync`, `learn`, `new`). Une correction de l'utilisateur devient une leçon (`evolve.py learn`). Claude Code le fait automatiquement (hook `Stop`) ; les autres agents le lancent eux-mêmes.

### Index des skills

<!-- skills-index:start (généré par evolve.py index, ne pas éditer) -->

### Skills du projet (`.agents/skills/volontariapp-*`)

| Skill | Quand l'utiliser |
| :--- | :--- |
| [`volontariapp-api-gateway`](.agents/skills/volontariapp-api-gateway/SKILL.md) | Playbook opérationnel pas-à-pas pour exposer ou modifier une route REST Edge sur api-gateway : DTO Swagger, contrôleur REST, guards, token interne propagé en métadonnée… |
| [`volontariapp-async-remediation`](.agents/skills/volontariapp-async-remediation/SKILL.md) | Playbook opérationnel pas-à-pas pour diagnostiquer, débloquer et réconcilier les pannes asynchrones (Poison pills DLQ, Redis Streams XCLAIM/XACK, réconciliation SQL outb… |
| [`volontariapp-ci-tools`](.agents/skills/volontariapp-ci-tools/SKILL.md) | Modifier la CI partagée (workflows réutilisables GitHub Actions appelés par tous les repos) ou l'infrastructure locale docker-compose de ci-tools (bases, Redis, MinIO, D… |
| [`volontariapp-db-migration`](.agents/skills/volontariapp-db-migration/SKILL.md) | Playbook opérationnel pas-à-pas pour concevoir, tester et propager une migration TypeORM sans coupure de service (Zero-Downtime Expand/Contract, partition common/domain,… |
| [`volontariapp-deploy-gitops`](.agents/skills/volontariapp-deploy-gitops/SKILL.md) | Playbook opérationnel pas-à-pas pour faire évoluer l'infrastructure Kubernetes dans le repo deploy (ArgoCD) : création de manifests durcis PSA Restricted, NetworkPolicie… |
| [`volontariapp-docx-reports`](.agents/skills/volontariapp-docx-reports/SKILL.md) | Inspecter, corriger l'orthographe et éditer les rapports Word (.docx) sous docs/coaching/ en préservant le balisage OpenXML, les styles et la mise en page via script Pyt… |
| [`volontariapp-file-storage-flow`](.agents/skills/volontariapp-file-storage-flow/SKILL.md) | Playbook pour tout travail sur le stockage de fichiers (upload, scan, réservation, rattachement, nettoyage) - ms-storage, worker-storage, post-processor-storage, et ratt… |
| [`volontariapp-grpc-microservice`](.agents/skills/volontariapp-grpc-microservice/SKILL.md) | Playbook opérationnel pas-à-pas pour implémenter ou modifier un RPC dans un microservice gRPC (ms-user, ms-event, ms-post, ms-social) : contrat, DTO, contrôleur CQRS, ga… |
| [`volontariapp-implement-async-event-flow`](.agents/skills/volontariapp-implement-async-event-flow/SKILL.md) | Guide pas-à-pas pour concevoir et implémenter un flux asynchrone complet (messaging -> outbox -> post-processors -> ws-service -> client). |
| [`volontariapp-implement-async-job-flow`](.agents/skills/volontariapp-implement-async-job-flow/SKILL.md) | Guide pas-à-pas pour concevoir, émettre et consommer un Job d'arrière-plan (BullMQ, BaseWorker, IJobHandler, job_audit loop et Fallbacks). |
| [`volontariapp-logger`](.agents/skills/volontariapp-logger/SKILL.md) | Modifier ou utiliser @volontariapp/logger : masquage des données personnelles (clés, motifs, configuration), champs trace_id / dd.trace_id / dd.span_id injectés depuis l… |
| [`volontariapp-mesh-mcp`](.agents/skills/volontariapp-mesh-mcp/SKILL.md) | Instructions sur l'utilisation du serveur MCP local mesh-mcp (causalmesh) pour naviguer et chercher dans les repositories de Volontariapp |
| [`volontariapp-mesh-mcp-verification`](.agents/skills/volontariapp-mesh-mcp-verification/SKILL.md) | Regles pour rapporter une anomalie mesh-mcp (REX, analyse) : gabarit sortie brute / code lu / verdict, fixture minimal avec variantes, separation faits-hypotheses-demand… |
| [`volontariapp-meta-scripts`](.agents/skills/volontariapp-meta-scripts/SKILL.md) | Utiliser et faire evoluer la CLI Node de meta (setup, doctor, migrate, certs, repos, bump) et le manifeste repos.json, source unique des repos et unites du workspace. |
| [`volontariapp-proto-contract-evolution`](.agents/skills/volontariapp-proto-contract-evolution/SKILL.md) | Modifier un contrat Protobuf de proto-registry (champ, message, enum, RPC) sans casser la compatibilité wire, puis suivre la cascade proto-registry, PR automatique dans… |
| [`volontariapp-scaffold-microservice`](.agents/skills/volontariapp-scaffold-microservice/SKILL.md) | Playbook opérationnel pas-à-pas pour créer et raccorder un nouveau domaine/microservice de bout en bout (proto, domain package, ms-*, outbox, worker, post-processor, gat… |
| [`volontariapp-sealed-secrets`](.agents/skills/volontariapp-sealed-secrets/SKILL.md) | Playbook opérationnel pas-à-pas pour générer, sceller et déployer un secret chiffré asymétrique (kubeseal) dans le cluster K3s. |
| [`volontariapp-shared-npm-package-change`](.agents/skills/volontariapp-shared-npm-package-change/SKILL.md) | Modifier un package partagé de npm-packages (messaging, shared, database, domain-*, auth...) et propager la nouvelle version aux consommateurs : rayon d'impact, build, c… |
| [`volontariapp-skill-evolution`](.agents/skills/volontariapp-skill-evolution/SKILL.md) | Boucle d'auto-apprentissage des skills Volontariapp : savoir quelles skills sont désynchronisées du code (tous repos confondus), les mettre à jour, consigner une leçon a… |
| [`volontariapp-trace-async-flow`](.agents/skills/volontariapp-trace-async-flow/SKILL.md) | Diagnostiquer un flux asynchrone qui ne produit pas son effet (job, événement, saga, notification WebSocket) : cartographie avec analyze_impact puis requêtes SQL sur job… |
| [`volontariapp-user-account-deletion`](.agents/skills/volontariapp-user-account-deletion/SKILL.md) | Suppression de compte en deux temps (PENDING_DELETION): requestDeletionWithUserDeleted, finalizeDeletion, fan-out de user.deleted vers les domaines et gather ws. |

### Skills du plugin matt-pocock

| Skill | Quand l'utiliser |
| :--- | :--- |
| [`ask-matt`](.agents/skills/ask-matt/SKILL.md) | Ask which skill or flow fits your situation. |
| [`code-review`](.agents/skills/code-review/SKILL.md) | Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards (does the code follow this repo's documented coding standards?) and… |
| [`codebase-design`](.agents/skills/codebase-design/SKILL.md) | Shared vocabulary for designing deep modules. |
| [`diagnosing-bugs`](.agents/skills/diagnosing-bugs/SKILL.md) | Diagnosis loop for hard bugs and performance regressions. |
| [`domain-modeling`](.agents/skills/domain-modeling/SKILL.md) | Build and sharpen a project's domain model. |
| [`git-guardrails-claude-code`](.agents/skills/git-guardrails-claude-code/SKILL.md) | Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. |
| [`grill-me`](.agents/skills/grill-me/SKILL.md) | A relentless interview to sharpen a plan or design. |
| [`grill-with-docs`](.agents/skills/grill-with-docs/SKILL.md) | A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go. |
| [`grilling`](.agents/skills/grilling/SKILL.md) | Grill the user relentlessly about a plan, decision, or idea. |
| [`handoff`](.agents/skills/handoff/SKILL.md) | Compact the current conversation into a handoff document for another agent to pick up. |
| [`implement`](.agents/skills/implement/SKILL.md) | Implement a piece of work based on a spec or set of tickets. |
| [`improve-codebase-architecture`](.agents/skills/improve-codebase-architecture/SKILL.md) | Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick. |
| [`migrate-to-shoehorn`](.agents/skills/migrate-to-shoehorn/SKILL.md) | Migrate test files from `as` type assertions to @total-typescript/shoehorn. |
| [`prototype`](.agents/skills/prototype/SKILL.md) | Build a throwaway prototype to answer a design question. |
| [`research`](.agents/skills/research/SKILL.md) | Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. |
| [`resolving-merge-conflicts`](.agents/skills/resolving-merge-conflicts/SKILL.md) | Use when you need to resolve an in-progress git merge/rebase conflict. |
| [`setup-matt-pocock-skills`](.agents/skills/setup-matt-pocock-skills/SKILL.md) | Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. |
| [`setup-pre-commit`](.agents/skills/setup-pre-commit/SKILL.md) | Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. |
| [`tdd`](.agents/skills/tdd/SKILL.md) | Test-driven development. |
| [`teach`](.agents/skills/teach/SKILL.md) | Teach the user a new skill or concept, within this workspace. |
| [`to-questionnaire`](.agents/skills/to-questionnaire/SKILL.md) | Turn a decision you can't fully answer into a questionnaire for someone else to fill in. |
| [`to-spec`](.agents/skills/to-spec/SKILL.md) | Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed. |
| [`to-tickets`](.agents/skills/to-tickets/SKILL.md) | Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as tex… |
| [`triage`](.agents/skills/triage/SKILL.md) | Move issues and external PRs through a state machine of triage roles, categorise, verify, grill if needed, and write agent-ready briefs. |
| [`wait-what`](.agents/skills/wait-what/SKILL.md) | Stop. |
| [`wayfinder`](.agents/skills/wayfinder/SKILL.md) | Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way… |
| [`wizard`](.agents/skills/wizard/SKILL.md) | Generate an interactive bash wizard that walks a human through steps only they can perform. |
| [`writing-for-agents`](.agents/skills/writing-for-agents/SKILL.md) | Writing documents for agents. |

<!-- skills-index:end -->

## 2 quinquies. Questions d'architecture : règles de raisonnement

S'applique à toute question sur le workspace multi-repos (qui appelle, qui produit, qui consomme, que se passe-t-il quand...). Les hooks `mesh-first-reminder.sh` (rappel court) et `absence-claims-guard.py` (relecture de fin de réponse) appliquent ces règles.

- **R1. Absence = affirmation la plus risquée.** « Jamais appelé », « aucun producteur », « personne ne consomme » exigent : (a) l'outil dont la couverture correspond à la question, (b) une requête sur TOUTES les racines du workspace, jamais une liste de repos choisie à la main, (c) la couverture citée dans la réponse (« vérifié dans les 16 racines avec `analyze_grpc` »). Sinon écrire « non trouvé dans `<périmètre>` », jamais « n'existe pas ».
- **R2. L'outil suit la question, pas l'habitude.** Suivre la matrice de la section 2. `mesh-mcp` d'abord ; `rg` sert à vérifier une ligne déjà désignée par l'outil ou un identifiant exact dans un repo. Tout `rg` posé sur une question de graphe est justifié dans la réponse.
- **R3. « 0 producteur » + un consommateur présent ne prouve pas l'absence de producteur.** Le stream ou le type d'événement peut être résolu à l'exécution (registre, config, gather, template string), ou le producteur vit dans une racine non indexée. Chercher les émetteurs non littéraux (`publish`/`emit`/`add`/`xadd` avec argument non littéral, fonctions `getXxxConfig`), lire le code, puis conclure. Une chaîne qui « s'arrête » à un consommateur n'est pas terminée : vérifier ce que ce consommateur publie ensuite.
- **R4. Une profondeur atteinte n'est pas une fin de chaîne.** Si `analyze_impact` s'arrête à `depth` N, relancer à N+1 ou suivre le dernier nœud.
- **R5. Trois niveaux dans chaque réponse.** FAIT (sortie d'outil ou ligne lue ce tour-ci, avec `fichier:ligne`), INFÉRENCE (marquée « inférence, non vérifiée »), HYPOTHÈSE sur le fonctionnement interne de `mesh-mcp` (jamais présentée comme un fait avant d'avoir lu son code ou lancé une requête qui la teste). « Je l'ai lu dans le code » ne s'écrit que pour un fichier ouvert ce tour-ci.
- **R6. Avant « X n'est appelé nulle part », trois vérifications** : client gRPC (`analyze_grpc`), événement (`analyze_impact`), post-processor ou worker d'un repo auquel on n'a pas pensé (`post-processors-runner`, `workers-runners`, `ws-service`, `nativapp`). Une seule manquante : la réponse est « non déterminé », pas « jamais ».
- **R7. « T'es sûr ? » signale une couverture partielle.** Refaire la vérification sur le périmètre complet avec l'outil adapté avant de répondre, et corriger explicitement ce qui avait été affirmé.
- **R8. « Fait vérifié » ne qualifie qu'une sortie d'outil ou une ligne lue ce tour-ci.** Une absence s'écrit « non trouvé dans `<périmètre>` », périmètre dans la même phrase. Pour « qui appelle X », interroger `analyze_impact` sur l'événement déclencheur : `find_dependents` n'a trouvé aucun appelant de `finalizeDeletion`, appelé pourtant depuis `post-processors-runner` (appel de méthode d'instance).
- **Relecture de fin de réponse.** Pour chaque phrase d'absence (« aucun », « jamais », « nulle part », « n'est pas appelé »), indiquer l'outil, le périmètre et ce qui n'a pas été vérifié.

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

---

## 7. Règle d'or Discord Webhook pour les Pull Requests (1 PR = 1 Message)

> [!IMPORTANT]
> **OBJECTIF STRICT : 1 PR = 1 SEUL MESSAGE DISCORD (ZÉRO SPAM, ZÉRO NOTIFICATION PRÉMATURÉE).**
>
> Il est formellement interdit d'envoyer un webhook Discord dès l'ouverture d'une PR si les vérifications ne sont pas achevées.
> L'agent DOIT obligatoirement vérifier activement les deux conditions suivantes avant tout envoi de webhook :
> 1. **Absence totale de conflits de merge** (`mergeable === true` contre la branche cible `main`).
> 2. **CI GitHub Actions passée avec succès** (tous les checks obligatoires sont validés / `success`).
>
> Tant que la CI tourne ou que des conflits existent, **aucun webhook ne doit être émis**. C'est seulement une fois la PR 100% prête et verte qu'une notification unique est déclenchée.

