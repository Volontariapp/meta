# Historique

## 2026-11-07

- **Vérification** - limits CPU x4, quota limits.cpu 40 (claude-code/agent)

## 2026-11-06

- **Leçon** - Assertion « n'est pas compté » dans un E2E: utiliser un utilisateur-barrière (rule) (claude-code/agent)
- **Leçon** - Pile E2E: le saga de création d'événement ne se termine pas (géocodage coupé) (pitfall) (claude-code/agent)
- **Leçon** - Diagnostiquer une CI E2E en échec sans la relancer (command) (claude-code/agent)
- **Leçon** - Le job qui lance les E2E s'appelle e2e / Run End-to-End Tests (pitfall) (claude-code/agent)

## 2026-11-05

- **Vérification** - Lot 4: G7, storage clients wait for ms-storage in compose (ci-tools#74); test ci-tools via a PR submodule (claude-code/agent)
- **Leçon** - Tester un changement de ci-tools avant son merge : pointer le sous-module d'une PR sur la branche (command) (claude-code/claude-opus-5-5)
- **Leçon** - Un client gRPC ouvert au démarrage exige que le conteneur cible existe déjà (pitfall) (claude-code/claude-opus-5-5)
- **Leçon** - La CI de ws-service ne lance pas d'E2E (pitfall) (claude-code/claude-opus-5-5)
- **Leçon** - Relancer un E2E de main qui a tire une image avant sa publication (pitfall) (claude-code/claude-opus-5-5)
- **Leçon** - L'E2E d'une PR de runner ne joue que les scenarios du main d'api-gateway (pitfall) (claude-code/claude-opus-5-5)

## 2026-11-04

- **Leçon** - Stack E2E de la saga de suppression de compte (decision) (claude-code/claude-opus-5-5)
- **Leçon** - Juger un test de notification Dependabot avec l'historique des labels et l'acteur du run (rule) (claude-code/agent)

## 2026-11-03

- **Vérification** - notify job timeout lowered from 5 to 3 minutes (process:claude-code)
- **Vérification** - notify job timeout lowered from 5 to 3 minutes (agent:claude)

## 2026-11-02

- **Vérification** - pr-ready-notify: claim avant envoi, if/permissions de l'appelant, limites documentees (review #65) (claude-code/agent)
- **Vérification** - pr-ready-notify.yml: notification Discord unique par PR prete (label discord-notified, needs: du ci.yml) (claude-code/agent)

## 2026-11-01

- **Vérification** - relue: render-dependabot.py (MONOREPO_HOLD, limite 3, motif directory) deja decrit, aucun changement (claude-code/agent)
## 2026-11-04

- **Leçon** - Job E2E fige pendant un incident GitHub Actions (pitfall) (claude-code/agent)
- **Leçon** - post-processor-event hors de la stack E2E (pitfall) (claude-code/agent)
- **Leçon** - Matrice E2E : services dans e2e-services.txt, merger les repos avant ci-tools (rule) (claude-code/agent)
- **Leçon** - pg_isready par TCP avec un healthcheck rapide (pitfall) (claude-code/agent)

## 2026-11-03

- **Leçon** - PR empilee fermee au merge de sa base (pitfall) (claude-code/agent)
- **Leçon** - Runners async dans l'E2E et creation manuelle de noeuds (rule) (claude-code/agent)
- **Leçon** - Projet compose local partage avec le dev (pitfall) (claude-code/agent)
- **Leçon** - E2E compose lu depuis le sous-module de l'appelant (pitfall) (claude-code/agent)
- **Leçon** - Label docker-and-e2e requis pour le CI Docker et e2e (pitfall) (claude-code/agent)

## 2026-10-28

- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)
- **Vérification** - skill relue et alignée sur le code (process:agent)

## 2026-10-27

- **Vérification** - Dependabot en une seule PR (process:agent)
- **Vérification** - chemin templates et reapplication apres merge de main (process:agent)
- **Vérification** - reapplication apres merge de main (process:agent)
- **Vérification** - labels docker-e2e et docker-and-e2e (process:agent)

## 2026-10-19

- **Vérification** - etape de normalisation du dossier des resumes de coverage (snapshot report) (human:victor)
- **Vérification** - postgres-ranking ajoute; piege profil migrations (human:victor)

## 2026-10-15

- **Vérification** - service-ci starts database dependencies, runs migrations, and executes integration tests (process:ci-integration-tests)
- **Vérification** - Separate Run Unit Tests and Run Integration Tests steps (process:agent)
- **Vérification** - Support MinIO and S3 environment variables for storage packages (process:agent)

## 2026-10-14

- **Vérification** - Update ci-tools local datadog log collection (claude-code/agent)

## 2026-10-13

- **Vérification** - DD_ENV ajoute au compose: aucune regle de la skill ne change (claude-code/agent)

## 2026-10-12

- **Vérification** - Retypage OKF: type Catalogue (claude-code/agent)

## 2026-10-06

- **Vérification** - passe d'evolution apres les merges du Sprint 8 (statut du repository, CI des services, worktrees) (claude-code/claude-sonnet-5-5)
- **Leçon** - CI d'un service : label docker-and-e2e, et le merge sur main deploie (rule) (claude-code/agent)
- **Vérification** - création depuis le CLAUDE.md de ci-tools (supprimé), vérifiée contre le code (claude-code/claude-opus-5-5)
- **Création** - squelette OKF généré par evolve.py new (claude-code/claude-opus-5-5)
- **Leçon** - Création de la skill (decision) (claude-code/claude-opus-5-5)
