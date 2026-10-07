# QA — Mascotte finale Unit M-1

## Livraison et périmètre

- Branche : `codex/mascot`, créée depuis `origin/main` à jour (`5038e02`, fusion de la PR #2).
- Commit d'intégration : `57205bb7a51dd951fbeb2abc26711c49d750312e` — SVG, animations, canvas, Functions, marque et tests.
- Le commit de preuves contient ce rapport et `docs/qa-mascot/` ; il ne modifie pas le code déployé mesuré ci-dessous.
- [PR #4 en brouillon](https://github.com/Mule-Protocol/mule-site/pull/4).
- [Préproduction immuable testée](https://8e443e93.mule-site.pages.dev).
- [Run CI du déploiement : succès](https://github.com/Mule-Protocol/mule-site/actions/runs/37651586641), [validation PR : succès](https://github.com/Mule-Protocol/mule-site/actions/runs/37651644859).
- Référence avant intégration : [préproduction de la passe précédente](https://df9c3e57.mule-site.pages.dev).
- Aucune fusion, production, modification DNS/domaine ni fonctionnalité de la mission M-1. `LAUNCHED = false`, `CONTRACT_ADDRESS = null`. CSP inchangée, sans `unsafe-inline`.

## Sources et occurrences remplacées

Les 15 fichiers du dossier fourni sont conservés byte à byte dans `reference/mascot/` : [manifest SHA-256](qa-mascot/source-copy.json). Les deux fichiers du générateur dans `src/assets/mascot/source/` sont identiques aux références. Aucun contour ni nouvelle pose. Les huit poses restent celles du propriétaire.

| Surface | Modification |
| --- | --- |
| `Hero.astro` | Ancien corps, tête, `leg-a` / `leg-b` et œil remplacés par les groupes fournis. Marche des cuisses/tibias, clignement œil/pointes, balayage et annotations conservés. |
| `Lifecycle.astro` et `site.ts` | Cinq poses dans `#lcMuleInner`, plus cinq copies statiques accessibles. Camera mobile légèrement remontée pour le couvercle ouvert. Leader de l'annotation d'inspection déplacé. |
| `console.ts` / `drawPatch` | Ancienne tête dessinée avec des primitives canvas remplacée par les poses `delivered` / `refuse`, rasterisées depuis le générateur puis servies sous URL Vite hachée. Textes/hexagones inchangés. |
| `mission-page.mjs` / `patchSilhouette` | Ancienne tête SVG remplacée par la pose correspondant à l'issue, avec CSS externe. |
| `functions/m/[id]/og.png.ts` | Même pose approuvée dans le moteur de rendu PNG. Formats d'identifiant, cache et en-têtes conservés. |
| `public/brand/` | Favicon fourni, icônes 32/180/192/512 et tête du logo. Mot-symbole MULE conservé. |
| `src/content/dossier.html` | Héros remplacé, annotations ajustées. Il n'existait plus de copie locale du logo : le dossier utilise le header partagé, mis à jour. |
| `public/images/site.png` | Nouvelle mascotte avec composition, texte et format 1200×630 conservés. |
| `public/images/dossier.png` | Ajout de la tête dans la zone libre inférieure droite ; la carte précédente n'avait pas de mascotte. Textes et composition conservés, 1200×630. |
| CSS | Anciens sélecteurs de pattes, corps, scan et pivots provisoires retirés. `mascot.css` utilise les pivots fournis. Le ticker est également passé de `linear` à `steps(120)` pour respecter la contrainte globale d'animation. |

Recherche dans `src/`, `public/`, `functions/` et `scripts/` : aucune occurrence active des anciens tracés `M17 20L11 5`, groupes `leg-a` / `leg-b` ou sélecteurs `.mule`. Les prototypes, références de marque précédentes et captures « avant » sont volontairement conservés hors des ressources du site.

Détails techniques et commandes : [MASCOT.md](MASCOT.md). L'optimisation conserve la géométrie, les IDs, classes et `data-pivot-*`. Les IDs HTML sont préfixés par instance pour éviter les doublons. Les attributs d'opacité deviennent des classes. Les seuls SVG bruts avec attributs de présentation sont les entrées privées des moteurs PNG, jamais du HTML servi.

## Vérifications

| Critère | Résultat et preuve |
| --- | --- |
| Géométrie approuvée | 8/8 poses : **0 canal de pixel différent** entre SVG original et SVG optimisé + CSS, à 600×480. [Comparaison](qa-mascot/integration/integration.json). |
| Tests et build | **17/17 tests**, build réussi, zéro erreur/avertissement Astro. Quatre simples suggestions CommonJS concernant les générateurs conservés sans modification. CI verte. `npm audit` : zéro vulnérabilité après sélection de SVGO 4.1.0. |
| Textes | Accueil et dossier : texte visible sans JS et tous les textes SVG/annotations identiques à la référence. [Comparaison](qa-mascot/text-comparison.json). |
| Débordement / IDs / CSP | **28 combinaisons** (7 pages × 4 largeurs) : aucun débordement, aucun ID dupliqué, aucun style/script inline dans le HTML servi. Pages `/`, `/dossier/`, `/legal/`, `/privacy/`, `/risks/`, mission réussie et refusée. [Preuve](qa-mascot/integration/integration.json). |
| Cadre du cycle | **80 mesures** : 5 étapes × 4 largeurs × 4 phases. Toutes les boîtes SVG restent à l'intérieur ; marge minimale de cadre 10,62 px. [Preuve](qa-mascot/integration/integration.json). |
| Mobile 360/375 | Annotations au moins **19 px** de hauteur rendue (CSS 16 px), seuil demandé 11 px. Mule lisible aux cinq étapes. [Mesures](qa-mascot/browser/browser-qa.json). |
| Pause/reprise | Les cinq étapes reprennent correctement, y compris après défilement pendant la pause. Aucun déplacement vers une autre étape. Vérifié aux quatre largeurs. [Mesures](qa-mascot/browser/browser-qa.json). |
| Mouvement réduit / sans JS | Zéro animation active en mouvements réduits ; cinq étapes accessibles et contenu lisible sans JavaScript. Focus visible du lien d'évitement. [Preuve](qa-mascot/browser/browser-qa.json). |
| Animations | Animations actives en `steps()` ; pivots CSS issus des sources, hanche et genou distincts. [Preuve](qa-mascot/integration/integration.json). |
| Jonction cycle/console | Aucun chevauchement aux quatre largeurs ; parcours continu de 511 positions au total, par pas de 8 px. Espace mobile final 72 px. [Preuve](qa-mascot/patches/report.json). |
| Six écussons | PNG 600×660 ; les 30 lignes de texte respectent la marge de 6 unités, minimum réel **7,5623 unités** au trait intérieur. Téléchargement activé au clavier dans le test. [Mesures](qa-mascot/patches/report.json). |
| OG et sécurité | Vrai PNG **1200×630** décodé, page valide 200, identifiant invalide 404, `noindex`, CSP stricte et cache OG conservés. [Image](qa-mascot/after/mission-og.png), [curl page](qa-mascot/headers/mission.txt), [curl image](qa-mascot/headers/mission-og.txt), [curl invalide](qa-mascot/headers/invalid.txt), [curl dossier](qa-mascot/headers/dossier.txt). |
| Erreurs / appels externes | Aucune erreur JavaScript et aucune requête externe dans le parcours cycle. [Journal](qa-mascot/browser/browser-qa.json). |

## Lighthouse mobile

Mesuré uniquement sur `https://8e443e93.mule-site.pages.dev` avec `node scripts/lcp-series.mjs`, trois passages par page, sans autre test navigateur en parallèle. Réseau réel vers Cloudflare Pages ; ralentissement mobile simulé Lighthouse, pas un téléphone physique. Aucun passage écarté.

| Page | Passage 1 : LCP / perf / a11y | Passage 2 | Passage 3 | Médiane LCP / perf / a11y |
| --- | --- | --- | --- | --- |
| / | 1765.8 ms / 96 / 100 | 1729.7 ms / 99 / 100 | 1696.7 ms / 99 / 100 | **1729.7 ms / 99 / 100** |
| /dossier/ | 1693.7 ms / 99 / 100 | 1747.8 ms / 99 / 100 | 1701.1 ms / 99 / 100 | **1701.1 ms / 99 / 100** |

**Seuils atteints sur les deux pages : médiane LCP < 2 000 ms, performance ≥ 90, accessibilité 100.**

[Série complète et détails de chaque passage](qa-mascot/lighthouse/series.json). Chaque sous-dossier contient le rapport Lighthouse JSON, le rapport HTML et son résumé.

## Captures avant / après

Captures Chromium, largeur indiquée, hauteur de viewport 900 px. Les captures de composants gardent toute leur hauteur ; la page de mission est capturée en entier. Animations figées pour comparer. Le fichier image OG conserve son format natif 1200×630 ; le favicon est agrandi à 512×512.

| Vue | Avant 375 | Après 375 | Avant 1440 | Après 1440 |
| --- | --- | --- | --- | --- |
| Héros | [PNG](qa-mascot/before/hero-375.png) | [PNG](qa-mascot/after/hero-375.png) | [PNG](qa-mascot/before/hero-1440.png) | [PNG](qa-mascot/after/hero-1440.png) |
| Cycle étape 1 | [PNG](qa-mascot/before/cycle-1-375.png) | [PNG](qa-mascot/after/cycle-1-375.png) | [PNG](qa-mascot/before/cycle-1-1440.png) | [PNG](qa-mascot/after/cycle-1-1440.png) |
| Cycle étape 4 | [PNG](qa-mascot/before/cycle-4-375.png) | [PNG](qa-mascot/after/cycle-4-375.png) | [PNG](qa-mascot/before/cycle-4-1440.png) | [PNG](qa-mascot/after/cycle-4-1440.png) |
| Écusson réussi | [PNG](qa-mascot/before/patch-honest-375.png) | [PNG](qa-mascot/after/patch-honest-375.png) | [PNG](qa-mascot/before/patch-honest-1440.png) | [PNG](qa-mascot/after/patch-honest-1440.png) |
| Écusson refusé | [PNG](qa-mascot/before/patch-dishonest-375.png) | [PNG](qa-mascot/after/patch-dishonest-375.png) | [PNG](qa-mascot/before/patch-dishonest-1440.png) | [PNG](qa-mascot/after/patch-dishonest-1440.png) |
| Page /m/0042-s-inv-20261007 | [PNG](qa-mascot/before/mission-375.png) | [PNG](qa-mascot/after/mission-375.png) | [PNG](qa-mascot/before/mission-1440.png) | [PNG](qa-mascot/after/mission-1440.png) |
| Image OG dans le navigateur | [PNG](qa-mascot/before/mission-og-375.png) | [PNG](qa-mascot/after/mission-og-375.png) | [PNG](qa-mascot/before/mission-og-1440.png) | [PNG](qa-mascot/after/mission-og-1440.png) |
| Dossier | [PNG](qa-mascot/before/dossier-375.png) | [PNG](qa-mascot/after/dossier-375.png) | [PNG](qa-mascot/before/dossier-1440.png) | [PNG](qa-mascot/after/dossier-1440.png) |

| Autre visuel | Avant | Après |
| --- | --- | --- |
| Image OG mission 1200×630 | [Avant](qa-mascot/before/mission-og.png) | [Après](qa-mascot/after/mission-og.png) |
| Favicon agrandi 512×512 | [Avant](qa-mascot/before/favicon.png) | [Après](qa-mascot/after/favicon.png) |
| Carte site 1200×630 | [Avant](qa-mascot/before/site-card.png) | [Après](qa-mascot/after/site-card.png) |
| Carte dossier 1200×630 | [Avant](qa-mascot/before/dossier-card.png) | [Après](qa-mascot/after/dossier-card.png) |

Les six PNG d'écusson :

| Modèle | Réussite | Refus |
| --- | --- | --- |
| Invoice to JSON | [PNG](qa-mascot/patches/patch-invoice-honest.png) | [PNG](qa-mascot/patches/patch-invoice-dishonest.png) |
| Contract summary | [PNG](qa-mascot/patches/patch-contract-honest.png) | [PNG](qa-mascot/patches/patch-contract-dishonest.png) |
| Address normalization | [PNG](qa-mascot/patches/patch-address-honest.png) | [PNG](qa-mascot/patches/patch-address-dishonest.png) |

## Limites

- Pas de validation sur téléphone physique, Safari ou Firefox ; contrôles effectués dans Chromium headless.
- Aucune publication sur X : le partage conserve l'intent existant, sans envoi réel.
- Les mesures Lighthouse sont des mesures de laboratoire sur réseau réel, pas une garantie de LCP pour toute connexion.
- Les cadres sont mesurés à quatre phases par étape ; la review visuelle indépendante reste attendue.
- Pas de changement ni de validation de production, DNS ou domaines dans cette mission.
