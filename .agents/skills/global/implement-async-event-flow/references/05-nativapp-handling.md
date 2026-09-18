# Deep-Dive : Étape 5 - Réception Client dans `nativapp`

Ce document détaille la gestion du cycle de vie asynchrone côté client dans l'application mobile React Native [`nativapp`](file:///Users/victoragahi/Developer/meta/nativapp).

---

## 1. Le Contrat HTTP 206 "Partial Content"

Pour toute action asynchrone nécessitant un traitement Outbox en arrière-plan :
1. L'API Gateway et le microservice répondent immédiatement avec un statut **`HTTP 206 Partial Content`**.
2. Le body de réponse fournit un **`correlationId`** et l'état initial :
   ```json
   {
     "status": "pending",
     "correlationId": "8f3b2c1a-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
     "message": "Opération en cours de traitement"
   }
   ```
3. L'application mobile ne bloque pas l'écran mais active un état visuel "en attente" (Optimistic UI ou Spinner).

---

## 2. Intégration Socket.io & React Query (TanStack Query)

Dans un hook ou un composant React Native de `nativapp` :

```typescript
import { useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { WebsocketMessagingType } from '@volontariapp/messaging';
import { useWebSocket } from '@/core/providers/websocket.provider';
import { eventApi } from '@/api/event.api';

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { socket } = useWebSocket();

  const mutation = useMutation({
    mutationFn: (formData: CreateEventFormData) => eventApi.createEvent(formData),
    onSuccess: (response) => {
      const { correlationId } = response.data;

      // Écoute ponctuelle de la notification de fin
      const handleEventFinished = (payload: any) => {
        if (payload.correlationId === correlationId) {
          socket.off(WebsocketMessagingType.EVENT_CREATED, handleEventFinished);

          if (payload.status === 'success') {
            // Invalidation intelligente du cache
            queryClient.invalidateQueries({ queryKey: ['events'] });
            // Notification visuelle
            toast.show('Événement créé avec succès !', { type: 'success' });
          } else {
            toast.show(payload.message ?? 'Échec de la création', { type: 'danger' });
          }
        }
      };

      socket.on(WebsocketMessagingType.EVENT_CREATED, handleEventFinished);

      // Sécurité : Timeout de déconnexion après 15 secondes
      setTimeout(() => {
        socket.off(WebsocketMessagingType.EVENT_CREATED, handleEventFinished);
      }, 15000);
    },
  });

  return mutation;
}
```

---

## 3. Gestion de la Déconnexion Réseau (Offline Resilience)

En environnement mobile (métro, perte de 4G) :
- Si la connexion WebSocket tombe pendant l'exécution du post-processor :
  - Dès la reconnexion de la socket, `ws-service` et Socket.io rétablissent la session.
  - En cas de perte définitive de l'événement socket, l'application effectue un `refetch` lors du retour au premier plan (`focusManager.setFocused(true)` dans TanStack Query).
