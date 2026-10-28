---
name: volontariapp-db-migration
description: "Playbook opérationnel pas-à-pas pour concevoir, tester et propager une migration TypeORM sans coupure de service (Zero-Downtime Expand/Contract, partition common/domain, yarn meta sync-migrations)."
type: Playbook
title: Migrations PostgreSQL et Synchronisation Multi-Services
tags: [db-migration, postgresql, typeorm, zero-downtime, expand-contract, playbook]
status: stable
paths:
  - "ms-*/src/migrations/**"
  - "npm-packages/packages/database/src/**"
  - scripts/cli/commands/sync-migrations.mjs
mesh_keys:
  - migrations
  - sync-migrations
  - typeorm
generated:
  by: claude-code/agent
  at: "2026-10-12T11:56:30Z"
verified:
  - by: "human:victor"
    at: "2026-10-19T08:21:45Z"
    digest: dbd687978078cac2
  - by: claude-code/agent
    at: "2026-10-19T09:19:15Z"
    digest: 4500b5b797e29edc
  - by: claude-code/agent
    at: "2026-10-19T10:15:04Z"
    digest: d519f37d67d4f55c
  - by: claude-code/claude-sonnet-5-5
    at: "2026-10-28T20:25:05Z"
    digest: 7aa8ef72e09461e5
  - by: claude-code/agent
    at: "2026-10-28T22:51:01Z"
    digest: e6846197c94a5bd8
sources:
  - id: sync-mig
    kind: local_file
    resource: scripts/cli/commands/sync-migrations.mjs
    title: sync-migrations.mjs
  - id: compose
    kind: local_file
    resource: ci-tools/docker-compose.yml
    title: ci-tools/docker-compose.yml
  - id: data-source
    kind: local_file
    resource: ms-user/src/config/data-source.ts
    title: ms-user/src/config/data-source.ts
---

# Migrations PostgreSQL et Synchronisation Multi-Services

## Quand utiliser ce playbook

Utiliser ce playbook pour toute évolution de schéma relationnel PostgreSQL dans un microservice (`ms-user`, `ms-post`, `ms-event`, `ms-social`, `ms-storage`, `ms-ranking`) :
- Ajout, renommage ou modification d'une table, colonne ou index métier.
- Évolution des tables transactionnelles partagées (`jobs_outbox`, `event_queue`, `job_audit`).
- Modification des triggers SQL de notification outbox.
- Synchronisation des migrations vers les packages de test de domaine (`npm-packages/packages/domain-*`).

---

## Règles d'or de conception

1. **Zero-Downtime obligatoire (Pattern Expand / Contract)** :
   - Tout ajout de colonne non-nulle doit d'abord être déployé avec une valeur par défaut (`DEFAULT 'value'`) ou être nullable (`NULL`).
   - Interdiction formelle de renommer ou supprimer (`DROP COLUMN`) une colonne active dans la même release : le code existant doit d'abord cesser de la lire/écrire (Phase Contract ultérieure).
2. **Bidirectionnalité stricte** :
   - Chaque méthode `up()` DOIT avoir son pendant inverse exact et idempotente dans `down()`.
3. **Isolation stricte par service** :
   - Chaque microservice dispose de sa base PostgreSQL dédiée (ports 5432-5436 en local)[^compose]. Aucune jointure inter-bases n'est permise.
4. **Partitionnement rigoureux `common/` vs `domain/`** :
   - `src/migrations/common/` : Infrastructure technique partagée (Outbox, Audit, Triggers).
   - `src/migrations/domain/` : Schémas et tables purement métier propres au microservice.

---

## Procédure pas-à-pas

### Étape 1 : Déterminer la portée de la migration

Identifier le répertoire cible dans le microservice :
- **Migration Commune** (`ms-*/src/migrations/common/`) :
  - Concerne l'Outbox transactionnelle (`jobs_outbox`, `event_queue`, `job_audit`)[^data-source] ou un trigger SQL de dispatch.
  - Doit être créée dans un microservice de référence (ex. `ms-user`), puis **copiée à l'identique** (même nom, même contenu, vérifier le md5) dans `src/migrations/common/` de chaque service qui a **sa propre base** : `ms-user`, `ms-social`, `ms-post`, `ms-event`, `ms-storage`, `ms-ranking` **et `ws-service`** (base `ms_ws`, oublié lors de la tâche 2.9 : une colonne ajoutée à `OutboxModel` fait échouer ses écritures tant que la migration manque). `post-processors-runner/post-processor-event` et `workers-runners/worker-event` gardent aussi une copie et utilisent en production la base `ms_event` de `ms-event` (migration déjà appliquée), **mais leur CI reconstruit une base neuve depuis leurs propres migrations** (`global-setup` de `worker-event` : drop du schéma puis `runMigrations`) : sans la copie, `column EventQueueModel.traceparent does not exist` (constaté sur workers-runners#16). Copier aussi la nouvelle migration commune dans ces deux dossiers. Pour reproduire la CI en local sans toucher à sa base : `DB_NAME=<base jetable> yarn test:integration`. `yarn meta sync-migrations` ne fait PAS cette propagation inter-services[^sync-mig]. Pour repérer les copies : chercher le nom d'une migration commune existante (`1781000000000-AddCorrelationIdToEventQueue.ts`) sur tout le workspace, hors `deploy/`. Ces trois dossiers ont dérivé (migrations plus anciennes que celles de `ms-*`) : ne copier que la nouvelle migration.
- **Migration Domaine** (`ms-*/src/migrations/domain/`) :
  - Concerne les tables propres au métier (ex. `users`, `badges` dans `ms-user` ; `posts` dans `ms-post`).
  - Reste cantonnée au répertoire `domain/` du microservice concerné.

---

### Étape 2 : Écrire la migration TypeORM

Créer un fichier nommé avec le timestamp Unix actuel sous la forme `<timestamp>-<NomExplicite>.ts` :

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeatureColumn1792000000000 implements MigrationInterface {
  name = 'AddFeatureColumn1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pattern Expand : colonne avec DEFAULT pour ne pas bloquer les écritures en prod
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "feature_flag" boolean NOT NULL DEFAULT false`,
    );
    // Indexation concurrente recommandée pour éviter le verrouillage de table
    await queryRunner.query(
      `CREATE INDEX "idx_users_feature_flag" ON "users" ("feature_flag")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_users_feature_flag"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "feature_flag"`);
  }
}
```

---

### Étape 3 : Déclarer les entités et vérifier `data-source.ts`

1. Si la migration introduit une nouvelle entité ou un nouveau champ, mettre à jour l'entité TypeORM correspondante dans le package de domaine (`@volontariapp/domain-*`) ou `@volontariapp/database`.
2. Vérifier que `src/config/data-source.ts` référence bien l'entité dans son tableau `entities`[^data-source] :

```typescript
// ms-user/src/config/data-source.ts
export const AppDataSource = new DataSource({
  type: 'postgres',
  /* ... */
  entities: [
    EventQueueModel,
    JobsOutboxModel,
    JobAuditModel,
    UserModel,
    NewFeatureModel, // <- Entité déclarée
  ],
  synchronize: false,
  migrations: [
    join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', '**', '*.{ts,js}'),
  ],
});
```

3. Si un `post-processor-*` ou un `worker-*` lit ou écrit la nouvelle table via le `DataSource` de la base de `ms-<d>` (ex. `post-processor-user` sur `ms_user`), ajouter aussi l'entité à la liste `entities` de son `infrastructure.module.ts` : sans cela, TypeORM lève « No metadata for X was found » au premier traitement, et les tests unitaires qui mockent le `DataSource` ne le voient pas. Exemple : `impact_score_credits` (`ImpactScoreCreditModel`, migration `1792100000000-CreateImpactScoreCredits` dans `ms-user`).
4. **Monter `domain-<d>` dans un `worker-*` casse sa CI si ses copies de migrations ont dérivé.** Seuls les packages qui ont un `global-setup` de test d'intégration (`worker-event`) rebuild une base neuve depuis `src/migrations/` : le `domain-<d>` récent y mappe des colonnes que la copie n'a pas. Un package sans `global-setup` n'est pas concerné : `post-processor-event` avait pourtant la même dérive (2 migrations de domaine et 4 communes en retard sur `ms-event`) mais n'exécute jamais ses migrations (aucun `migrationsRun` ni `runMigrations` dans `src`, 3 tests unitaires avec `DataSource` mocké). On l'a résorbée par hygiène, sans effet sur la CI. Avant d'affirmer qu'une dérive casse quelque chose, chercher ce qui exécute réellement les migrations du package. Constaté sur `workers-runners#19` : `domain-event@3.12.1` mappe `cover_file_id`, absente de `worker-event` → `column "cover_file_id" of relation "events" does not exist`, 24 tests rouges. Correctif : copier la migration manquante à l'identique (`diff <(ls ms-event/src/migrations/domain) <(ls worker-event/src/migrations/domain)`, puis `md5`). Reproduire en local sans toucher aux données : `global-setup` fait `DROP SCHEMA public CASCADE` sur `DB_NAME`, dont la valeur par défaut est `ms_event`. Créer une base jetable (`CREATE DATABASE worker_event_ci_check`) et lancer `DB_NAME=worker_event_ci_check REDIS_PORT=<port> yarn test:integration` avec un Redis jetable (`docker run redis:7-alpine redis-server --requirepass password`) : `REDIS_DB_INDEX` ne suffit pas, les jobs BullMQ ne sont alors jamais traités (`handlerSpy` appelé 0 fois).

---

### Étape 4 : Propager les migrations avec `yarn meta sync-migrations` (si applicable)

Pour toute modification dans `src/migrations/` (commune ou domaine pour les tests) :
1. Lancer la commande à la racine de `meta`[^sync-mig] (toujours non interactive) :
   ```bash
   yarn meta sync-migrations --dry-run                    # Prévisualiser (+ ajouté, ~ modifié, - supprimé), sans rien écrire
   yarn meta sync-migrations                              # Tout synchroniser
   yarn meta sync-migrations --packages storage,user      # Microservices précis (avec ou sans préfixe ms-)
   yarn meta sync-migrations --pr                         # Branche, changeset, build, test, PR dans npm-packages, puis arrêt (règle STOP)
   ```
2. Microservices gérés : tous les `ms-*` de `repos.json` avec `migrations: true` et un package `domain-*` présent (`user`, `social`, `post`, `event`, `storage`, `ranking`). Pour `ranking` (état vérifié le 2026-10-28 avant la CLI) : son dossier `domain-ranking/src/test/migrations/domain/` contient pour l'instant la migration `CreateRankingTables` écrite à la main, copiée à l'identique dans `ms-ranking/src/migrations/domain/` (vérifié le 2026-10-28 : fichiers identiques, 10 tables `ranking_*` : `ranking_score`, `ranking_post_score`, `ranking_run`, `ranking_request`, `ranking_like_log`, `ranking_event_feedback`, `ranking_event_wish`, `ranking_event_mention`, `ranking_user_location`, `ranking_rate_bucket`). Les 16 migrations communes de `ms-ranking` sont identiques à celles de `ms-user`.
3. La commande synchronise par un miroir équivalent à `rsync -ac --delete` (comparaison par contenu) les fichiers vers `npm-packages/packages/domain-<service>/src/test/migrations` (copie `ms-*` vers `domain-*`, jamais entre services) afin de garantir que les tests du domaine s'exécutent sur un schéma strictement identique.
4. **Piège : dérive.** Ces dossiers `test/migrations` ne sont pas à jour (au 2026-10-13 : migrations absentes ou renommées, `--delete` supprimerait des fichiers dans `domain-post`, `domain-event`, `domain-storage`). Vérifier avec `yarn meta sync-migrations --dry-run` avant. Pour une migration commune isolée, copier uniquement le nouveau fichier plutôt que de resynchroniser le dossier entier.
5. **Copie `workers`** : `npm-packages/packages/workers/src/test/migrations/` contient aussi les migrations communes (outbox, `job_audit`, triggers), hors de `yarn meta sync-migrations`. Y ajouter toute nouvelle migration commune, sinon les tests de `workers` tournent sur un schéma obsolète (la PR traceparent l'a réalignée le 2026-10-13).
6. **STOP rule** : `domain-*/src/test/migrations` et `database` sont sous `npm-packages`. Faire d'abord toutes les éditions `ms-*`, puis `npm-packages` en dernier : le hook `stop-rule-guard.sh` refuse les éditions `ms-*` après la première édition `npm-packages`.

---

### Étape 5 : Exécution et validation locale

1. Démarrer l'infrastructure locale PostgreSQL via Docker Compose[^compose] :
   ```bash
   docker compose -f ci-tools/docker-compose.yml up -d postgres-user
   ```
2. Exécuter la migration en environnement local :
   ```bash
   cd ms-user
   NODE_ENV=local yarn typeorm migration:run -d src/config/data-source.ts
   ```
3. Valider impérativement le rollback (`down`) :
   ```bash
   NODE_ENV=local yarn typeorm migration:revert -d src/config/data-source.ts
   ```
4. Réappliquer la migration :
   ```bash
   NODE_ENV=local yarn typeorm migration:run -d src/config/data-source.ts
   ```
5. Lancer la suite de tests du microservice :
   ```bash
   yarn test
   ```

---

## Checklist de validation

- [ ] La migration applique le pattern **Expand / Contract** (aucun `DROP COLUMN` ni renommage brutal direct).
- [ ] La méthode `down()` est strictement l'inverse de la méthode `up()`.
- [ ] Les nouvelles entités sont exportées et enregistrées dans `entities` de `src/config/data-source.ts`[^data-source].
- [ ] Si une migration commune a été touchée, `yarn meta sync-migrations` a été exécuté[^sync-mig].
- [ ] Le cycle `migration:run` $\rightarrow$ `migration:revert` $\rightarrow$ `migration:run` s'exécute sans erreur sur la base locale[^compose].
- [ ] `yarn test` passe avec succès sur le microservice.

---

## Références

[^sync-mig]: scripts/cli/commands/sync-migrations.mjs
[^compose]: ci-tools/docker-compose.yml
[^data-source]: ms-user/src/config/data-source.ts
