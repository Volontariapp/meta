# Migrations PostgreSQL et Synchronisation Multi-Services

Playbook opérationnel pas-à-pas pour concevoir, tester et propager une migration TypeORM sans coupure de service (Zero-Downtime Expand/Contract, partition common/domain, yarn meta sync-migrations).

## Concepts

- [SKILL.md](/volontariapp-db-migration/SKILL.md) - point d'entrée de la skill
- [Leçons apprises](/volontariapp-db-migration/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-db-migration, du plus récent au plus ancien.

## Scripts

- [`push-common-migration.sh`](/volontariapp-db-migration/scripts/push-common-migration.sh) - Copie une migration COMMUNE (outbox, job_audit, triggers) dans tous les depots qui ont leur propre

Historique : [log.md](/volontariapp-db-migration/log.md)
