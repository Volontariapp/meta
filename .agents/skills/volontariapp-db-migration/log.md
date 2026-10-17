# Historique

## 2026-10-17

- **Vérification** - Etape 3: entite a declarer aussi dans l'infrastructure.module des post-processors/workers qui lisent la table; exemple impact_score_credits (claude-code/agent)

## 2026-10-16

- **Vérification** - verification rattachement avatar migration 1791500000000-AddUserAvatarFileId.ts (claude-code/agent)
- **Vérification** - Revue des migrations ms-event (cover_file_id/cover_status) et ms-post (post_media, media_status) : migrations de domaine additives, regles de la skill inchangees (claude-code/sonnet-5-5)

## 2026-10-14

- **Vérification** - ms-post: add migration 1781000000000-AddPostMediaAndMediaStatus.ts (claude-code/agent)
- **Vérification** - Verify database repository and outbox runner traces (claude-code/agent)

## 2026-10-13

- **Vérification** - Correction: la copie de la migration commune dans worker-event et post-processor-event est necessaire (CI = base neuve reconstruite depuis leurs migrations) (claude-code/agent)
- **Vérification** - Tache 2.11: restauration du contexte de trace (BaseWorker, SinglePostProcessor, BatchPostProcessor) via runInTraceContext / runBatchInTraceContext de database (claude-code/agent)
- **Vérification** - Correction: seul ws-service a une base propre a migrer; post-processor-event et worker-event partagent ms_event avec ms-event (claude-code/agent)
- **Vérification** - Migration commune a copier aussi dans ws-service, post-processor-event et worker-event (8 dossiers); gather: traceparent stocke puis rejoue via createFollowUp (claude-code/agent)
- **Vérification** - GatherStateMetadata.traceparent devient requis (lignes anterieures sans le champ: normalizeTraceparent) (claude-code/agent)
- **Vérification** - GatherStateMetadata.traceparent (jsonb, sans migration) rejoue sur l'evenement de completion du gather (claude-code/agent)
- **Vérification** - Relu apres traceparent requis sur RedisEventMessage et createFollowUp: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Relu apres capture du traceparent et migration job_audit trigger (ms-user 6c360de): aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Ajout migration commune 1792000000000 sécurisant le trigger notify_job_audit_status_change avec UUID valide ou généré (claude-code/agent)
- **Vérification** - Ajout de la copie packages/workers/src/test/migrations aux copies de migrations communes a maintenir (hors sync-migrations.sh) (claude-code/agent)
- **Vérification** - Migration commune: copie manuelle dans les 5 ms-* (sync-migrations.sh ne propage pas entre services, ms-storage a un common/), derive des domain-*/test/migrations, ordre STOP ms-* puis npm-packages. Exemple: traceparent varchar(55) (claude-code/agent)

## 2026-10-12

- **Vérification** - Création du playbook de migration DB et sync-migrations (claude-code/agent)
- **Création** - squelette OKF généré par evolve.py new (claude-code/agent)
- **Leçon** - Création de la skill (decision) (claude-code/agent)
