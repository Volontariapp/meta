---
name: Proto Contract Evolution
description: Workflow for changing a .proto contract in proto-registry without breaking gRPC consumers across microservices.
---

# Proto Contract Evolution

`proto-registry` defines the gRPC contracts under `proto/volontariapp/{post,user,social,event,common}` consumed by `api-gateway` and the matching `ms-*` service via generated code (`buf.gen.yaml`).

## Before editing a `.proto` file

1. Identify which services consume the message/RPC: grep the domain package under `npm-packages/packages/domain-<domain>` and the corresponding `ms-<domain>` and `api-gateway` for the generated type name.
2. Run `buf breaking` against the previous commit on `main` (config already enforces `STANDARD` lint rules in `buf.yaml`). Never skip this for a field removal, type change, or field renumbering.

## Making the change

- Additive changes (new optional field, new RPC) are safe to merge alone.
- Breaking changes (removed/renumbered field, renamed RPC, changed type) require, in the same PR set:
  - The `proto-registry` change.
  - The consuming `ms-<domain>` update (and `api-gateway` if the gateway maps the field).
  - A note on the rollout order — since services deploy independently, a breaking field removal must ship to consumers first, `proto-registry` removal last.

## Never do

- Never renumber an existing field to "clean up" the schema — it silently breaks wire compatibility for any service not redeployed yet.
- Never merge a `.proto` change without checking `buf breaking` output first.
