# Historique

## 2026-10-07

- **Leçon** - Les DTO de mise a jour heritent des champs de creation (rule) (claude-code/agent)
- **Vérification** - Relu : factory e2e badge envoie idempotencyKey, DTO de mise a jour event et post n'heritent plus de idempotencyKey, coverFileId ni fileIds (updateMask), aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : scripts/seed/events.seeder.ts envoie idempotencyKey (contrat REST), aucune regle modifiee (claude-code/agent)
- **Leçon** - Le contrat REST impose idempotencyKey au client (rule) (claude-code/agent)
- **Vérification** - Relu : les DTO REST de api-gateway suivent les contrats storage (idempotencyKey obligatoire sur CreateEvent/CreatePost/CreateBadge, fileIds sur CreatePost, coverFileId/iconFileId optionnels, coverStatus sur EventResponseDTO). Le contrat REST impose idempotencyKey cote client. (claude-code/agent)

## 2026-10-06

- **Vérification** - contenu des CLAUDE.md des repos rapatrié (fiches par service, carte des routes), sources repointées vers le code (claude-code/claude-opus-5-5)
- **Vérification** - création depuis les CLAUDE.md des repos, vérifiée contre le code (2026-10-06) (claude-code/claude-opus-5-5)
- **Création** - squelette OKF généré par evolve.py new (claude-code/claude-opus-5-5)
- **Leçon** - Création de la skill (decision) (claude-code/claude-opus-5-5)
