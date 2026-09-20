---
name: Trace Async Flow
description: How to follow an asynchronous request end-to-end using analyze_impact and debug runtime bottlenecks.
---

# Trace Async Flow & Diagnostic Runtime

Dans Volontariapp, aucun microservice n'écrit directement dans Redis pour une mutation. Chaque effet de bord asynchrone traverse le **Transactional Outbox Pattern**, réparti sur jusqu'à 3 processus distincts :

```
ms-<domaine> 
  → jobs_outbox (Postgres, status: Pending)
  → outbox-<domaine> runner (Postgres FOR UPDATE SKIP LOCKED -> BullMQ Queue Redis)
  → worker-<domaine> runner (Consomme BullMQ, écrit dans job_audit)
  → SQL Trigger sur job_audit -> écrit dans event_outbox (status: pending)
  → outbox-<domaine> runner (Pousse event_outbox dans Redis Stream)
  → post-processor (post-processors-runner consomme le Stream, clôture la saga & déclenche WebSocket)
```

---

## 1. Étape 1 (Statique & Code) : Cartographie Instantanée via le Serveur MCP

Ne cherche JAMAIS manuellement dans les dossiers `outbox-runners`, `workers-runners` et `post-processors-runner` avec du `grep`.
Utilise en première intention l'outil MCP **`analyze_impact`** :

```json
// Vue aval (downstream) : voir tous les consumers, handlers et cascades d'un événement
analyze_impact({ "target": "USER_CREATED" })

// Vue amont (upstream) : voir ce qui déclenche un handler ou post-processor précis
analyze_impact({ "target": "UserCreatedPostProcessor" })
```
En $< 2\text{ms}$, l'outil te retourne le graphe causal exact : fichier émetteur, stream Redis, classe de post-processor, triade de saga (Commit / Rollback) et broadcast WebSocket.

---

## 2. Étape 2 (Dynamique & Runtime) : Diagnostiquer un Effet Bloqué en Base de Données

Si un flux fonctionne en code mais ne produit pas d'effet en exécution réelle (ex: un utilisateur est créé mais le profil social n'apparaît pas dans Neo4j) :

1. **Identifier le domaine** (`user`, `event`, `post`, `social`) — chaque domaine possède son microservice et ses daemons satellites dédiés.
2. **Vérifier `jobs_outbox` dans la base PostgreSQL du microservice :**
   - Si la ligne reste bloquée en statut `Pending`, le démon `outbox-<domaine>` ne scrute pas correctement ou n'arrive pas à contacter Redis.
3. **Vérifier `job_audit` dans la même base :**
   - S'il n'y a aucune ligne : le job n'est jamais arrivé au worker BullMQ.
   - Si la ligne est en statut `failed` : inspecter les logs du handler dans `workers-runners/worker-<domaine>/src/workers/handlers/`.
4. **Vérifier `event_outbox` dans la base :**
   - Cette table ne reçoit une entrée qu'après le passage de `job_audit` en état terminal via le **Trigger SQL PostgreSQL**.
   - Si aucune ligne n'apparaît, le trigger SQL ne s'est pas exécuté ou le worker n'a pas audité la complétion.
5. **Vérifier les Redis Streams :**
   - Si `event_outbox` est marqué comme traité mais que le post-processor n'a rien fait, le problème se situe au niveau de la connexion au Stream Redis ou du group de consommateurs dans `post-processors-runner`.

---

## 3. Règles d'Or

- [ ] Ne jamais supposer qu'un microservice pousse directement dans Redis : toujours vérifier la table outbox en base de données.
- [ ] Toujours utiliser `analyze_impact` pour comprendre la topologie causale avant de toucher au code d'un runner.
