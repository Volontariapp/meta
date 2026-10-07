# Historique

## 2026-10-07

- **Leçon** - yarn build (nest build) ne compile pas les specs : verifier avec tsc (rule) (claude-code/agent)
- **Leçon** - Bump consommateurs : pre-push, watchman, ordre des commits (rule) (claude-code/agent)
- **Leçon** - Le verrou STOP survit a la publication dans la meme session (rule) (claude-code/agent)
- **Leçon** - Bump logger : contracts* tire les protos en cours (rule) (claude-code/agent)
- **Leçon** - Bump changeset en cascade et lint hors workspace (rule) (claude-code/agent)
- **Vérification** - paths elargis aux package.json, CHANGELOG.md et yarn.lock des packages (bumps changesets en cascade sur les dependants internes) (claude-code/agent)

## 2026-10-06

- **Vérification** - ajout de la regle sur le CHANGELOG des versions publiees (claude-code/claude-sonnet-5-5)
- **Leçon** - Ne jamais reecrire l'entree CHANGELOG d'une version deja publiee (rule) (claude-code/agent)
- **Vérification** - ajout des lecons : typeorm duplique par peers, branches empilees (claude-code/claude-sonnet-5-5)
- **Leçon** - Avant de pousser une branche empilee, verifier l'etat de la PR de base (rule) (claude-code/agent)
- **Leçon** - typeorm est duplique par jeu de peers : types incompatibles entre un domaine et database/outbox (rule) (claude-code/agent)
- **Vérification** - ajout de la regle changeset version / GITHUB_TOKEN (claude-code/claude-sonnet-5-5)
- **Leçon** - yarn changeset version exige GITHUB_TOKEN et le changeset deja pousse (rule) (claude-code/agent)
- **Vérification** - nettoyage de lessons.md apres ajout de la regle de merge (claude-code/claude-sonnet-5-5)
- **Vérification** - ajout de la regle de merge (revue obligatoire, --auto) (claude-code/claude-sonnet-5-5)
- **Leçon** - Merge d'une PR de npm-packages : revue obligatoire, utiliser --auto (rule) (claude-code/agent)
- **Vérification** - retrait de la lecon sur le bump des dependances internes (demande annulee par l'utilisateur) (claude-code/claude-sonnet-5-5)
- **Vérification** - regle ajoutee : bump patch des dependances internes workspace:* d'un package modifie (claude-code/claude-sonnet-5-5)
- **Leçon** - Bump patch des dependances internes workspace:* d'un package modifie (rule) (claude-code/agent)
- **Vérification** - contenu des CLAUDE.md des repos rapatrié (fiches par service, carte des routes), sources repointées vers le code (claude-code/claude-opus-5-5)
- **Vérification** - CI réelle (snapshot -snap-sha, changeset version, release), catalogue des packages et écarts README, consumers.py (claude-code/claude-opus-5-5)
- **Vérification** - migration au format OKF v0.2 (setup agentique repris d'Aureum, multi-repo) (claude-code/claude-opus-5-5)
