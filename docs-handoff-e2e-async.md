# Handoff : E2E asynchrone (2026-11-04)

Session interrompue (limite d'usage). Reprendre dans cet ordre.

## Fait et vert sur main (7 repos E2E + 3 runners)
- E2E asynchrone : `user-created-social` et `user-created-ws-notification` passent sur api-gateway, ms-user, ms-post, ms-event, ms-social, ms-storage, ms-ranking.
- Runners dans la matrice E2E (ci-tools#71 + PR des 10 repos) : une PR de runner labellisee `docker-and-e2e` construit toutes ses images taguees par branche et lance l'E2E avec (valide sur outbox-runners#43, fermee).
- Perf : cache Docker gha, ci-docker en parallele, Jest 4 workers, healthchecks rapides (postgres par TCP).
- Bug WS user.created corrige (domain-user 2.16.0 + migration ms-user).

## En cours (branches poussees en wip, voir les PR et leurs notes)
1. Lot 2 (event/post vers social et ranking) : branches `feat/e2e-lot2-event-post` dans ci-tools et api-gateway, note `HANDOFF-LOT2.md`. Contient aussi l'enquete sur le test event-search 21 (400 intermittent, cause non determinee).
2. Bug G1 (saga de suppression d'event jamais terminee, cles du gather ws-service desalignees) : branches `fix/event-deletion-gather` dans ws-service et/ou post-processors-runner, note dans les PR. Decision : aligner ws-service sur les cles emises et ajouter l'emetteur cote post.
3. Scenarios par evenement : api-gateway#98 (draft, `feat/e2e-scenarios`), catalogue `e2e/scenarios/README.md` (72 evenements). A rebaser sur le lot 2 une fois merge ; 12 scenarios lot 2 echouent tant que le lot 2 n'est pas dans la stack. G1 et G3 sont en `it.failing` : les repasser en `it` quand les correctifs sont merges.

## A faire ensuite
1. Finir et merger le lot 2 (CI verte), puis rebaser #98 dessus et le merger.
2. Finir et merger G1, repasser son scenario en `it`.
3. Bug G3 (user supprime juste apres son inscription : noeud social orphelin, user.deleted pousse avant user.created). Decision : ordre deterministe dans le consommateur outbox de `@volontariapp/database` (`packages/database/src/outbox/consumers/outbox.consumer.ts`), bump des outbox runners. Regle du STOP : le faire en DERNIER (le hook verrouille tous les consommateurs), puis release par le Lead Dev apres publication.
4. Bug G2 (pas de feedback `event.geocoding_failed`) : npm-packages, a decider.
5. Lot 3 : saga de suppression de compte complete (5 post-processors + ws gather), DLQ, idempotence. Le catalogue de #98 liste les runners manquants (post-processor-user, -storage, outbox-ws, outbox-storage, worker-storage).

## Rappels
- Merger une PR ci-tools seulement apres celles des repos qui en dependent (sync-all pousse le pointeur sur main partout).
- Un test qui revele un bug n'est pas adapte : `it.failing` + ticket ou correctif.
- Lecons detaillees dans `.agents/skills/volontariapp-ci-tools`, `-api-gateway`, `-implement-async-event-flow`, `-shared-npm-package-change` (references/lessons.md).
