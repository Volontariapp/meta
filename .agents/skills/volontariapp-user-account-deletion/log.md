# Historique

## 2026-10-30

- **Vérification** - Vérification ImpactScoreCreditModel (claude-code/agent)

## 2026-10-23

- **Vérification** - targetServices de user.deleted: ajout de USER_DELETED_RANKING; impact_score_credits inchange (CASCADE) (claude-code/agent)

## 2026-10-17

- **Vérification** - ImpactScoreCreditModel (impact_score_credits) supprime en cascade avec le user (claude-code/agent)

## 2026-10-16

- **Vérification** - Revue domain-user (avatar_file_id, updateAvatar) : sans effet sur le flux PENDING_DELETION ; log antigravity corrige en process:antigravity (claude-code/sonnet-5-5)

## 2026-10-14

- **Vérification** - Add avatar_file_id and remove deprecated logoPath (agent:antigravity)

## 2026-10-13

- **Vérification** - Propagation migration commune 1792000000000 (claude-code/agent)
- **Vérification** - Relu apres ajout de la migration commune AddTraceparent et de la colonne traceparent sur OutboxModel: aucune regle ni commande de la skill ne change (claude-code/agent)
- **Vérification** - SKILL.md relue: regles toujours exactes, source de la lecon corrigee (claude-code/agent)
- **Leçon** - finalizeDeletion est appele depuis post-processors-runner, pas ms-user/ws-service (pitfall) (claude-code/agent)

## 2026-10-12

- **Vérification** - Retypage OKF: type Domain Reference (claude-code/agent)

## 2026-10-11

- **Vérification** - mesh_keys sans doublon de casse (claude-code/agent)
- **Vérification** - Enregistrement automatique de la skill volontariapp-user-account-deletion (index AGENTS.md, mesh-mcp.toml), mesh_keys declares (claude-code/agent)
- **Vérification** - Mapping EventQueue enregistre dans registerUserMappings (claude-code/agent)
- **Leçon** - Mapping EventQueue obligatoire dans registerUserMappings (pitfall) (claude-code/agent)
- **Vérification** - Resync apres lint-staged, phase 1 suppression de compte (claude-code/agent)
- **Vérification** - Premiere version: regles de la suppression en deux temps (claude-code/agent)
- **Création** - squelette OKF généré par evolve.py new (claude-code/agent)
- **Leçon** - Création de la skill (decision) (claude-code/agent)
