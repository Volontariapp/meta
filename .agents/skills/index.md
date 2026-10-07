# Skills agentiques Volontariapp

Bundle OKF v0.2. Chaque skill est un sous-bundle : `SKILL.md` (point d'entrée), `references/` (concepts),
`scripts/` (outils exécutables), `index.md` et `log.md` (fichiers réservés OKF).
Le cycle de vie des skills est géré par [volontariapp-skill-evolution](/volontariapp-skill-evolution/SKILL.md).

| Skill | Domaine | Dernière vérification |
| :--- | :--- | :--- |
| [volontariapp-api-gateway](/volontariapp-api-gateway/SKILL.md) | API Gateway (REST vers gRPC) | 2026-10-06 |
| [volontariapp-ci-tools](/volontariapp-ci-tools/SKILL.md) | CI partagée et infra locale (ci-tools) | 2026-10-06 |
| [volontariapp-deploy-gitops](/volontariapp-deploy-gitops/SKILL.md) | Déploiement GitOps (deploy) | 2026-10-06 |
| [volontariapp-docx-reports](/volontariapp-docx-reports/SKILL.md) | Modification et relecture de documents Word DOCX | 2026-10-06 |
| [volontariapp-file-storage-flow](/volontariapp-file-storage-flow/SKILL.md) | File Storage Flow | 2026-10-07 |
| [volontariapp-grpc-microservice](/volontariapp-grpc-microservice/SKILL.md) | Anatomie d'un microservice gRPC | 2026-10-06 |
| [volontariapp-implement-async-event-flow](/volontariapp-implement-async-event-flow/SKILL.md) | Implement Async Event Flow | 2026-10-06 |
| [volontariapp-implement-async-job-flow](/volontariapp-implement-async-job-flow/SKILL.md) | Implement Async Job Flow | 2026-10-06 |
| [volontariapp-mesh-mcp](/volontariapp-mesh-mcp/SKILL.md) | mesh-mcp | 2026-10-06 |
| [volontariapp-proto-contract-evolution](/volontariapp-proto-contract-evolution/SKILL.md) | Proto Contract Evolution | 2026-10-06 |
| [volontariapp-shared-npm-package-change](/volontariapp-shared-npm-package-change/SKILL.md) | Shared NPM Package Change | 2026-10-06 |
| [volontariapp-skill-evolution](/volontariapp-skill-evolution/SKILL.md) | Évolution des skills (auto-apprentissage) | 2026-10-06 |
| [volontariapp-trace-async-flow](/volontariapp-trace-async-flow/SKILL.md) | Trace Async Flow | 2026-10-06 |

## Skills du plugin matt-pocock

Liens symboliques vers `.agents/plugins/matt-pocock/skills/` : listés ici, jamais modifiés par `evolve.py`.

| Skill | Usage |
| :--- | :--- |
| [ask-matt](/ask-matt/SKILL.md) | Ask which skill or flow fits your situation. |
| [code-review](/code-review/SKILL.md) | Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards (does the code follow this repo's documented coding standards?) and… |
| [codebase-design](/codebase-design/SKILL.md) | Shared vocabulary for designing deep modules. |
| [diagnosing-bugs](/diagnosing-bugs/SKILL.md) | Diagnosis loop for hard bugs and performance regressions. |
| [domain-modeling](/domain-modeling/SKILL.md) | Build and sharpen a project's domain model. |
| [git-guardrails-claude-code](/git-guardrails-claude-code/SKILL.md) | Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute. |
| [grill-me](/grill-me/SKILL.md) | A relentless interview to sharpen a plan or design. |
| [grill-with-docs](/grill-with-docs/SKILL.md) | A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go. |
| [grilling](/grilling/SKILL.md) | Grill the user relentlessly about a plan, decision, or idea. |
| [handoff](/handoff/SKILL.md) | Compact the current conversation into a handoff document for another agent to pick up. |
| [implement](/implement/SKILL.md) | Implement a piece of work based on a spec or set of tickets. |
| [improve-codebase-architecture](/improve-codebase-architecture/SKILL.md) | Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick. |
| [migrate-to-shoehorn](/migrate-to-shoehorn/SKILL.md) | Migrate test files from `as` type assertions to @total-typescript/shoehorn. |
| [prototype](/prototype/SKILL.md) | Build a throwaway prototype to answer a design question. |
| [research](/research/SKILL.md) | Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. |
| [resolving-merge-conflicts](/resolving-merge-conflicts/SKILL.md) | Use when you need to resolve an in-progress git merge/rebase conflict. |
| [setup-matt-pocock-skills](/setup-matt-pocock-skills/SKILL.md) | Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. |
| [setup-pre-commit](/setup-pre-commit/SKILL.md) | Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. |
| [tdd](/tdd/SKILL.md) | Test-driven development. |
| [teach](/teach/SKILL.md) | Teach the user a new skill or concept, within this workspace. |
| [to-questionnaire](/to-questionnaire/SKILL.md) | Turn a decision you can't fully answer into a questionnaire for someone else to fill in. |
| [to-spec](/to-spec/SKILL.md) | Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed. |
| [to-tickets](/to-tickets/SKILL.md) | Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as tex… |
| [triage](/triage/SKILL.md) | Move issues and external PRs through a state machine of triage roles, categorise, verify, grill if needed, and write agent-ready briefs. |
| [wait-what](/wait-what/SKILL.md) | Stop. |
| [wayfinder](/wayfinder/SKILL.md) | Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way… |
| [wizard](/wizard/SKILL.md) | Generate an interactive bash wizard that walks a human through steps only they can perform. |
| [writing-for-agents](/writing-for-agents/SKILL.md) | Writing documents for agents. |

Historique global : [log.md](/log.md)
