---
name: Trace Async Flow
description: How to follow a request end-to-end across front, gateway, microservice, outbox, workers, and post-processors when debugging an asynchronous behavior.
---

# Trace Async Flow

No microservice pushes directly to Redis. Every async side-effect goes through the Transactional Outbox pattern, across up to 3 repos:

```
MS (ms-<domain>)
  → jobs_outbox table (status: Pending)
  → outbox-<domain> runner (outbox-runners repo) polls with FOR UPDATE SKIP LOCKED, pushes to BullMQ queue
  → worker-<domain> runner (workers-runners repo) consumes the job, writes job_audit (working/done/failed)
  → job_audit SQL trigger writes event_outbox
  → outbox-<domain> runner picks up event_outbox, pushes to a Redis Stream
  → post-processor (post-processors-runner repo) consumes the stream
```

## Debugging a stuck or missing async effect

1. Identify the domain (`post`/`user`/`social`/`event`) — each has its own `ms-<domain>`, `outbox-<domain>`, `worker-<domain>`, and post-processor.
2. Check `jobs_outbox` in the MS's Postgres — if the row is stuck `Pending`, the `outbox-<domain>` runner (in `outbox-runners`) isn't polling/pushing.
3. Check `job_audit` — if there's no row, the job never reached `workers-runners`; if it's `failed`, read the handler in `workers-runners/worker-<domain>/src/handlers/`.
4. Check `event_outbox` — this only gets a row after `job_audit` reaches a terminal state (SQL trigger). No row here means the worker never audited completion.
5. If `event_outbox` has a row but the post-processor never acted, the Redis Stream push (via `outbox-<domain>`) or the post-processor consumer (`post-processors-runner`) is the suspect.

## Never do

- Never assume a microservice pushes to Redis directly — always trace through `jobs_outbox`/`event_outbox` first.
- Never debug a `worker-<domain>` in isolation without checking whether `outbox-<domain>` actually delivered the job — most "worker bugs" are actually outbox delivery bugs.
