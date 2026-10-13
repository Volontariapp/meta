---
name: volontariapp-db-migration
description: "Playbook opérationnel pas-à-pas pour concevoir, tester et propager une migration TypeORM sans coupure de service (Zero-Downtime Expand/Contract, partition common/domain, sync-migrations.sh)."
type: Playbook
title: Migrations PostgreSQL et Synchronisation Multi-Services
tags: [db-migration, postgresql, typeorm, zero-downtime, expand-contract, playbook]
status: stable
paths:
  - "ms-*/src/migrations/**"
  - "npm-packages/packages/database/src/**"
  - sync-migrations.sh
mesh_keys:
  - migrations
  - sync-migrations
  - typeorm
generated:
  by: claude-code/agent
  at: "2026-10-12T11:56:30Z"
verified:
  - by: claude-code/agent
    at: "2026-10-12T12:03:24Z"
    digest: 2f21cfc259aa7216
  - by: claude-code/agent
    at: "2026-10-13T11:38:31Z"
    digest: 875cacf93d1db1e9
  - by: claude-code/agent
    at: "2026-10-13T13:50:20Z"
    digest: 875cacf93d1db1e9
  - by: claude-code/agent
    at: "2026-10-13T16:25:34Z"
    digest: 3ab9f594f6029d1e
  - by: claude-code/agent
    at: "2026-10-13T16:50:11Z"
    digest: 2d34ce36c99cc07d
sources:
  - id: sync-mig
    kind: local_file
    resource: sync-migrations.sh
    title: sync-migrations.sh
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

Utiliser ce playbook pour toute évolution de schéma relationnel PostgreSQL dans un microservice (`ms-user`, `ms-post`, `ms-event`, `ms-social`, `ms-storage`) :
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
  - Doit être créée dans un microservice de référence (ex. `ms-user`), puis **copiée à l'identique** (même nom, même contenu, vérifier le md5) dans `src/migrations/common/` des 5 services : `ms-user`, `ms-social`, `ms-post`, `ms-event`, `ms-storage`. `sync-migrations.sh` ne fait PAS cette propagation inter-services[^sync-mig].
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

---

### Étape 4 : Propager les migrations avec `sync-migrations.sh` (si applicable)

Pour toute modification dans `src/migrations/` (commune ou domaine pour les tests) :
1. Lancer le script de synchronisation à la racine de `meta`[^sync-mig] :
   ```bash
   ./sync-migrations.sh
   ```
2. Sélectionner les microservices concernés (`ms-user`, `ms-social`, `ms-post`, `ms-event`).
   *(Note : `ms-storage` a bien un dossier `common/` mais n'est pas dans la liste `SERVICES` du script ; son dossier `domain-storage/src/test/migrations` existe, à synchroniser à la main.)*
3. Le script synchronise par `rsync -avc --delete` les fichiers vers `npm-packages/packages/domain-<service>/src/test/migrations` (copie `ms-*` vers `domain-*`, jamais entre services) afin de garantir que les tests du domaine s'exécutent sur un schéma strictement identique.
4. **Piège : dérive.** Ces dossiers `test/migrations` ne sont pas à jour (au 2026-10-13 : migrations absentes ou renommées, `--delete` supprimerait des fichiers dans `domain-post`, `domain-event`, `domain-storage`). Vérifier avec `rsync -avcn --delete <src>/ <dest>/` avant. Pour une migration commune isolée, copier uniquement le nouveau fichier plutôt que de resynchroniser le dossier entier.
5. **Copie `workers`** : `npm-packages/packages/workers/src/test/migrations/` contient aussi les migrations communes (outbox, `job_audit`, triggers), hors de `sync-migrations.sh`. Y ajouter toute nouvelle migration commune, sinon les tests de `workers` tournent sur un schéma obsolète (la PR traceparent l'a réalignée le 2026-10-13).
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
- [ ] Si une migration commune a été touchée, `./sync-migrations.sh` a été exécuté[^sync-mig].
- [ ] Le cycle `migration:run` $\rightarrow$ `migration:revert` $\rightarrow$ `migration:run` s'exécute sans erreur sur la base locale[^compose].
- [ ] `yarn test` passe avec succès sur le microservice.

---

## Références

[^sync-mig]: sync-migrations.sh
[^compose]: ci-tools/docker-compose.yml
[^data-source]: ms-user/src/config/data-source.ts
