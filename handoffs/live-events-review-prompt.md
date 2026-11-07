# Prompt de relecture : conception "événements en direct"

À coller dans une session neuve lancée depuis `/Users/victoragahi/Developer/meta`, avec le modèle Claude Opus 5.5 (`claude-opus-5-5`).

```text
Tu es le relecteur d'une conception avant implémentation. Tu ne modifies RIEN : aucun
fichier, aucun commit, aucune PR, aucun changement dans proto-registry ni npm-packages.
Tu peux lancer des sous-agents en lecture seule si cela accélère les vérifications.

## Contexte

Victor (Lead Developer, équipe de 3) veut ajouter à nativapp la possibilité de rejoindre un
événement en direct autour de soi : bouton dans les actions rapides, recherche dans 2 km,
temps de marche (OSRM), écran commun "Événement en direct", puis (palier 4) partage de
position vers l'organisateur. La conception est écrite et poussée sur la branche main du
dépôt docs (commit 5c61d24) :

  /Users/victoragahi/Developer/meta/docs/live-events/
    README.md, 01-etat-des-lieux.md, 02-decisions.md, 03-nativapp.md,
    04-contrats-et-backend.md, 05-plan-de-pr-et-lots.md, 06-risques-et-verifications.md

Lis d'abord /Users/victoragahi/Developer/meta/AGENTS.md (règle du STOP, aiguillage mesh-mcp,
règles de raisonnement R1 à R8, règles d'or) et /Users/victoragahi/Developer/meta/CLAUDE.md,
puis les sept fichiers dans l'ordre. Date du jour : 2026-11-07.

Victor lancera ensuite une session d'orchestration qui exécutera les lots avec des
sous-agents. Ton avis conditionne ce passage : il doit dire si la conception est prête, et
sinon ce qui doit changer.

## Ta mission

Éprouver la conception, avec un esprit critique (AGENTS.md : 4D, challenger les écarts
d'architecture). Ne valide pas par politesse. Cherche ce qui est faux, ce qui manque, ce qui
se contredit, ce qui ne tiendra pas à l'exécution.

### 1. Vérifier les faits décisifs (relis la ligne citée, ne te fie pas au document)

Le document cite des chemins et des lignes lus le 2026-11-07. Pour chaque constat que tu
juges décisif, rouvre le fichier. Utilise mesh-mcp d'abord (smart_search avec scope,
find_dependents, analyze_impact, analyze_grpc), puis des lectures ciblées dans UN dépôt.
Pas de grep à la racine de meta. Si une ligne ne correspond plus, dis-le : les dépôts
peuvent avoir bougé (le dépôt docs a reçu 16 commits pendant l'écriture, dont
docs/architecture/ADR-Pagination.md : vérifie la cohérence avec 01 et 03 sur le plafond de
100 et l'écrêtage).

Constats à contrôler en priorité :
- Aucun job ne passe un événement à IN_PROGRESS ni FINISHED (périmètre cité en 01 section 4).
  Applique R1, R3 et R6 : tu dois citer l'outil, le périmètre complet et ce qui reste non vérifié.
- La politique réseau de api-gateway n'autorise pas Redis ; celle de ws-service n'a été lue
  que sur ses 60 premières lignes (sortie Redis inconnue).
- SearchAdvancedVO est construit par paramètres positionnels ; ajouter endAtFrom en dernier
  paramètre optionnel ne casse aucun appelant (cherche TOUS les appelants).
- SearchEventsRequest (type REST) est écrit à la main dans npm-packages/packages/contracts,
  pas généré depuis le proto.
- participateEvent ne contrôle ni capacité ni état ; currentParticipants est rempli par la
  gateway (+1 pour le créateur) ; il n'existe aucun RPC booléen de participation.
- ws-service n'a aucun handler entrant ; le registre WebsocketEventRegistry est serveur vers
  client ; notifyUser ignore un utilisateur non suivi dans Redis.
- Le seed ne crée jamais d'événement en cours.
- Les lignes de nativapp citées (QuickActionsModal, MainStack, event.api, manage-hub.utils).
- Les mesures OSRM de 01 section 8 (tu peux rejouer les deux requêtes curl, une fois chacune,
  avec un User-Agent explicite).

Les dix points V1 à V10 de 06 sont déclarés non vérifiés. Résous ceux qui se règlent par
une lecture (V1, V2, V5, V6, V7, V8, V9, V10) et rapporte le résultat. V3 et V4 demandent
des essais : dis si tu les as faits ou non.

### 2. Chercher ce qui manque

Passe en revue, pour chaque dépôt touché (nativapp, api-gateway, ms-event, ws-service,
npm-packages, proto-registry, deploy) : fichiers à modifier non listés, exports et index à
mettre à jour, injections de dépendances Nest, modules à déclarer, configuration et variables
d'environnement, validations de DTO, Swagger, tests existants qui casseraient, mocks et
factories à créer, skills volontariapp-* à mettre à jour (evolve.py plan), migrations (il
n'y en a pas : confirme).

Cas limites métier et techniques : fuseaux horaires et formats de date, événement sans
coordonnées, événement sans date de fin, utilisateur organisateur, déconnexion du socket en
plein partage, jeton expiré pendant le partage, plusieurs appareils pour un même utilisateur
(AppGateway déconnecte l'ancien socket), horloge du téléphone décalée, permission refusée
après acceptation, app tuée pendant le partage (l'autorisation Redis reste jusqu'à son TTL).

### 3. Sécurité et vie privée du partage de position

Évalue 04 section 8 comme le ferait un relecteur de sécurité : modèle de menace
(organisateur malveillant, participant malveillant, appel direct à l'endpoint interne,
rejeu de jeton interne, énumération d'événements), efficacité réelle de l'arrondi à 3
décimales, durées (TTL 120 s, autorisation jusqu'à fin plus 15 min, plafond 8 h), fuite par
les journaux, conformité avec AGENTS.md section 6. Dis ce que tu durcirais.

### 4. Plan de PR et parallélisme (05)

Vérifie que l'ordre est réalisable : un seul cycle de contrats, au plus 2 PR dans
npm-packages (une automatique, une manuelle), règle du STOP respectée, double bump de
@volontariapp/contracts (PR A automatique, PR B manuelle) correctement ordonné. Le verrou
STOP est posé par session (hook .claude/hooks/stop-rule-guard.sh) : lis le hook et dis si un
sous-agent hérite du verrou de la session qui l'a lancé, car cela décide de l'organisation
des sessions. Dis si end_at_from (proto) mérite un cycle de contrats ou si le repli côté
client suffit. Dis si la PR B peut être simplifiée ou fusionnée autrement.

### 5. Lots et répartition des modèles

Chaque lot LE-01 à LE-13 doit être exécutable seul : fichiers nommés, critères "fait quand"
testables, dépendances explicites, 3 heures au plus. Signale les lots trop gros, trop flous,
ou dont les critères ne se vérifient pas automatiquement.

Propose un PROTOCOLE D'ORCHESTRATION pour la session suivante. Contraintes de Victor :
- L'orchestrateur est un agent Opus 5.5.
- Les exécutants peuvent être Sonnet 5.5 (claude-sonnet-5-5), Haiku 5.5 (claude-haiku-5-5)
  ou des agents agy (Antigravity). Sonnet 5.5 est fiable. agy est équivalent à Sonnet 5.5 SI
  ses consignes sont très précises, mais son travail doit être RELU AUTOMATIQUEMENT à chaque lot.
- agy n'a aucun hook du dépôt (ni règle du STOP, ni garde emoji ou tiret cadratin). Voir la
  mémoire feedback-delegate-to-agy (commande, limites). Vérifie les options avec `agy --help`
  avant de les figer.
- Aucun E2E en local : la CI fait foi.
- Un worktree par lot.

Le protocole doit dire : quel modèle prend quel lot (le tableau de 05 section 5 est une
proposition, conteste-le, et dis si Haiku convient à certains lots mécaniques), comment
chaque lot d'agy est relu automatiquement (par exemple un relecteur Sonnet 5.5 ou Opus qui lit
le diff, lance lint, types et tests, cherche les fichiers frères oubliés et vérifie les règles :
STOP, pas de any ni de cast, pas d'emoji ni de tiret cadratin, aucune coordonnée dans un
journal), quand l'orchestrateur s'arrête et passe la main à Victor, comment il rend compte.

### 6. Cohérence interne

Cherche les contradictions entre les sept fichiers (constantes, noms de types, numéros de
lots, ordre des PR, valeurs par défaut, chemins) et les phrases qui affirment plus que la
preuve citée.

## Règles de travail

- Français. Aucun emoji, aucun tiret cadratin. Sois dense : pas de formule d'ouverture ni de
  conclusion creuse.
- Sépare FAIT (sortie d'outil ou ligne lue ce tour-ci, avec fichier:ligne), INFÉRENCE
  (marquée) et HYPOTHÈSE. Une absence s'écrit "non trouvé dans <périmètre>", jamais "n'existe pas".
- Ne devine ni API, ni version, ni drapeau, ni nom de paquet : vérifie dans le code ou la doc.
- Quand une décision revient à Victor, présente 2 à 4 options avec une recommandation et
  l'effet de chacune en une ligne, et explique le jargon en une phrase. Il décide vite sur
  des choix concrets.

## Livrable (dans le chat, rien d'écrit sur disque)

1. Verdict en une phrase : PRÊT, PRÊT SOUS CONDITIONS (liste), ou PAS PRÊT.
2. Erreurs factuelles : tableau (affirmation, fichier du document, ce que dit le code avec
   chemin:ligne, correction proposée).
3. Trous et branchements oubliés, regroupés par dépôt, bloquants en premier.
4. Contradictions internes.
5. Avis sur le plan de PR et sur le verrou STOP.
6. Avis lot par lot : taille, critères, dépendances, exécutant conseillé.
7. Protocole d'orchestration proposé.
8. Avis de sécurité sur le partage de position, avec ce que tu durcirais.
9. Décisions à trancher par Victor (choix multiples, défaut recommandé).
10. Ce que tu n'as pas pu vérifier, et pourquoi.

Termine par la liste exacte des corrections à apporter à docs/live-events avant
l'implémentation (fichier, section, texte à changer). Tu ne les appliques pas.
```
