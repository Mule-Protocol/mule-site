# Mascotte Unit M-1

La source approuvée (corps V1, tête V4) est conservée intégralement dans `reference/mascot/`. Les deux fichiers du générateur sont copiés sans modification dans `src/assets/mascot/source/`. Aucun contour n'a été redessiné et aucune pose n'a été ajoutée.

## Régénération

```sh
npm ci
npm run mascot:build
npm test
npm run build
```

`build-mascot.mjs` copie le générateur CommonJS dans `artifacts/mascot/generator/`, puis y exécute `node build.js <dossier-absolu>`. Ainsi, le `final.html` produit par le générateur ne pollue pas les sources. Il prépare ensuite les SVG optimisés, les CSS de pose, les modules HTML/PNG, les deux silhouettes raster du canvas et les quatre icônes. `build-mascot-brand.mjs` met à jour le logo, l'illustration du dossier et les cartes de partage.

La source originale doit rester intacte. Pour une future pose autorisée, ajouter une entrée à `POSES` dans une copie de travail du générateur, composée uniquement de rotations/translations des groupes existants (`legs`, `chassis`, `neck`, `head`, `ears`, `tail`, `crateDy`, `lidOpen`). Ajouter l'export correspondant au tableau de `build.js`, puis régénérer et comparer visuellement. Ne jamais modifier les chemins pour créer une pose. Documenter toute nouvelle pose dans la review.

## Groupes et pivots

Repère : 300 × 240. Les coordonnées sont celles du générateur fourni.

| Groupe | Pivot / contenu |
| --- | --- |
| `chassis` | corps, caisse, cou/tête, queue et pattes ; transformation globale de la pose |
| `body` | carrosserie chanfreinée, `status-led` |
| `crate` | `crate-box` et `crate-lid` ; couvercle (96, 70) |
| `lock` | cadenas présent dans la pose `locked` |
| `neck-head` | (216, 98) |
| `head` | (238, 74) ; `eye` (266, 72) |
| `antenna-l` / `antenna-r` | bases (239, 56) / (257, 56), pointes `.tip` |
| `tail` | (64, 112) |
| `leg-fl` | hanche (202, 142), tibia `.shin` (210, 176) |
| `leg-bl` | hanche (88, 142), tibia `.shin` (80, 176) |
| `leg-fr` | hanche (216, 142), tibia `.shin` (224, 176), côté opposé |
| `leg-br` | hanche (104, 142), tibia `.shin` (98, 176), côté opposé |

Les attributs `data-pivot-*`, IDs et classes d'origine restent dans les SVG optimisés. Chaque insertion HTML reçoit un préfixe d'ID (`hero-`, `lc-load-`, `static-0-`, `dossier-`, `patch-`…) pour éviter les doublons. Les classes `m1-chassis`, `m1-eye`, `m1-leg-fl`, etc. permettent les sélections CSS indépendamment du préfixe.

## Couleurs et CSP

- Encre : `#0E0E0E`.
- Surface : `#E9E8E3`.
- Signal : `#FF4F00`.
- Pattes opposées : `.m1-far { opacity: .55 }`.
- Fond du faisceau : `.m1-beam-fill { opacity: .14 }`.

SVGO 4.1.0 utilise une liste explicite de plugins, sans conversion des chemins, arrondi des coordonnées, suppression d'IDs ni fusion des groupes. Les `opacity` et transformations de pose deviennent des classes CSS. Les transformations CSS utilisent `transform-box: view-box` et les pivots SVG en pixels. Charger `poses.css` avec les SVG optimisés : ils dépendent de cette feuille externe. Référence de configuration : [documentation officielle SVGO](https://svgo.dev/docs/plugins/).

`mascot.css` ajoute les animations de marche (hanche et genou), clignement, cadenas, faisceau et couvercle, toutes en `steps()`. Le bouton global et `prefers-reduced-motion` les neutralisent ; les poses statiques restent lisibles. La translation de la caméra mobile conserve le fonctionnement existant, avec une marge supérieure supplémentaire pour le couvercle ouvert.

Les SVG bruts du générateur ne sont utilisés qu'en entrée privée de Sharp et du moteur OG pour fabriquer des PNG : leurs attributs de présentation ne sont jamais insérés dans une page HTML. Les fichiers PNG du canvas passent par Vite (URL hachée). Les pages `/m/*` chargent `/brand/mascot-poses.css`, sans style ni script inline. Aucun assouplissement de CSP.

## Surfaces

- Héros : pose `locked`, marche animée, annotations préservées et repositionnées.
- Cycle : `load`, `locked`, `walk`, `scan`, `delivered`, cinq copies statiques accessibles identiques.
- Canvas, page de mission et OG : `delivered` ou `refuse`, suivant l'issue.
- Dossier : pose `locked`, textes et annotations conservés.
- Logo : tête fournie, mot-symbole existant conservé. Le dossier utilise le header partagé ; il n'avait plus de copie locale du logo dans `src/content/dossier.html`.
- Favicon et icônes : fichier fourni `unit-m1-favicon.svg`.
- Partage : carte du site avec pose `locked` ; carte du dossier avec tête dans l'espace libre inférieur droit. La carte du dossier précédente ne comportait pas de mascotte. Tous les pixels des textes existants sont conservés. Les cartes antérieures sont archivées dans `reference/brand-before-mascot/` pour une régénération reproductible.

## Contrôles reproductibles

```sh
node scripts/mascot-qa.mjs URL OUTPUT
node scripts/mascot-captures.mjs URL OUTPUT
node scripts/lcp-series.mjs URL_IMMUABLE OUTPUT
```

Les tests unitaires comparent les éléments et attributs géométriques des onze SVG aux références, les générateurs byte à byte et les pages de mission. Le contrôle navigateur compare les huit poses rasterisées avant/après, vérifie les cadres aux cinq étapes, les doublons d'IDs, le HTML sans code inline et les débordements. Les tests existants du cycle et des six écussons complètent ces preuves. Voir `QA-MASCOT.md` pour les résultats et limites de cette livraison.
