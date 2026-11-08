# Prompt de reprise : montée en charge et goulots de la plateforme

À coller tel quel au début d'une session neuve ouverte dans `meta` (le handoff n'est pas forcément commité : si ta session démarre depuis un autre checkout ou un worktree de `meta`, il n'y sera pas).

---

Tu reprends la fin d'un chantier de montée en charge de la plateforme Volontariapp, mené avec le Lead Dev (Victor). Une session précédente a trouvé et corrigé trois goulots (Neo4j saturé par le worker de ranking, comptage SQL de la route des posts, et surtout des lectures disque continues de l'outbox qui gelaient la VM), puis mesuré que la plateforme tient 200 req/s sans erreur (confortable à 175). Il reste à analyser un dernier test, à clore proprement et à répondre à la question de Victor. Le contexte n'est pas dans cette conversation : il est dans les fichiers ci-dessous.

**Commence par lire en entier `handoffs/load-ramp.md` à la racine de `meta`, puis la skill `.agents/skills/volontariapp-load-ramp/SKILL.md`.** Le handoff donne l'état vérifié, ce qui n'est pas vérifié, les PR, les pièges et les décisions. La skill donne la méthode, les scripts d'enregistrement et les chiffres de référence. La mémoire de projet `project-load-ramp` est chargée automatiquement : elle complète, elle ne remplace pas.

## Ce que tu fais d'abord

1. Vérifie l'état réel, sans rien supposer : `kubectl -n prod get deploy` pour `ms-post` (`sha-a79888b`, 2 réplicas), `ms-event` (`sha-a2626c1`, 2 réplicas), `api-gateway` (jusqu'à 6 pods), runners `outbox-*` (`sha-fd022f3`), simulateur à 0 réplica ; `gh pr view 66 --repo Volontariapp/deploy` (doit être ouverte) ; `git -C /Users/victoragahi/Developer/meta status --short` (skills et handoffs non commités). Rapporte les écarts avec le handoff.
2. Demande à Victor la sortie de son dernier test (`LOAD_STEPS="200,225,250"`, rapport `load-report-225-250.json`) et, si un palier a cassé, la fin de `/tmp/psi.log` sur la VM ; sinon passe au point suivant. Si tu dois relancer un test, démarre d'abord les enregistreurs avec `scripts/record-ramp.sh` de la skill (Victor lance lui-même la rampe depuis son Mac).
3. Quand il colle la sortie : lis le tableau, la latence par route (`jq` de la skill), aligne `traefik.log`, `cpu.log`, `disk.log` et `psi.log` sur les horodatages, compte les requêtes par réplica. Sépare un gel de la VM d'une saturation de CPU comme le décrit la skill. Conclus en séparant FAIT, INFERENCE et NON VERIFIE.

## Règles de travail

- Réponds en français, court et direct, sans emoji ni tiret cadratin (un hook les refuse, y compris dans les commits et les PR). Chaque affirmation d'absence cite l'outil et le périmètre (la relecture de fin de réponse l'exige). Challenge les décisions de Victor quand l'architecture est en jeu, mais applique celles du handoff, section 7 (pas de cache avant 300 req/s, pas de seconde base, rétention de 1 jour).
- Utilise les outils MCP `mesh-mcp` avant tout `grep` multi-dépôts. Lis le code déployé avec `git show <sha de l'image>:chemin` ou dans un worktree neuf depuis `origin/main` : les checkouts locaux sont presque tous sur des branches de feature et sales. `cd` est surchargé par `z` : chemins absolus et `git -C`.
- Tu peux seul : lire le cluster (`kubectl get`, `top`, `logs`, métriques cadvisor et Traefik), lire le code, préparer du code dans des worktrees neufs, ouvrir des PR, pousser sur `main` des dépôts de ce chantier (accord donné), lever le verrou du STOP après ses conditions (release verte et `npm view` de chaque paquet bumpé).
- Tu demandes à Victor avant : toute lecture de base de production (accord explicite à chaque fois), toute modification du cluster ou de `deploy` hors PR, la fusion d'une PR `deploy` (il fusionne), un redémarrage de la gateway, tout `kubectl exec` dans un pod de production si le classificateur le refuse.
- Tout changement dans `npm-packages` suit la règle du STOP (skill `volontariapp-shared-npm-package-change`) et le code se fait en TDD avec accord préalable sur les points de test (skill `tdd`). Ne lance jamais l'E2E en local. Pour attendre une CI ou un déploiement, lance une commande en arrière-plan et laisse la notification te réveiller ; surveille la CI avec le SHA complet (`gh run list --commit <sha complet>`).
- Si un hook ou le classificateur refuse une action, ne la contourne pas : cherche une autre voie légitime, sinon demande.

## Critère de fin

1. Le test 200/225/250 est analysé (plafond situé, goulot suivant identifié avec ses preuves).
2. Victor a été prévenu qu'il peut fusionner `deploy#66` (le simulateur revient), et la CI de cette PR est verte avant tout webhook Discord.
3. Le handoff et la mémoire `project-load-ramp` portent les chiffres finaux ; `evolve.py plan` puis `sync` et `learn` sont passés ; `meta` est commité (skills et `handoffs/`, push sur `main` accepté) ; les enregistreurs de la VM sont arrêtés (`pkill -f psi.sh`, `sudo pkill iostat`, à demander à Victor) ; les worktrees du chantier sont supprimés (liste dans le handoff, section 10).
4. Victor a une réponse claire à sa question de départ : combien d'utilisateurs simultanés, et ce qu'il faudrait pour 300 req/s puis 1 000 req/s, avec les propositions suivantes à lui soumettre sans les exécuter (répartition gRPC, réplicas de `ms-social`, index de `job_audit`, CoreDNS et Traefik à 2 réplicas, lignes `PROCESSING` coincées dans `ms-ranking`).
