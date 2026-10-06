# Implement Async Job Flow

Guide pas-à-pas pour concevoir, émettre et consommer un Job d'arrière-plan (BullMQ, BaseWorker, IJobHandler, job_audit loop et Fallbacks).

## Concepts

- [SKILL.md](/volontariapp-implement-async-job-flow/SKILL.md) - point d'entrée de la skill
- [Deep-Dive : Étape 1 - Contrats de Jobs dans `messaging`](/volontariapp-implement-async-job-flow/references/01-job-messaging-contracts.md) - Étape détaillée de volontariapp-implement-async-job-flow.
- [Deep-Dive : Étape 2 - Émission de Jobs & Fallbacks](/volontariapp-implement-async-job-flow/references/02-emitting-jobs-and-fallbacks.md) - Étape détaillée de volontariapp-implement-async-job-flow.
- [Deep-Dive : Étape 3 - Workers & Handlers dans `workers-runners`](/volontariapp-implement-async-job-flow/references/03-worker-and-handlers.md) - Étape détaillée de volontariapp-implement-async-job-flow.
- [Deep-Dive : Étape 4 - La Boucle d'Audit et le SQL Trigger](/volontariapp-implement-async-job-flow/references/04-audit-loop-and-cleanup.md) - Étape détaillée de volontariapp-implement-async-job-flow.

## Scripts

- [`job_catalogue.py`](/volontariapp-implement-async-job-flow/scripts/job_catalogue.py) - Catalogue des jobs : producteurs (withFallback, createJob) et handlers (jobType) lus dans le code.

Historique : [log.md](/volontariapp-implement-async-job-flow/log.md)
