# Historique

## 2026-10-27

- **Vérification** - WsProxyMiddleware: un token expire ou invalide (InternalServerError de JwtService) est converti en 401 au lieu d'un crash 500 (claude-code/agent)

## 2026-10-21

- **Vérification** - use fixed golden personas length for persona indexing (claude-code/agent)
- **Vérification** - enrich seed with 500 events, 500 posts, 500 users and materials with quantities (claude-code/agent)
- **Vérification** - use os.tmpdir for seed images cache (claude-code/agent)
- **Vérification** - support system seed v2 modular endpoints and sub-services (claude-code/agent)

## 2026-10-17

- **Vérification** - ticket 5.11: coverUrl/coverStatus et validation sur les evenements; relu (claude-code/agent)
- **Leçon** - Photo d'evenement: coverUrl calculee seulement si READY (rule) (claude-code/agent)

## 2026-10-16

- **Vérification** - mapping du statut de media accepte les enums gRPC en noms; lecon ajoutee (claude-code/agent)
- **Leçon** - Les enums gRPC arrivent en NOMS dans la gateway (enums: String), pas en nombres (pitfall) (claude-code/agent)
- **Vérification** - ticket 5.7: PostDTO.fromPost, PostMediaUrlBuilder, forPostMedia, validateurs fileIds et idempotencyKey; exemple de DTO du playbook (coverFileId) reste illustratif (claude-code/agent)
- **Leçon** - URL des medias de post: PostMediaUrlBuilder, PostDTO.fromPost, URL seulement si READY (rule) (claude-code/agent)
- **Vérification** - api-gateway: avatarFileId relaye, avatarUrl via PublicFileUrlService, config storage.publicBaseUrl, domain-storage 0.12.0 (claude-code/agent)
- **Leçon** - storage.publicBaseUrl: valeur locale uniquement, jamais dans default ou production (pitfall) (claude-code/agent)
- **Leçon** - Exposer une URL de fichier public: UserAvatarUrlBuilder et PublicFileUrlService (rule) (claude-code/agent)
- **Vérification** - api-gateway: avatarFileId relaye dans UpdateUserRequestDTO, factory de test utilisateur, blocage domain-storage consigne; aucune regle du playbook modifiee (claude-code/agent)
- **Leçon** - avatarFileId se relaie par UpdateUserRequestDTO.toCommand (rule) (claude-code/agent)
- **Leçon** - domain-storage: la racine ne se charge pas dans la gateway, seul /helpers (pitfall) (claude-code/agent)
- **Leçon** - La gateway renvoie les enums gRPC en noms, les types de contracts les declarent numeriques (pitfall) (claude-code/sonnet-5-5)
- **Vérification** - regles check-arch (un export class par fichier DTO, nom derive du fichier, DTO imbriques dans dto/common) (claude-code/sonnet-5-5)
- **Leçon** - check-arch: un seul export class par fichier dto, nom derive du fichier (rule) (claude-code/sonnet-5-5)
- **Vérification** - ajout du module storage (3 routes), config msStorageUrl, mapping 503 (claude-code/sonnet-5-5)
- **Leçon** - Brancher un nouveau microservice: msXxxUrl, erreurs gRPC brutes et 503 (pitfall) (claude-code/sonnet-5-5)
- **Leçon** - Les DTO de requete gateway implementent des Request partagees de @volontariapp/contracts (pitfall) (human:victor)

## 2026-10-14

- **Vérification** - Vérification DTO event coverFileId (agent:antigravity)

## 2026-10-13

- **Vérification** - enableShutdownHooks ajoute dans main.ts: aucune regle de la skill ne change (claude-code/agent)

## 2026-10-12

- **Vérification** - Utilisation du mock MockUserClientGrpc (claude-code/agent)
- **Vérification** - Refactoring en vrai playbook opérationnel séquentiel (claude-code/agent)

## 2026-10-11

- **Vérification** - use createMock in unit test (claude-code/agent)
- **Vérification** - map deleteMe to ActionSuccessResponseDTO (human:victor)

## 2026-10-07

- **Leçon** - Les DTO de mise a jour heritent des champs de creation (rule) (claude-code/agent)
- **Vérification** - Relu : factory e2e badge envoie idempotencyKey, DTO de mise a jour event et post n'heritent plus de idempotencyKey, coverFileId ni fileIds (updateMask), aucune regle modifiee (claude-code/agent)
- **Vérification** - Relu : scripts/seed/events.seeder.ts envoie idempotencyKey (contrat REST), aucune regle modifiee (claude-code/agent)
- **Leçon** - Le contrat REST impose idempotencyKey au client (rule) (claude-code/agent)
- **Vérification** - Relu : les DTO REST de api-gateway suivent les contrats storage (idempotencyKey obligatoire sur CreateEvent/CreatePost/CreateBadge, fileIds sur CreatePost, coverFileId/iconFileId optionnels, coverStatus sur EventResponseDTO). Le contrat REST impose idempotencyKey cote client. (claude-code/agent)

## 2026-10-06

- **Vérification** - contenu des CLAUDE.md des repos rapatrié (fiches par service, carte des routes), sources repointées vers le code (claude-code/claude-opus-5-5)
- **Vérification** - création depuis les CLAUDE.md des repos, vérifiée contre le code (2026-10-06) (claude-code/claude-opus-5-5)
- **Création** - squelette OKF généré par evolve.py new (claude-code/claude-opus-5-5)
- **Leçon** - Création de la skill (decision) (claude-code/claude-opus-5-5)
