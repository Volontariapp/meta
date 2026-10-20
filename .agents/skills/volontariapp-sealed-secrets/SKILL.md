---
name: volontariapp-sealed-secrets
description: "Playbook opérationnel pas-à-pas pour générer, sceller et déployer un secret chiffré asymétrique (kubeseal) dans le cluster K3s."
type: Playbook
title: Gestion des Secrets Scellés GitOps (kubeseal)
tags: [sealed-secrets, kubeseal, security, kubernetes, k3s, gitops, playbook]
status: stable
paths:
  - "deploy/infrastructure/security/sealed-secrets/**"
  - "deploy/apps/overlays/prod/**"
mesh_keys:
  - sealedsecret
  - kubeseal
generated:
  by: claude-code/agent
  at: "2026-10-12T12:02:00Z"
verified:
  - by: "human:agent"
    at: "2026-10-12T14:02:00Z"
    digest: 9c2d3e4f5a6b7c8d
  - by: claude-code/agent
    at: "2026-10-12T12:03:25Z"
    digest: e072979af423343f
  - by: claude-code/agent
    at: "2026-10-19T20:12:10Z"
    digest: 3b98fe28c7362101
  - by: claude-code/agent
    at: "2026-10-19T20:14:19Z"
    digest: 2b94b6c4a16a0340
  - by: claude-code/agent
    at: "2026-10-21T13:01:48Z"
    digest: f8afcd1670a2bee3
sources:
  - id: datadog-doc
    kind: local_file
    resource: deploy/infrastructure/security/sealed-secrets/DATADOG_KEYS.md
    title: Procédure de chiffrement Datadog
  - id: datadog-sealed
    kind: local_file
    resource: deploy/infrastructure/security/sealed-secrets/datadog-keys-sealed.yaml
    title: SealedSecret exemple (datadog-keys)
  - id: kustomize-prod
    kind: local_file
    resource: deploy/apps/overlays/prod/kustomization.yaml
    title: Overlay prod Kustomize
---

# Gestion des Secrets Scellés GitOps (kubeseal)

## Quand utiliser ce playbook

Utiliser ce playbook pour toute création, modification ou rotation d'un secret sensible en environnement Kubernetes déployé par ArgoCD :
- Clés d'API externes (Datadog, services tiers)[^datadog-doc].
- Mots de passe et identifiants de bases de données de production.
- Tokens JWT, secrets de signature ou certificats TLS privés.
- Identifiants de registre de conteneurs (`ghcr-sealed-secret.yaml`)[^kustomize-prod].

---

## Règles d'or de sécurité

1. **Zéro secret en clair dans Git** : Aucun fichier contenant un `kind: Secret` standard avec des clés en clair (en texte brut ou en base64) ne doit être commité. Seuls les `kind: SealedSecret` chiffrés asymétriquement sont autorisés[^datadog-sealed].
2. **Éphémérité stricte du fichier source** : Le fichier temporaire généré lors du dry-run local doit être supprimé immédiatement après l'exécution de `kubeseal`.
3. **Scellement contextuel strict (Strict Scope)** : Par défaut, un `SealedSecret` est scellé cryptographiquement pour un `name` et un `namespace` précis. Modifier le nom ou le namespace dans le YAML après chiffrement rend le secret indéchiffrable par le contrôleur.

---

## Procédure pas-à-pas

### Étape 1 : Récupération du certificat public du cluster (si nécessaire)

Si l'on opère hors du cluster ou que l'on souhaite chiffrer offline :
```bash
kubeseal --fetch-cert \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system > pub-cert.pem
```

---

### Étape 2 : Génération du secret éphémère en local (Dry-Run)

Générer le secret standard en local sans jamais l'appliquer au cluster :

```bash
kubectl create secret generic <nom-du-secret> \
  --namespace <namespace-cible> \
  --from-literal=api-key="<VALEUR_SECRETE>" \
  --dry-run=client -o yaml > secret-temp.yaml
```

> [!CAUTION]
> Ne jamais faire de `git add` ou de commit à cette étape. `secret-temp.yaml` contient la valeur en clair.

---

### Étape 3 : Chiffrement asymétrique avec `kubeseal`

Utiliser `kubeseal` pour communiquer avec le contrôleur dans `kube-system` (ou utiliser le certificat public local)[^datadog-doc] :

```bash
kubeseal --controller-name=sealed-secrets \
  --controller-namespace=kube-system \
  --format=yaml < secret-temp.yaml > <nom-du-secret>-sealed.yaml
```

*(Ou hors ligne avec le certificat récupéré à l'Étape 1) :*
```bash
kubeseal --cert pub-cert.pem --format=yaml < secret-temp.yaml > <nom-du-secret>-sealed.yaml
```

Le fichier `<nom-du-secret>-sealed.yaml` généré est un manifest `kind: SealedSecret` dont le champ `spec.encryptedData` ne peut être déchiffré que par la clé privée du contrôleur résidant dans le cluster[^datadog-sealed].

---

### Étape 4 : Destruction immédiate du secret en clair

Supprimer immédiatement le fichier temporaire :

```bash
rm -f secret-temp.yaml
```

---

### Étape 5 : Intégration dans Kustomize

1. Déplacer le manifest scellé dans le répertoire cible du dépôt `deploy` :
   - Secrets d'infrastructure globale : `deploy/infrastructure/security/sealed-secrets/`[^datadog-doc].
   - Secrets applicatifs ou overlays de production : `deploy/apps/overlays/prod/<service>/` ou `deploy/apps/overlays/prod/`[^kustomize-prod].
2. Référencer le fichier scellé dans le `kustomization.yaml` correspondant :
   ```yaml
   # deploy/apps/overlays/prod/kustomization.yaml
   resources:
     - ../../base
     - ghcr-sealed-secret.yaml
     - <nom-du-secret>-sealed.yaml
   ```

---

### Étape 6 : Validation locale Kustomize et déploiement GitOps

1. Vérifier la validité de l'assemblage Kustomize :
   ```bash
   kubectl kustomize deploy/apps/overlays/prod
   ```
2. Committer et pousser la Pull Request sur le dépôt `deploy`.
3. Une fois mergé, ArgoCD synchronise le `SealedSecret`.
4. Le contrôleur Sealed Secrets dans `kube-system` intercepte la ressource et génère automatiquement le `Secret` Kubernetes standard déchiffré dans le namespace cible.
5. Vérifier le déchiffrement réussi dans le cluster :
   ```bash
   kubectl get sealedsecret <nom-du-secret> -n <namespace-cible>
   kubectl get secret <nom-du-secret> -n <namespace-cible>
   ```

---

## Checklist de validation

- [ ] Aucun secret en clair n'a été commité dans Git (`git status` et `gitleaks` vérifiés).
- [ ] Le fichier temporaire `secret-temp.yaml` a été supprimé immédiatement[^datadog-doc].
- [ ] Le manifest scellé est bien de type `kind: SealedSecret` (API `bitnami.com/v1alpha1`)[^datadog-sealed].
- [ ] Le `name` et le `namespace` du `SealedSecret` correspondent exactement à ceux requis par le consommateur.
- [ ] Le fichier est déclaré dans la liste `resources` du `kustomization.yaml` approprié[^kustomize-prod].
- [ ] `kubectl kustomize` s'exécute sans erreur sur l'overlay.

---

## Références

[^datadog-doc]: deploy/infrastructure/security/sealed-secrets/DATADOG_KEYS.md
[^datadog-sealed]: deploy/infrastructure/security/sealed-secrets/datadog-keys-sealed.yaml
[^kustomize-prod]: deploy/apps/overlays/prod/kustomization.yaml
