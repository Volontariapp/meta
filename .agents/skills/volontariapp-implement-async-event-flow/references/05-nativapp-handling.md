---
type: Playbook
title: "Deep-Dive : Étape 5 - Réception Client dans `nativapp`"
description: Étape détaillée de volontariapp-implement-async-event-flow.
tags: [async, outbox]
status: stable
generated:
  by: claude-code/claude-opus-5-5
  at: "2026-10-06T08:22:12Z"
sources:
  - id: client
    resource: nativapp/src/api/client.ts
    title: apiFetch (206 vers syncPendingBus)
  - id: fallback
    resource: npm-packages/packages/errors-nest/src/errors/common.errors.ts
    title: FALLBACK_ACTIVATED
  - id: ws
    resource: nativapp/src/hooks/useNotificationHandlers.ts
    title: Listeners WebSocket de nativapp
---

# Deep-Dive : Étape 5 - Réception Client dans `nativapp`

Ce document détaille la gestion du cycle de vie asynchrone côté client dans l'application mobile React Native `nativapp`.

---

## 1. Ce que reçoit réellement le client (vérifié le 2026-10-06)

Il n'y a pas de réponse « pending » générique. Deux cas seulement :

| Cas | Réponse HTTP | Côté `nativapp` |
| :--- | :--- | :--- |
| Écriture réussie (l'événement de domaine part par l'outbox) | 200 ou 201 avec l'entité | La mutation React Query reçoit l'entité ; le feedback final (succès ou échec de la saga) arrive ensuite par WebSocket[^ws] |
| Écriture en échec non client, job de fallback créé | **206** avec l'erreur `FALLBACK_ACTIVATED` (`PartialContentError`)[^fallback] | `apiFetch` émet `syncPendingBus.emit(true)` pour afficher l'état « synchronisation en attente »[^client] ; `eventApi.createEvent` renvoie `null` quand la réponse ne contient pas `event` |

Aucun `correlationId` n'est renvoyé au client dans le corps HTTP aujourd'hui : la corrélation Scatter-Gather vit dans `event_queue.correlation_id` et dans l'état de gather de `ws-service`.

---

## 2. Intégration Socket.io & React Query (code réel)

Les listeners ne sont **pas** posés par mutation : ils sont centralisés dans `useNotificationHandlers(socket, showNotification)` (`nativapp/src/hooks/useNotificationHandlers.ts`)[^ws], monté une fois avec la socket.

```typescript
const handlePostCreated = (data: IPostCreatedWebsocketPayload): void => {
  notifyRef.current(
    data.isEmitter === true ? 'Votre post a été créé avec succès !' : "Un nouveau post vient d'être publié !",
  );
};

const handleFallbackDeleteTag = (data: IFallbackDeleteTagWebsocketPayload): void => {
  syncPendingBus.emit(false); // fin de l'état « synchronisation en attente » ouvert par le 206
  notifyRef.current(data.status !== 'FAILED' ? 'La suppression de votre tag a été synchronisée.' : 'La suppression de votre tag a échoué.');
};

socket.on(WebsocketMessagingType.POST_CREATED, handlePostCreated);
socket.on(WebsocketMessagingType.FALLBACK_DELETE_TAG, handleFallbackDeleteTag);
```

Règles observées :
- Chaque payload est typé par son interface `I*WebsocketPayload` de `@volontariapp/messaging` ; jamais de `any`.
- `isEmitter` distingue l'auteur (`notifyUser`) des autres utilisateurs (`broadcastExcept`) : un même événement produit deux messages.
- Les événements `FALLBACK_*` ferment l'état ouvert par un 206 (`syncPendingBus.emit(false)`), en succès comme en échec (`status: 'FAILED'`).
- Un nouvel événement WebSocket = un type dans `WebsocketMessagingType`, son payload dans `WebsocketEventRegistry` (`messaging`, règle du STOP), son émission dans `ws-service`, puis un handler et un `socket.on` ici, avec l'invalidation React Query correspondante.

---

## 3. Gestion de la Déconnexion Réseau (Offline Resilience)

En environnement mobile (métro, perte de 4G) :
- Si la connexion WebSocket tombe pendant l'exécution du post-processor :
  - Dès la reconnexion de la socket, `ws-service` et Socket.io rétablissent la session.
  - En cas de perte définitive de l'événement socket, l'application effectue un `refetch` lors du retour au premier plan (`focusManager.setFocused(true)` dans TanStack Query).

[^ws]: Listeners WebSocket de nativapp
[^fallback]: FALLBACK_ACTIVATED
[^client]: apiFetch (206 vers syncPendingBus)
