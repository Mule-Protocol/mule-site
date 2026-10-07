# MULE — corrections de la première passe

7 octobre 2026. Correctifs dans le commit `298657a06ae93d0ada1903027e22decd59c95add`, branche `codex/pass-1`, [PR #1](https://github.com/Mule-Protocol/mule-site/pull/1) toujours en brouillon. Aucune fusion, production, modification DNS ou fonctionnalité de deuxième passe.

## Corrections importantes

| Demande | Correction et fichiers | Vérification |
|---|---|---|
| 1. Cycle mobile lisible | `Lifecycle.astro`, `lifecycle.ts`, `site.ts`, `site.css` : cadrage SVG mobile qui suit la mule sous 768 px ; anciens textes SVG masqués ; annotations HTML à 16 px ; contenu placé 24 px sous la navigation. | Cinq étapes à 360 et 375 px, aucun débordement. Scène : 328 × 231 et 343 × 241 px ; mule : environ 210 et 219 px de large. Boîte du texte : 19 px par ligne. Captures des étapes 1 et 4 à 375 et 1440 px. |
| 2. Pause et reprise | `site.ts` : mémorise l'étape affichée, place la carte statique correspondante sous la navigation, puis rétablit la position du cycle. Préserve aussi la dernière étape lorsque le bas de page limite le défilement. La réinitialisation différée ne remplace pas un défilement effectué entre-temps. | 20 allers-retours réussis : cinq étapes × 360/375/768/1440 px. Chaque reprise affiche la même étape ; cartes alignées vers 72 px, sauf dernière carte sur grand écran limitée par le bas de page mais restant visible. Contrôle manuel supplémentaire sur Inspect. |
| 3. Lecteurs d'écran | `Lifecycle.astro`, `site.css`, `site.ts` : liste statique en `sr-only` pendant l'animation, jamais `display:none`. Scène, rail et légende animés en `aria-hidden`. Liste visible en pause, mouvements réduits et sans JS. SVG statiques décoratifs pour éviter de répéter le nom de l'étape. | Arbre d'accessibilité Chromium : exactement cinq éléments de liste et un titre par étape dans les quatre modes. Exports `accessibility-animated.txt`, `accessibility-paused.txt`, `accessibility-reduced-motion.txt`, `accessibility-no-javascript.txt`. |
| 4. Assets sans Function | `_routes.json` exclut `/_astro/*`, `/brand/*`, `/images/*`, `/site.webmanifest`. `_headers` conserve CSP, HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy et noindex sur les hôtes Pages. | Wrangler reconnaît quatre règles valides. Sur la préproduction déployée : CSS `/_astro/Base.Bo3ywKCd.css` et `/brand/mule-lockup-ink.svg` en 200 avec protections et noindex, sans CORS permissif. HTML, robots et sitemap en 200 ; page absente en 404, avec les mêmes protections. Test www existant et simulateur réussis : 301 vers l'apex, chemin et query conservés. |
| 5. Validate obligatoire | Aucun changement de réglage pendant cette correction. Codex avait activé et enregistré le contrôle via Settings → Branches → règle de protection de main lors de la première livraison. | L'[API publique de main](https://api.github.com/repos/Mule-Protocol/mule-site/branches/main), relue le 7 octobre, retourne `contexts: ["Validate"]`, `enforcement_level: "everyone"`, et `checks: [{"context":"Validate","app_id":15368}]`. La cause de la différence avec la lecture précédente de la review n'est pas établie. |

Le comportement des routes exclues et des en-têtes statiques suit la documentation officielle [Routing](https://developers.cloudflare.com/pages/functions/routing/) et [Headers](https://developers.cloudflare.com/pages/configuration/headers/). Les chemins exclus évitent le middleware sur tous les hôtes : un asset sous www n'est donc pas redirigé par cette Function. Les URL de pages sous www restent redirigées. Les domaines réels ne sont pas encore raccordés.

## Améliorations facultatives

Les huit améliorations ont été réalisées :

1. CTA du héros : « Soon », bordures pointillées et fond neutre, sans dépendance à une infobulle (`Hero.astro`, `site.css`).
2. Seconde moitié du bandeau défilant en `aria-hidden` (`Hero.astro`).
3. Remise directe de `aria-expanded=false` dans la fermeture du menu, y compris Échap et liens ; trois chemins testés (`site.ts`).
4. Libellé fixe « Pause animations » avec `aria-pressed` (`site.ts`, `Header.astro`).
5. Annotation ESCROW déplacée au-dessus de la caisse, hors de l'antenne (`Hero.astro`).
6. Dessin du héros resserré à 180 px de haut sur mobile ; titre et premier CTA visibles dans le premier écran à 360/375 × 812 (`site.css`).
7. Suppression de `aria-disabled` sur les spans du menu (`Header.astro`).
8. Suppression de `Access-Control-Allow-Origin` dans le middleware et les réponses statiques ; assertion ajoutée au test HTTP existant (`response-policy.mjs`, `_headers`, `response-policy.test.mjs`).

## Vérifications et preuves

- Quatre tests unitaires réussis, dont www et retrait du CORS permissif.
- Build statique réussi ; Astro/TypeScript : zéro erreur, zéro avertissement, une indication préexistante dans le script Lighthouse.
- QA Chromium : 360, 375, 768 et 1440 px ; 20 transitions pause/reprise ; aucun débordement, erreur console ou appel tiers relevé ; cinq étapes accessibles une seule fois dans tous les modes.
- Captures et résultats dans `artifacts/pass-1-corrections/` (preuves locales exclues de Git). Le rapport livré au propriétaire comprend les sorties curl de la préproduction après déploiement.
- Workflow du correctif réussi, tests/build/déploiement : [GitHub Actions](https://github.com/Mule-Protocol/mule-site/actions/runs/37556663767). [Contrôle de PR réussi](https://github.com/Mule-Protocol/mule-site/actions/runs/37556666488).
- Sorties HTTP brutes du déploiement : `curl-preview-asset.txt`, `curl-preview-brand.txt`, `curl-preview-html.txt`, `curl-preview-error.txt`, `curl-preview-robots.txt`, `curl-preview-sitemap.txt`. Résumé vérifiable dans `headers-live.json`.

## Limites

Pas de test sur téléphone physique, Safari/VoiceOver, Firefox ou NVDA. L'arbre d'accessibilité a été inspecté dans Chromium ; cela ne remplace pas un essai vocal avec ces lecteurs. Lighthouse n'a pas été relancé : les scores du premier rapport restent historiques. Le comptage réel des invocations Cloudflare n'a pas été mesuré ; les exclusions de routage ont été vérifiées. La redirection www est testée unitairement et dans Wrangler, pas sur le domaine réel non raccordé.

La validation visuelle finale appartient au reviewer. `LAUNCHED=false` et aucune adresse de contrat publiée.
