# Historique

## 2026-10-19

- **Vérification** - Relu les secrets scelles ms-ranking produits par le wizard (ranking-sealed-secret.yaml, ms-ranking-password dans shared-infra/db-sealed-secret.yaml, ressource ajoutee a la kustomization de l'overlay) : conformes a la lecon deja consignee, aucun changement de skill (claude-code/agent)
- **Vérification** - Relu apres le ticket 1.4 (manifests ms-ranking dans la PR deploy #25, wizard de scellement, bumps de sous-modules) ; lecons ajoutees pour deploy-gitops et sealed-secrets (claude-code/agent)
- **Leçon** - Nouveau service : un wizard de scellement doit passer AVANT le merge de la PR deploy (pitfall) (claude-code/agent)

## 2026-10-12

- **Vérification** - Création du playbook de secrets scellés kubeseal (claude-code/agent)
- **Création** - squelette OKF généré par evolve.py new (claude-code/agent)
- **Leçon** - Création de la skill (decision) (claude-code/agent)
