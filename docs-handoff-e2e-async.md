# Handoff : E2E asynchrone (mis a jour le 2026-11-04 apres-midi)

Reprendre depuis une session neuve ouverte dans `meta`. Lire ce fichier, puis les lecons des skills `volontariapp-ci-tools`, `volontariapp-api-gateway`, `volontariapp-implement-async-event-flow`, `volontariapp-shared-npm-package-change` (references/lessons.md).

## Fait et merge
- Lot 1 : user.created vers ms-social et notification WebSocket, testes en CI sur api-gateway et les 6 ms-* (e2e/async/user-created-social, user-created-ws-notification).
- Runners dans la matrice E2E (ci-tools#71) : une PR de runner labellisee `docker-and-e2e` construit toutes ses images taguees par branche et lance l'E2E avec.
- Perf CI : cache Docker gha, ci-docker en parallele des tests unitaires, Jest 4 workers, healthchecks rapides (postgres par TCP).
- Bug WS user.created corrige (domain-user 2.16.0, migration ms-user).
- G1 corrige : saga event.deleted alignee (ws-service#50, post-processors-runner#59).
- Lot 2 (ci-tools#72, api-gateway#100) : outbox-event, outbox-post, outbox-ranking, post-processor-ranking, worker-ranking, ms-ranking dans la stack ; tests e2e/async/event-social-node, post-social-node, ranking-feed. post-processor-event volontairement exclu (geocodage fige sur Paris en test).

## A verifier en premier
La vague CI sur main apres le merge du lot 2 (api-gateway + 6 ms-*) n'etait pas terminee au moment du handoff. Verifier :
`for r in api-gateway ms-user ms-post ms-event ms-social ms-storage ms-ranking; do gh run list -R Volontariapp/$r -b main -L 1 --json conclusion,displayTitle; done`
Un echec juste apres le merge peut venir de l'ancienne image de test (creation manuelle de noeuds event en course avec outbox-event) : relancer le run (`gh run rerun <id> --failed`) une fois l'image api-gateway-e2e de main publiee.

## Reste a faire, dans cet ordre
1. Scenarios par evenement : api-gateway#98 (draft, branche `feat/e2e-scenarios`, catalogue `e2e/scenarios/README.md`, 72 evenements). Rebaser sur main (lot 2 merge), faire passer la CI, merger. G1 est corrige : repasser son scenario de `it.failing` en `it`. G3 reste `it.failing`.
2. Cascade npm-packages, EN DERNIER (le hook STOP verrouille tous les consommateurs de la session), un seul release du Lead Dev apres publication :
   - G3 : ordre deterministe dans le consommateur outbox de `@volontariapp/database` (`packages/database/src/outbox/consumers/outbox.consumer.ts`), puis bump des outbox runners. Preuve : user.deleted pousse avant user.created dans `social:user`, noeud social orphelin.
   - Decision Lead Dev : les posts d'un event supprime sont detaches (eventId vide). Methode domain-post + feedback post vers ws-service, puis ajouter la cle a `expects` de la saga event.deleted.
   - domain-social `getRecommendedEventIds` : filtrer `e.eventId IS NOT NULL`.
   - A decider avec le Lead Dev : la gateway lit jusqu'a 10 000 ids recommandes mais ms-event plafonne a 1000 (MAX_SEARCH_IDS) : au-dela, recherche avec filtre social en 400. Tronquer ou pousser le filtre dans ms-event.
   - G2 (a decider) : pas de feedback `event.geocoding_failed`.
3. Lot 3 : saga de suppression de compte complete (post-processor-user, -storage, outbox-ws, outbox-storage, worker-storage a ajouter), DLQ, idempotence.

## Regles de travail apprises
- Merger les PR des repos avant la PR ci-tools qui en depend (sync-all pousse le pointeur sur main partout) ; inversement, une PR ci-tools qui ajoute des runners doit etre suivie tout de suite de la PR api-gateway qui retire les creations manuelles concurrentes.
- Une PR api-gateway qui depend d'un changement de compose pointe son sous-module ci-tools sur la branche ci-tools, puis sur main apres merge (verifier que les arbres sont identiques).
- Un test qui revele un bug n'est pas adapte : `it.failing` + correctif ou ticket.
- Rejouer l'E2E en local seulement avec `COMPOSE_PROJECT_NAME` dedie (le projet `ci-tools` est la base de dev) ; la machine locale (10 Go, emulation amd64) ne tient pas la stack complete : se fier a la CI.
