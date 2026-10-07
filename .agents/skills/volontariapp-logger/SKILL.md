---
name: volontariapp-logger
description: "Modifier ou utiliser @volontariapp/logger : masquage des données personnelles (clés, motifs, configuration), champs trace_id / dd.trace_id / dd.span_id injectés depuis le span OpenTelemetry actif, pièges de compatibilité (React Native, ordre des champs JSON)."
type: Agent Skill
title: "Logger partagé : masquage et corrélation de traces"
tags: [logger]
status: stable
paths:
  - "npm-packages/packages/logger/**"
mesh_keys:
  - "@volontariapp/logger"
  - Masker
generated:
  by: claude-code/agent
  at: "2026-10-07T09:33:37Z"
verified:
  - by: claude-code/agent
    at: "2026-10-07T09:33:37Z"
  - by: claude-code/agent
    at: "2026-10-07T09:33:46Z"
    digest: 86278baab7297a03
  - by: claude-code/agent
    at: "2026-10-07T09:33:57Z"
    digest: 86278baab7297a03
sources:
  - id: masking
    resource: npm-packages/packages/logger/src/masking.ts
    title: "Masker (clés, motifs, récursion)"
  - id: trace
    resource: npm-packages/packages/logger/src/trace-context.ts
    title: getTraceFields (format Datadog)
---

# Logger partagé : masquage et corrélation de traces

## Quand utiliser cette skill

Modifier ou utiliser @volontariapp/logger : masquage des données personnelles (clés, motifs, configuration), champs trace_id / dd.trace_id / dd.span_id injectés depuis le span OpenTelemetry actif, pièges de compatibilité (React Native, ordre des champs JSON).

## Règles

- **Masquage actif par défaut** : `Logger` masque métadonnées, paramètres positionnels, détails d'erreur et message avant sérialisation (JSON et texte). Clés par fragment, sans casse ni `-`/`_` (`x-internal-token`, `refresh_token`, `userEmail` sont masqués), motifs email, JWT et `Bearer` dans les chaînes. Sur-masquer (`tokenCount`) est assumé : mieux vaut perdre un détail qu'une donnée personnelle[^masking].
- **Configuration** : `new Logger({ masking: { keys, patterns, replacement } })` ajoute aux défauts (ne les remplace pas), `masking: false` désactive. Un motif sans drapeau `g` est converti en global par `Masker`[^masking].
- **Pas de mutation, pas de crash** : `Masker` renvoie une copie, gère tableaux, instances de classe, erreurs et cycles (`[Circular]`). Une référence partagée non circulaire n'est pas un cycle (ancêtres suivis dans un `WeakSet`)[^masking].
- **Corrélation de traces** : en format JSON uniquement, `trace_id` (hex), `dd.trace_id` (64 bits de poids faible, décimal) et `dd.span_id` (décimal) viennent du span actif via `@opentelemetry/api`. Ils sont écrits après les métadonnées, l'appelant ne peut pas les écraser. Aucune dépendance au SDK : sans span, aucun champ[^trace].
- **Compatibilité** : le logger sert aussi React Native et NestJS. Ne pas y ajouter de dépendance Node-only ni le SDK OpenTelemetry.
- **Tests** : `@opentelemetry/api` sans gestionnaire de contexte ne propage rien ; les specs espionnent `trace.getActiveSpan` avec `trace.wrapSpanContext(createSpanContext())` (`src/test/factories/span-context.factory.ts`). Les erreurs passent par `console.error`, pas `console.log`.
- Toute modification suit la règle du STOP de `volontariapp-shared-npm-package-change` : le changement de comportement par défaut touche tous les consommateurs au bump.

## Références

- [Leçons apprises](/volontariapp-logger/references/lessons.md)

## Scripts

- Lint hors workspace (`yarn lint` échoue, eslint n'est installé que pour `eslint-config`) : depuis `npm-packages/packages/logger`, `node ../../node_modules/eslint/bin/eslint.js src/`.
