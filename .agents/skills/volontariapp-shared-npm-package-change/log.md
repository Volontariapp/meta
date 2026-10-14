# Historique

## 2026-10-13

- **Vérification** - monitoring 2.2.0: echantillonnage, environnement et arret propre documentes dans trace-async-flow (claude-code/agent)
- **Vérification** - Tache 2.11: restauration du contexte de trace (BaseWorker, SinglePostProcessor, BatchPostProcessor) via runInTraceContext / runBatchInTraceContext de database (claude-code/agent)
- **Vérification** - GatherStateMetadata.traceparent devient requis (lignes anterieures sans le champ: normalizeTraceparent) (claude-code/agent)
- **Vérification** - Relu apres bump database 3.7.0 et cascade des dependants: aucune regle ne change (claude-code/agent)
- **Vérification** - Relu apres traceparent requis sur RedisEventMessage et createFollowUp: aucune regle de la skill ne change (claude-code/agent)
- **Vérification** - Pieges locaux: dist perime (erreurs ESLint error typed), null vs undefined des colonnes nullable, base de tests d'integration (claude-code/agent)
- **Vérification** - Changeset sans TTY (ecrire le .md), verifier le bump vs origin/main avant version, propagation patch aux dependants, check-changelogs muet tant que non commite (claude-code/agent)
- **Vérification** - lecons: precision que l'exemple ms-event n'est verifie qu'en local (claude-code/agent)
- **Vérification** - worker-event: resolution retiree, alignement par versions (domain-event 3.10.1); lecons corrigees (pas de resolutions) (claude-code/agent)
- **Vérification** - Etape yarn up: controle des copies multiples de @volontariapp/database (regression e2e ms-event), regle consignee (claude-code/agent)
- **Leçon** - Apres yarn up dans un consommateur, verifier qu'il n'y a qu'une copie de @volontariapp/database (rule) (claude-code/agent)
- **Vérification** - Relu apres bump de versions (messaging 2.24.0 et dependants) par changeset : skill inchangee (claude-code/agent)
- **Vérification** - Relu apres bump domain-event 3.10.0 par changeset : workflow STOP inchange, aucun changement (claude-code/agent)

## 2026-10-11

- **Vérification** - Bumps de versions pour la purge des domaines dans le chantier de suppression de compte (claude-code/agent)
- **Vérification** - Resync apres lint-staged, phase 1 suppression de compte (claude-code/agent)
- **Vérification** - Phase 1 suppression de compte: bumps shared/messaging/domain-user, dependance workspace outbox, bumps induits (claude-code/agent)
- **Leçon** - Dépendance workspace ajoutée et bumps induits (pitfall) (claude-code/agent)

## 2026-10-08

- **Vérification** - Bump versions for event.finished contracts and models (claude-code/agent)

## 2026-10-07

- **Vérification** - Bump versions et changelogs suite aux events event_social.wished/unwished (claude-code/agent)
- **Vérification** - Patch messaging gather completion streams and bump packages (claude-code/agent)
- **Vérification** - Added user.badge_awarded contracts and version bump (agent:antigravity)
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
