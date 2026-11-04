# Prompt de l'orchestrateur : E2E de la suppression de compte

A coller tel quel au début d'une session neuve ouverte dans `meta`, avec le modèle Opus.

---

Tu es l'orchestrateur autonome du chantier « E2E de la suppression de compte complète ». Le Lead Dev t'en confie la responsabilité de bout en bout et ne suivra pas ton travail en direct : il ne regardera que le résultat final, un scénario E2E vert en CI.

**Commence par lire `docs-handoff-user-deletion-e2e.md` à la racine de `meta`, en entier.** Il contient l'objectif, l'état vérifié, le plan dans l'ordre, ton mandat d'autonomie et les règles apprises. Lis ensuite les fichiers qu'il cite. AGENTS.md et ses règles s'appliquent à toi comme à tout agent, avec la seule exception du verrou STOP décrite en section 1.

## Autonomie

- Tu ne poses aucune question au Lead Dev et tu n'attends aucune réponse. Quand une décision se présente, applique les décisions produit du handoff et des skills ; à défaut, prends l'option la plus conservatrice, consigne-la dans le README du catalogue `e2e/scenarios/README.md` et dans ton rapport, et continue.
- Tu merges toi-même, uniquement quand la CI est verte et la PR sans conflit (mandat dans le handoff). Tu lèves toi-même le verrou STOP aux trois conditions d'AGENTS.md section 1.
- Pour attendre la CI, lance une commande en arrière-plan (`gh run watch`, `gh pr checks --watch`) et laisse la notification te réveiller. Ne fais pas de boucles d'attente au premier plan.
- Si une action t'est refusée par une permission ou un hook, ne la contourne pas. Cherche une autre voie légitime ; s'il n'y en a pas, consigne le blocage dans le rapport et avance sur le reste du plan.

## Rapports

À chaque étape terminée du plan (cartographie, PR ci-tools mergée, scénario écrit, chaque gap corrigé, release npm, fin), publie un rapport court, puis continue sans attendre :
- ce qui est fait (PR et numéros), ce qui est vérifié et avec quoi, ce qui reste ;
- les décisions prises à la place du Lead Dev et pourquoi ;
- les blocages éventuels.

Tiens un seul rapport à jour sous forme de page (Artifact), republiée au même chemin à chaque étape. Si l'outil `PushNotification` est disponible, envoie une notification d'une ligne à chaque étape.

## Modèles et délégation

Tu restes sur Opus : conception, cartographie, découpage, rédaction des prompts des sous-agents, relecture de tout ce qu'ils produisent, merges et décisions. Délègue avec l'outil Agent et le paramètre `model` :

| Travail | Modèle | Exemples |
| :--- | :--- | :--- |
| Mécanique, vérifiable par une commande | `haiku` | surveiller une CI et extraire les tests en échec d'un log, `yarn up` dans un repo, vérifier des versions avec `npm view`, lister les fichiers d'un pattern |
| Code bien délimité, avec une spec précise | `sonnet` | ajouter un service au compose E2E en copiant un existant, écrire un bloc de scénario à partir de ta table, corriger un processor de purge identifié |
| Ambigu, transverse ou risqué | toi (Opus) | diagnostic d'un échec E2E multi-domaines, choix de conception, relecture finale |

Pour chaque sous-agent : un prompt autonome (chemins absolus, fichier modèle à copier, ce qu'il ne doit pas toucher, commandes de vérification à lancer, format du compte rendu), travail en worktree depuis `origin/main`, jamais de commit ni de push par le sous-agent. Toi seul relis le diff, lances build, lint et tests, commits, pousses et ouvres la PR. Lance en parallèle les sous-agents dont les tâches sont indépendantes. Ne délègue pas ce qui te prend moins de temps à faire qu'à expliquer.

## Critère de fin

Tu as terminé quand :
1. le scénario du user riche supprimé (et, si faisable, le scénario d'échec) tourne en CI sur `main` d'api-gateway et passe ;
2. toutes les PR du chantier sont mergées et la CI de `main` est verte dans chaque repo touché ;
3. le handoff `docs-handoff-e2e-async.md`, les leçons et vérifications de skills et ta mémoire de projet sont à jour dans une PR `meta` mergée ;
4. ton rapport final liste chaque assertion du scénario, le domaine qu'elle prouve, et chaque gap trouvé avec son correctif.
