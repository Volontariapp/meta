---
type: Concept
title: Anatomie OpenXML d'un fichier DOCX et préservation des styles
description: Structure interne d'un fichier Word .docx, gestion des runs textuels et pièges de sérialisation XML.
tags: [openxml, docx, xml, zip]
status: stable
generated:
  by: claude-code/agent
  at: "2026-10-06T11:15:27Z"
sources:
  - id: modify-script
    resource: .agents/skills/volontariapp-docx-reports/scripts/modify_docx.py
    title: Script modify_docx.py
---

# Anatomie OpenXML d'un fichier DOCX

Un fichier `.docx` est une archive ZIP standard contenant une arborescence de fichiers XML conforme au standard Office Open XML (ECMA-376).

## Structure de l'archive

- `word/document.xml` : Corps principal du texte, tableaux, conteneurs de paragraphes.
- `word/header*.xml` et `word/footer*.xml` : En-tetes et pieds de page (contenant eventuellement des metadonnees, trigrammes, numeros de page).
- `word/styles.xml` : Definitions des styles Word (Normal, Titre 1, En-tete tableau, etc.).
- `word/numbering.xml` : Definitions des listes a puces et numerotees.
- `[Content_Types].xml` et `_rels/.rels` : Tables de relation internes.

## Hierarchie des balises textuelles

Dans `document.xml` :
1. `<w:p>` : Represente un paragraphe (ou une ligne de cellule de tableau).
2. `<w:r>` : Represente un "run" (segment de texte partageant exactement le meme style : gras, italique, couleur, taille de police).
3. `<w:t>` : Nœud textuel contenant la chaine de caracteres brute.
   - Attribut `xml:space="preserve"` : Obligatoire si la chaine commence ou se termine par un espace, sous peine de voir Word tronquer les espaces lors du rendu.

## Le piege du morcellement multi-runs

Word morcelle frequemment une phrase ou un mot unique sur plusieurs balises `<w:t>` consecutives.
Exemple :
```xml
<w:r><w:t>d'autant plus confiant pour le reste a </w:t></w:r>
<w:r><w:t>termine</w:t></w:r>
<w:r><w:t>.</w:t></w:r>
```
Une recherche nave au sein de chaque `<w:t>` echoue a trouver "confiant pour le reste a termine".
La resolution consiste a concatener les runs a l'echelle du paragraphe `<w:p>`, identifier les bornes de l'expression, appliquer la modification sur le premier run concerne et vider ou tronquer les runs suivants recouverts par la substitution.

## Le piege de la corruption de namespaces (ns0 / ns1)

L'utilisation d'une re-serialisation globale via `xml.etree.ElementTree.tostring()` reecrit les prefixes de namespaces non declares (tels que `w14`, `w15`, `cx`, `mc:Ignorable`) sous la forme `ns0:`, `ns1:`. Word considere alors le fichier corrompu a l'ouverture.
Pour eviter toute alteration du reste du balisage, le script `modify_docx.py` opere par expression reguliere ciblee sur les blocs `<w:p>` et `<w:t>`, garantissant une conservation a 100% de la structure XML externe[^modify-script].
