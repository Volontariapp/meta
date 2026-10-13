# Historique

## 2026-10-13

- **Vérification** - Relu apres capture du traceparent et migration job_audit trigger (ms-user 6c360de): aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Ajout migration commune 1792000000000 sécurisant le trigger notify_job_audit_status_change avec UUID valide ou généré (claude-code/agent)
- **Vérification** - Ajout de la copie packages/workers/src/test/migrations aux copies de migrations communes a maintenir (hors sync-migrations.sh) (claude-code/agent)
- **Vérification** - Migration commune: copie manuelle dans les 5 ms-* (sync-migrations.sh ne propage pas entre services, ms-storage a un common/), derive des domain-*/test/migrations, ordre STOP ms-* puis npm-packages. Exemple: traceparent varchar(55) (claude-code/agent)

## 2026-10-12

- **Vérification** - Création du playbook de migration DB et sync-migrations (claude-code/agent)
- **Création** - squelette OKF généré par evolve.py new (claude-code/agent)
- **Leçon** - Création de la skill (decision) (claude-code/agent)
