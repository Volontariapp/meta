# Historique

## 2026-10-13

- **Vérification** - confidence explicite sur les 12 motifs topic (7 exact, 5 heuristic), rechargement du démon à la requête (claude-code/agent)

## 2026-10-12

- **Vérification** - Mise à jour mesh_keys avec scaffold-microservice (claude-code/agent)
- **Vérification** - Mise à jour suite à l'ajout des playbooks du Lot 2 (claude-code/agent)
- **Vérification** - Retypage OKF: type Tool Reference (claude-code/agent)
- **Vérification** - toml: ajout de la cle mesh rex generee pour la skill de verification (claude-code/agent)
- **Vérification** - relue apres questions QA causalmesh, aucune regle nouvelle (claude-code/agent)
- **Vérification** - lecons: pas de rechargement a chaud du demon, routes HTTP non interrogeables par chemin (claude-code/agent)
- **Leçon** - Les routes HTTP ne sont pas interrogeables par chemin (pitfall) (claude-code/agent)
- **Leçon** - meshd ne recharge pas mesh-mcp.toml a chaud (pitfall) (claude-code/agent)
- **Vérification** - mesh-mcp.toml: audit 7.1.3, exclusion docx, pattern ws-event-mapping-producer; skill relue, inchangee (claude-code/agent)

## 2026-10-11

- **Vérification** - mesh-mcp.toml stable apres regeneration (claude-code/agent)
- **Vérification** - mesh_keys sans doublon de casse (claude-code/agent)
- **Vérification** - Enregistrement automatique de la skill volontariapp-user-account-deletion (index AGENTS.md, mesh-mcp.toml), mesh_keys declares (claude-code/agent)

## 2026-10-07

- **Vérification** - mesh-mcp.toml: index regenere pour la nouvelle skill volontariapp-logger (cles @volontariapp/logger, Masker), aucun changement de regle (claude-code/agent)

## 2026-10-06

- **Vérification** - Mise à jour mesh-mcp.toml avec la nouvelle skill docx (claude-code/agent)
- **Vérification** - table [engines.policy.skills] régénérée : clés de volontariapp-ci-tools (claude-code/claude-opus-5-5)
- **Vérification** - paramètres réels des 6 outils (claude-code/claude-opus-5-5)
- **Vérification** - mesh-mcp.toml 7.0.19 : 6 motifs causaux (jobs, saga, trigger SQL, push WebSocket, listeners nativapp), routage des skills par sujet, alias docs corrigés, .agents indexé (claude-code/claude-opus-5-5)
- **Leçon** - Une clé skill égale à un nom d'outil masque les autres (pitfall) (claude-code/claude-opus-5-5)
- **Leçon** - Un alias search_docs remplace le mot (pitfall) (claude-code/claude-opus-5-5)
- **Leçon** - file_pattern *.ts matche toute sous-chaîne ts (pitfall) (claude-code/claude-opus-5-5)
- **Vérification** - engines.policy.skills repointé vers les skills volontariapp-* (claude-code/claude-opus-5-5)
- **Vérification** - migration au format OKF v0.2 (setup agentique repris d'Aureum, multi-repo) (claude-code/claude-opus-5-5)
