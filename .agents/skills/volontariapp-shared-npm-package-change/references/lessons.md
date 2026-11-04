---
type: Lessons Learned
title: Leçons apprises
description: "Règles et pièges découverts en travaillant sur volontariapp-shared-npm-package-change, du plus récent au plus ancien."
tags: [lessons, volontariapp-shared-npm-package-change]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-06T15:19:37Z"
sources:
  - id: src-10d1da5b
    resource: npm-packages
    title: npm-packages
  - id: src-9f856e83
    resource: npm-packages/.changeset/config.json
    title: npm-packages/.changeset/config.json
  - id: src-b40f1e79
    resource: npm-packages/yarn.lock
    title: npm-packages/yarn.lock
  - id: src-a7f33c12
    resource: ms-event/package.json
    title: ms-event/package.json
  - id: src-b58c39b2
    resource: npm-packages/packages/domain-storage/package.json
    title: npm-packages/packages/domain-storage/package.json
  - id: src-8ba4158b
    resource: npm-packages/packages/contracts/src/gateway/user/response/user.response.ts
    title: npm-packages/packages/contracts/src/gateway/user/response/user.response.ts
  - id: src-19653288
    resource: .claude/hooks/stop-rule-guard.sh
    title: .claude/hooks/stop-rule-guard.sh
  - id: src-ca59d5f3
    resource: npm-packages/packages/domain-post/src/repositories/postgres-post.repository.ts
    title: npm-packages/packages/domain-post/src/repositories/postgres-post.repository.ts
  - id: src-ae6d3d91
    resource: ms-post/package.json
    title: ms-post/package.json
  - id: src-f6aa5050
    resource: ws-service/tsconfig.json
    title: ws-service/tsconfig.json
  - id: src-c6f47875
    resource: ms-user/package.json
    title: ms-user/package.json
  - id: src-cd3f14ee
    resource: npm-packages/packages/domain-user/src/repositories/postgres-user.repository.ts
    title: npm-packages/packages/domain-user/src/repositories/postgres-user.repository.ts
  - id: src-2a04dce2
    resource: npm-packages/package.json
    title: npm-packages/package.json
  - id: src-2ab414d1
    resource: npm-packages/packages/database/src/test/global-setup.ts
    title: npm-packages/packages/database/src/test/global-setup.ts
  - id: src-21073430
    resource: npm-packages/packages/post-processors/src/test/core/helpers/integration/retry.helper.int.spec.ts
    title: npm-packages/packages/post-processors/src/test/core/helpers/integration/retry.helper.int.spec.ts
  - id: src-767c2189
    resource: .agents/skills/volontariapp-shared-npm-package-change/scripts/consumers.py
    title: .agents/skills/volontariapp-shared-npm-package-change/scripts/consumers.py
---

# Leçons

## 2026-11-04 - consumers.py lit les checkouts locaux, pas origin/main

- **Type :** pitfall
- **Leçon :** scripts/consumers.py (chemin relatif au dossier de la skill, pas a npm-packages) lit les package.json des repos clones sous meta tels quels : un checkout en retard ou sur une autre branche donne de fausses versions (le 2026-11-04 il affichait outbox-runners en 3.10.14 alors qu'origin/main declarait ^3.11.0 et resolvait 3.11.0). Avant un yarn up, lire la version resolue avec git -C <repo> show origin/main:<runner>/yarn.lock.[^src-767c2189]
- **Consigné par :** claude-code/agent

## 2026-11-04 - Tests de delai : horloge manuelle, jamais de vraies attentes

- **Type :** rule
- **Leçon :** Un test qui attend avec setTimeout puis verifie qu'un delai n'est pas encore ecoule est instable en CI : un runner charge depasse la marge (retry.helper.int.spec.ts attendait 120 ms contre un delai de 200 ms, echec sur main run 41916499473). Quand le code lit Date.now() pour programmer et comparer, piloter le temps avec jest.spyOn(Date, 'now').mockImplementation(() => now) et restaurer dans afterEach.[^src-21073430]
- **Consigné par :** claude-code/agent

## 2026-11-04 - Tests unitaires de database bloques par le globalSetup

- **Type :** pitfall
- **Leçon :** packages/database/src/test/global-setup.ts exige Postgres et Redis meme pour un test unitaire. Pour un test purement unitaire sans la stack : yarn test --globalSetup <fichier .mjs qui exporte une fonction vide> <spec>. Le hook ESLint post-edit signale aussi les erreurs deja presentes sur main dans le fichier edite : les corriger dans la meme PR.[^src-2ab414d1]
- **Consigné par :** claude-code/agent

## 2026-11-04 - Changement npm-packages en dernier quand des agents travaillent sur les consommateurs

- **Type :** rule
- **Leçon :** Le hook stop-rule-guard verrouille tous les repos consommateurs pour toute la session (sous-agents compris) des qu'un fichier npm-packages est edite. Avec plusieurs agents en parallele sur api-gateway, ci-tools ou les ms-*, faire la modification npm-packages en dernier, une fois leurs branches poussees, puis s'arreter et laisser le Lead Dev lancer le release apres publication.[^src-2a04dce2]
- **Consigné par :** claude-code/agent

## 2026-11-03 - Surcharge de toEntity sans toEntities

- **Type :** pitfall
- **Leçon :** BaseRepository.toEntities passe directement par le mapper (mapArray) et ne rappelle pas toEntity: un repository qui surcharge toEntity (ex. PostgresUserRepository, qui dechiffre l'email) renvoie des donnees brutes sur findAll, findPage, findByIds, findAllWithRelations, createMany et paginate. Toute surcharge de toEntity doit etre doublee d'une surcharge de toEntities qui mappe via this.toEntity, avec un test unitaire par lecture multiple. Correctif: domain-user 2.15.1 (PR #284).[^src-cd3f14ee]
- **Consigné par :** claude-code/agent

## 2026-11-03 - Monter outbox et messaging avec les paquets domain-* chez le consommateur

- **Type :** rule
- **Leçon :** Apres un bump de domain-user (ou d un autre domain-* qui depend de outbox et de messaging), un microservice qui garde outbox et messaging sur d anciennes plages garde en node_modules une seconde copie incompatible de database et des types messaging: tsc echoue (JobPayload, JobsOutboxEntity et JobsOutboxRepository non assignables a BaseRepository) et le build de la CI casse. Constate sur ms-user avec outbox 0.10.22 et messaging 2.30.0; remede verifie: yarn up sur outbox et messaging aux versions de la cascade (0.10.26 et 2.30.2) en plus du paquet de domaine, puis tsc a 0 erreur. Le symptome depend du depot: ms-event, avec les memes bumps de domaine, n a pas de copie en double. Verification: find node_modules -path '*/node_modules/@volontariapp/*/node_modules/@volontariapp/*/package.json' doit ne rien renvoyer (attention: pas de limite de profondeur, un find limite a -maxdepth 6 rate ces copies).[^src-c6f47875]
- **Consigné par :** claude-code/agent

## 2026-11-03 - Lancer changeset version APRES le rebase sur origin/main

- **Type :** rule
- **Leçon :** Quand la PR bot de synchronisation des contrats (proto-registry vers npm-packages) est mergee, elle monte les versions de contracts, contracts-nest et de tous les paquets dependants (database, domain-*, messaging, outbox, workers...). Une branche qui a deja lance changeset version sur l ancien main entre en conflit sur package.json et CHANGELOG.md. Marche a suivre validee: finir et commiter le code seul, git fetch puis rebase origin/main (en cas de conflit sur package.json, CHANGELOG.md ou yarn.lock prendre origin/main, ne jamais resoudre a la main), yarn install, build et tests, et seulement ensuite changeset add puis changeset version une fois, pour que les versions partent de celles deja sur main. Le script test de database lance aussi les tests d integration (Postgres, Redis requis): utiliser jest.config.unit.js en local sans base.[^src-9f856e83]
- **Consigné par :** claude-code/agent

## 2026-10-19 - Erreurs tsc fantomes apres un yarn up : supprimer le cache incremental

- **Type :** pitfall
- **Leçon :** Apres un yarn up qui retire des copies imbriquees de @volontariapp/messaging ou shared, tsc peut afficher des dizaines d'erreurs 'not assignable' qui citent encore node_modules/@volontariapp/<pkg>/node_modules/... alors que ce dossier n'existe plus : c'est le cache incremental dist/tsconfig.tsbuildinfo (incremental: true). Le supprimer (fichier ignore par git) puis relancer tsc avant de conclure qu'une copie double subsiste. Verifier d'abord l'existence du dossier cite avec test -d.[^src-f6aa5050]
- **Consigné par :** claude-code/agent

## 2026-10-19 - Apres yarn up, verifier qu'une seule copie de @volontariapp/database subsiste

- **Type :** rule
- **Leçon :** Deux copies de @volontariapp/database (racine ^3.10.x et version exacte imbriquee sous outbox ou un domain-*) scindent le registre de mapping : l'ecriture outbox leve 'No mapping registered from EventQueueEntity to EventQueueModel' (500 sur toute creation) et l'e2e de tous les depots qui tirent l'image casse. Verifier avec find node_modules -path '*@volontariapp/database/package.json' -not -path '*/dist/*', puis epingler database a la version exacte demandee par outbox (yarn up @volontariapp/database@<version exacte>). Vu sur ms-post (PR 43) et ms-ranking, 2026-10-19.[^src-ae6d3d91]
- **Consigné par :** claude-code/agent

## 2026-10-19 - Un nouveau paquet domain-* suit la forme des autres domaines

- **Type :** rule
- **Leçon :** Un repository de domaine étend BaseRepository de @volontariapp/database (decorateurs Injectable et InjectRepository, nommage Postgres<Nom>Repository), avec une entité par table, un modèle TypeORM, un registerXMappings() appelé dans index.ts et des interfaces dans repositories/interfaces. Le SQL spécifique reste dans le repository (this.repository.query). Ne pas écrire de classes de repository maison ni de factory. Les noms find, remove, create, update, delete, upsert et count sont pris par BaseRepository : nommer autrement les méthodes de domaine. Piège : le paquet a sa propre copie de typeorm dans node_modules, donc ne pas importer EntityManager ou MoreThan depuis typeorm dans le code de production (types incompatibles avec ceux de database) : dériver le type du manager de executeInTransaction et passer par createQueryBuilder. Modèle : domain-post et domain-storage.[^src-ca59d5f3]
- **Consigné par :** human:victor

## 2026-10-17 - Sous-agent en parallele sur un depot consommateur apres edition de npm-packages

- **Type :** rule
- **Leçon :** Le hook stop-rule-guard ne surveille que les outils Write et Edit : un sous-agent peut ecrire dans nativapp ou un ms-* par heredoc Bash apres le verrou, ce que AGENTS.md interdit (cat >, sed). Constate le 2026-10-17 : verrou pose a 15:26:08, 12 fichiers crees dans nativapp entre 15:26:43 et 15:28:31. Ne pas deleguer a un sous-agent un travail dans un depot qui depend de @volontariapp/* tant qu'npm-packages ou proto-registry a ete modifie dans la session. Si le Lead Dev demande ce parallelisme, ecrire dans le brief que toute ecriture dans ce depot, outil Edit ou Bash, est interdite apres le premier edit npm-packages, puis comparer les dates de creation des fichiers (stat) au marqueur .git/volontariapp-stop-guard/<session> et signaler tout ecart.[^src-19653288]
- **Consigné par :** claude-code/agent

## 2026-10-16 - Les types web de la gateway sont ecrits a la main dans contracts, a tenir alignes avec les DTO

- **Type :** rule
- **Leçon :** UserWeb, UserPublicWeb et les reponses web de @volontariapp/contracts vivent dans packages/contracts/src/gateway/**, ecrits a la main et non generes depuis les .proto. Un champ ajoute a un DTO de api-gateway (ex. avatarUrl, calcule par la gateway) doit etre ajoute aussi a ces interfaces, sinon nativapp ne peut pas le lire de facon typee. Le champ est optionnel donc le changement est minor et non cassant. changeset version propage un bump patch a une douzaine de dependants internes (messaging, database, outbox, domain-*, storage-client, workers...), c'est attendu. contracts n'a pas de tests (No tests yet): verifier par yarn build et le .d.ts genere.[^src-8ba4158b]
- **Consigné par :** claude-code/agent

## 2026-10-16 - domain-storage: importer par sous-chemin dans les services sans typeorm

- **Type :** rule
- **Leçon :** La racine de @volontariapp/domain-storage exporte les modeles et repositories typeorm: elle ne se charge pas dans api-gateway (ERR_MODULE_NOT_FOUND @nestjs/typeorm). Depuis 0.12.0, utiliser @volontariapp/domain-storage/enums pour EntityType et @volontariapp/domain-storage/helpers pour buildPublicFileUrl. L'URL d'un avatar a la forme {base}/user-avatar/{fileId}.webp. Un nouveau sous-chemin se declare dans exports de package.json, se verifie par un import dynamique du nom de package apres build, et reste un changement additif (minor).[^src-b58c39b2]
- **Consigné par :** claude-code/agent

## 2026-10-13 - Apres yarn up dans un consommateur, verifier qu'il n'y a qu'une copie de @volontariapp/database

- **Type :** rule
- **Leçon :** Les paquets @volontariapp/domain-*, outbox et workers epinglent database en version exacte, souvent differente de celle du consommateur. Un yarn up peut donc installer plusieurs copies (ms-event apres domain-event 3.10.0: 3.4.29 a la racine, 3.4.31 sous domain-event). Les tests unitaires et le build passent, mais les e2e CI cassent: EntityMetadataNotFoundError 'No metadata for EventQueueModel' et 'No mapping registered from JobsOutboxEntity to JobsOutboxModel' (4 suites e2e event, 46 tests). Avant de pousser: find node_modules -path '*@volontariapp/database/package.json' -not -path '*/dist/*' doit n'afficher qu'une ligne; sinon aligner les versions. Correctif prefere par l'equipe: PAS de resolutions (trop fragile a maintenir). Aligner les versions: database en dependance directe a la version epinglee par domain-event/workers/outbox (npm view @volontariapp/<paquet>@<version> dependencies.@volontariapp/database), et monter domain-event, workers et outbox sur des versions qui epinglent la meme database. Exemples verifies en local (CI e2e ms-event a revalider): ms-event = domain-event 3.10.0 + database 3.4.31 + outbox 0.9.68; worker-event = domain-event 3.10.1 + workers 1.3.37 (database 3.4.32, messaging 2.24.0, outbox 0.9.69).[^src-a7f33c12]
- **Consigné par :** claude-code/agent

## 2026-10-11 - Dépendance workspace ajoutée et bumps induits

- **Type :** pitfall
- **Leçon :** Ajouter une dépendance workspace (ex: @volontariapp/outbox dans domain-user) exige yarn install avant le build. yarn changeset version bumpe aussi en patch les dépendants (auth, database, outbox, workers...). Dans ce shell, cd est aliasé sur z: utiliser builtin cd. L'erreur ESLint de messaging/src/helpers/jobs-events-mapping.ts (no-unnecessary-condition) existe déjà sur main.[^src-9f856e83]
- **Consigné par :** claude-code/agent

## 2026-10-07 - yarn build (nest build) ne compile pas les specs : verifier avec tsc

- **Type :** rule
- **Leçon :** nest build utilise tsconfig.build.json qui exclut les specs, mais le build Docker les a fait echouer (ws-service : userId et fileIds manquants dans les payloads de test, IEventCreatedPayload et IPostCreatedPayload). Apres un bump, valider chaque consommateur avec npx tsc --noEmit -p tsconfig.json en plus de yarn build : cela a aussi revele scripts/seed/events.seeder.ts dans api-gateway.
- **Consigné par :** claude-code/agent

## 2026-10-07 - Bump consommateurs : pre-push, watchman, ordre des commits

- **Type :** rule
- **Leçon :** Apres un bump, les repos ms-* executent yarn lint au pre-push (lint --fix reformate et retire des gardes devenues inutiles avec les types plus stricts : fileIds, missingFileIds, $metadata?) : commiter ces corrections avant de pousser. Jest echoue avec watchman casse (glog absent) : ajouter --watchman=false. Le hook pre-commit de chaque repo exige un evolve.py sync de la skill concernee avant git commit. Ordre qui a fonctionne : yarn up, yarn build, corriger les DTO et factories, yarn lint, jest, sync, commit, push. Ne pas utiliser de script Python pour editer un consommateur : le classifieur de permissions le traite comme un contournement du verrou.
- **Consigné par :** claude-code/agent

## 2026-10-07 - Le verrou STOP survit a la publication dans la meme session

- **Type :** rule
- **Leçon :** Si la meme session modifie npm-packages puis bumpe les consommateurs, le hook stop-rule-guard refuse toute edition (Edit/Write) dans ms-*, api-gateway, runners meme apres publication CI. yarn up par Bash passe, mais corriger le code consommateur exige que le Lead Dev lance ! .claude/hooks/stop-rule-guard.sh release. Prevenir le Lead Dev des la fin du STOP, ou ouvrir une session neuve pour la phase consommateurs.
- **Consigné par :** claude-code/agent

## 2026-10-07 - Bump logger : contracts* tire les protos en cours

- **Type :** rule
- **Leçon :** yarn up '@volontariapp/*' dans un consommateur bumpe aussi contracts et contracts-nest, qui dependent du logger et embarquent les protos de la feature stockage (idempotencyKey, coverStatus, fileIds) : ms-event, ms-post, ms-user, api-gateway et worker-event ne compilent plus. Tester d'abord (yarn up puis yarn build, puis git checkout package.json yarn.lock) avant de commiter. Les yarn install de test modifient .yarn/install-state.gz (suivi par git dans les runners) : le restaurer avec git checkout.
- **Consigné par :** claude-code/agent

## 2026-10-07 - Bump changeset en cascade et lint hors workspace

- **Type :** rule
- **Leçon :** yarn changeset version bumpe aussi en patch tous les dependants internes (ex: logger minor => auth, monitoring... en patch), c'est attendu. yarn lint de workspace echoue (eslint absent hors eslint-config) : lancer node ../../node_modules/eslint/bin/eslint.js src/ depuis le package. cd est casse par un hook z du shell : utiliser builtin cd.
- **Consigné par :** claude-code/agent

## 2026-10-06 - Ne jamais reecrire l'entree CHANGELOG d'une version deja publiee

- **Type :** rule
- **Leçon :** Une correction de texte du CHANGELOG n'est permise que sur une version non publiee (verifier avec npm view @volontariapp/<pkg>@<version> version --prefer-online : absent signifie non publiee). Pour une version deja publiee, ne pas modifier son entree : decrire le changement (retrait d'un champ d'API, correction) dans l'entree de la NOUVELLE version, en le signalant comme cassant si c'est le cas. Sinon un consommateur lit 'version X sans le champ' alors que la X publiee l'accepte.[^src-9f856e83]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Avant de pousser une branche empilee, verifier l'etat de la PR de base

- **Type :** rule
- **Leçon :** Une branche creee sur la branche d'une PR ouverte doit etre re-verifiee juste avant le push (gh pr view <n> --json state) : si la PR de base a ete mergee entre-temps, la branche d'origine disparait, le rebase sur origin/main reecrit les SHA et un push d'une branche deja publiee est rejete en non fast-forward. Dans ce cas ne pas deplacer ni forcer la branche (les deplacements de refs et le force push sont refuses par le classifieur de permissions) : publier la lignee rebasee sous un nouveau nom de branche et ouvrir la PR depuis celui-ci, puis laisser le Lead Dev supprimer l'ancienne branche distante.[^src-9f856e83]
- **Consigné par :** claude-code/agent

## 2026-10-06 - typeorm est duplique par jeu de peers : types incompatibles entre un domaine et database/outbox

- **Type :** rule
- **Leçon :** Yarn berry cree une instance physique de typeorm par jeu de peerDependencies : la copie hissee (node_modules/typeorm, utilisee par @volontariapp/database et outbox) et des copies sous packages/<domain>/node_modules/typeorm, toutes en 0.3.28 avec une seule entree dans yarn.lock. Passer un EntityManager ou un Repository d'un package domain-* a EventQueueRepository / JobsOutboxRepository echoue alors en TS2345 (Property 'findOptions' is protected but type 'SelectQueryBuilder<Entity>' is not a class derived from 'SelectQueryBuilder<Entity>'). domain-post le contourne avec as unknown as dans ses tests, ce qu'AGENTS.md interdit. Piste examinee en revue (PR #217) : paths dans le tsconfig du package qui mappe typeorm vers ../../node_modules/typeorm/index.d.ts (types seulement ; en NodeNext il faut pointer index.d.ts, pas le dossier), avec pour limite la dependance a la disposition hissee. Le TS2589 (profondeur de types) invoque a tort pour justifier des inserts bruts n'est pas reproductible avec EventQueueRepository.create.[^src-b40f1e79]
- **Consigné par :** claude-code/agent

## 2026-10-06 - yarn changeset version exige GITHUB_TOKEN et le changeset deja pousse

- **Type :** rule
- **Leçon :** Le changelog du depot utilise @changesets/changelog-github (config .changeset/config.json) : yarn changeset version appelle l'API GitHub pour lier commit et PR, donc il exige un GITHUB_TOKEN dans l'environnement et que le commit qui ajoute le changeset soit deja pousse sur origin. Pousser la branche avant le commit de version, puis lancer la commande avec le jeton fourni en variable d'environnement inline (par ex. GITHUB_TOKEN=$(gh auth token) yarn changeset version) sans l'afficher ni l'ecrire dans un fichier. Dans un worktree git, supprimer les tsconfig.tsbuildinfo perimes si yarn build ne produit pas dist.[^src-9f856e83]
- **Consigné par :** claude-code/agent

## 2026-10-06 - Merge d'une PR de npm-packages : revue obligatoire, utiliser --auto

- **Type :** rule
- **Leçon :** La branche main de npm-packages exige une approbation de revue (REVIEW_REQUIRED) : gh pr merge direct echoue (base branch policy prohibits the merge). gh pr merge --admin et un git merge pousse sur main sont refuses par le classificateur de permissions de Claude Code (Merge Without Review) sauf instruction explicite du Lead Dev pour une PR donnee (cas des PR de sync bot proto). Pour une PR de feature : gh pr merge <n> --merge --auto, qui merge des que la revue est approuvee et la CI verte. Le merge sur main declenche la release npm, irreversible : ne merger qu'une PR relue, CI verte.[^src-10d1da5b]
- **Consigné par :** claude-code/agent

[^src-10d1da5b]: npm-packages
[^src-9f856e83]: npm-packages/.changeset/config.json
[^src-b40f1e79]: npm-packages/yarn.lock
[^src-a7f33c12]: ms-event/package.json
[^src-b58c39b2]: npm-packages/packages/domain-storage/package.json
[^src-8ba4158b]: npm-packages/packages/contracts/src/gateway/user/response/user.response.ts
[^src-19653288]: .claude/hooks/stop-rule-guard.sh
[^src-ca59d5f3]: npm-packages/packages/domain-post/src/repositories/postgres-post.repository.ts
[^src-ae6d3d91]: ms-post/package.json
[^src-f6aa5050]: ws-service/tsconfig.json
[^src-c6f47875]: ms-user/package.json
[^src-cd3f14ee]: npm-packages/packages/domain-user/src/repositories/postgres-user.repository.ts
[^src-2a04dce2]: npm-packages/package.json
[^src-2ab414d1]: npm-packages/packages/database/src/test/global-setup.ts
[^src-21073430]: npm-packages/packages/post-processors/src/test/core/helpers/integration/retry.helper.int.spec.ts
[^src-767c2189]: .agents/skills/volontariapp-shared-npm-package-change/scripts/consumers.py
