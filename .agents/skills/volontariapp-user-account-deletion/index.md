# User Account Deletion

Suppression de compte en deux temps (PENDING_DELETION): requestDeletionWithUserDeleted, finalizeDeletion, fan-out de user.deleted vers les domaines et gather ws. A utiliser pour tout changement de domain-user touchant la suppression, le statut ou le cycle de vie d'un user.

## Concepts

- [SKILL.md](/volontariapp-user-account-deletion/SKILL.md) - point d'entrée de la skill
- [Leçons apprises](/volontariapp-user-account-deletion/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-user-account-deletion, du plus récent au plus ancien.

Historique : [log.md](/volontariapp-user-account-deletion/log.md)
