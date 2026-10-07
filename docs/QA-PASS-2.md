# MULE — QA de la deuxième passe

Vérifications du 7 octobre 2026. Livraison de préproduction, PR en brouillon. Aucun changement DNS ou de domaine.

## Version et déploiement

- [PR #2](https://github.com/Mule-Protocol/mule-site/pull/2), `codex/pass-2` → `main`, non fusionnée.
- Base : `45ef60d75863dd364ca1d1e76a4d272ce4843855`, fusion de la PR #1. Cette fusion a été effectuée après autorisation explicite du propriétaire dans la conversation ; son workflow a publié **la première passe**. La deuxième passe n'a pas été publiée en production.
- Commit du code audité : [`bb4e17a236d2167907129ba805ea85c46cb57eb1`](https://github.com/Mule-Protocol/mule-site/commit/bb4e17a236d2167907129ba805ea85c46cb57eb1).
- [Préproduction de branche](https://codex-pass-2.mule-site.pages.dev/).
- [Déploiement immuable audité](https://c3c969d6.mule-site.pages.dev/).
- [CI de déploiement](https://github.com/Mule-Protocol/mule-site/actions/runs/37560114498) : **Validate et Deploy Pages réussis**, sur ce commit. [Preuve JSON](qa-pass-2/ci-deploy.json).
- [CI de PR](https://github.com/Mule-Protocol/mule-site/actions/runs/37560176259).
- Les corrections des scripts de QA et les preuves sont livrées dans le commit documentaire suivant ; elles ne changent pas le code du site audité.

## Réalisation, section par section

Toutes les lignes ci-dessous correspondent au commit de code `bb4e17a`.

| Périmètre | Résultat | Fichiers principaux |
| --- | --- | --- |
| 5.2 Problème | Texte du brief, barré orange de « hope » à l'entrée | `src/components/Problem.astro`, `src/scripts/section-motion.ts` |
| 5.4 Console | Trois modèles × deux comportements, cinq étapes, faux hashes aléatoires explicitement marqués, aucun explorateur, tampon et CTA vers l'écusson | `src/components/Console.astro`, `src/lib/run-mission.ts`, `src/scripts/console.ts` |
| Interface M-1 | `runMission(template, behavior): AsyncIterable<Step>` ; présentation et temporisation restent chez le consommateur, moteur sans réseau | `src/lib/run-mission.ts` |
| 5.5 Écusson | Hexagone, silhouette, numéro, statut, modèle et date UTC ; partage X ; export canvas PNG 600×660 | `src/scripts/console.ts`, `src/data/mission.mjs` |
| Routes de partage | HTML `/m/[id]`, PNG 1200×630 `/m/[id]/og.png`, métadonnées dynamiques ; `workers-og` et police Azeret Mono embarquée, sans téléchargement de police à l'exécution | `functions/m/[id].ts`, `functions/m/[id]/og.png.ts`, `src/server/mission-page.mjs`, `src/server/og-font.mjs`, `public/brand/mission.css` |
| 5.6 $MULE | BOND / ARBITRATE / GOVERN marqués PLANNED ; financement et avertissement exacts du brief | `src/components/HomeSections.astro` |
| 5.7 Mission log | M-0 DELIVERED, M-1 IN TRANSIT, M-2 à M-4 QUEUED ; rail au défilement | `src/components/HomeSections.astro`, `src/scripts/section-motion.ts` |
| 5.8 Telemetry | PENDING LAUNCH ; brouillage unique ; compteur partagé avec la console, en mémoire de la page uniquement, remis à zéro au rechargement | Mêmes composants et scripts, `src/scripts/console.ts` |
| 5.9 FAQ | Huit questions du brief ; accordéons natifs `details/summary`, dont la question sur le wallet | `src/components/HomeSections.astro` |
| 5.10 Footer | X, GitHub, dossier et trois pages légales ; avertissement intégral ; suppression de « Design review 01 » | `src/components/Footer.astro`, `src/data/legal.mjs` |
| Navigation | Deux CTA du héros actifs ; quatre entrées identiques sur ordinateur et mobile | `src/components/Header.astro`, `src/components/Hero.astro` |
| Dossier | Texte comparé automatiquement au prototype, sans différence après normalisation des espaces ; sommaire fixe sur ordinateur et repliable sur mobile ; carte fournie ; pied de page anti-pièce jointe conservé | `src/pages/dossier.astro`, `src/content/dossier.html`, `src/styles/dossier.css`, `src/scripts/dossier.ts` |
| Pages légales | `/legal`, `/privacy`, `/risks`, bandeau DRAFT, noindex dans les métadonnées et dans les en-têtes, y compris sur l'apex ; risques repris du dossier | `src/layouts/Legal.astro`, `src/pages/{legal,privacy,risks}.astro`, `src/content/risks.html`, `src/server/response-policy.mjs` |
| Animations | Split-flap, barré, journal, tampon/secousse, dépliage, brouillage et rail ; transitions par pas ; pause et mouvements réduits donnent le résultat fixe | `src/scripts/{site,console,section-motion}.ts`, `src/styles/pass-2.css` |
| Corrections de première passe | Reprise sur la carte dont le haut est le plus proche de 72 px ; annotation 6/6 au-dessus des antennes ; espace sous le rail mobile réduit de 180 px | `src/scripts/site.ts`, `src/components/Lifecycle.astro`, `src/styles/pass-2.css` |
| Référencement | Sitemap limité à l'accueil et au dossier ; canoniques et métadonnées des nouvelles pages ; préproduction noindex | `src/pages/sitemap.xml.ts`, `src/layouts/Base.astro`, `src/server/mission-page.mjs` |
| Performance | Une feuille de style externe mutualisée, préchargement prioritaire de la police du titre | `astro.config.mjs`, `src/layouts/Base.astro` |

Le dossier garde notamment ses propres statuts M-0/M-1 et sa date de version, même s'ils diffèrent de ceux demandés pour l'accueil : son texte devait rester inchangé. Seule la structure HTML des titres et en-têtes de tableau a été améliorée pour l'accessibilité.

## Sécurité et limites fonctionnelles

- Format accepté : exactement quatre chiffres, `s` ou `r`, `inv`/`con`/`adr`, date réelle `AAAAMMJJ`. Exemple : `0042-s-inv-20261007`. Une date impossible, une casse différente, du texte ajouté, des caractères Unicode substitués, une injection ou un format incomplet donnent une réponse 404 constante. Les paramètres de query ne sont pas utilisés.
- `LAUNCHED = false`, `CONTRACT_ADDRESS = null`. Aucun wallet, lien de trading, formulaire libre, cookie ou mesure d'audience ajouté. Les identifiants séquentiels sont des identifiants de simulation, pas une preuve de transaction ni une garantie d'unicité entre visiteurs.
- CSP `style-src 'self'` et `script-src 'self' https://static.cloudflareinsights.com` conservée, sans `unsafe-inline`. Aucun style ou script inline dans le HTML livré. Les objets de style internes au moteur de rendu de PNG ne sont pas servis comme HTML.
- HSTS, DENY, nosniff, referrer policy et permissions policy appliqués aussi aux réponses de mission et d'image. Image : `max-age=86400, s-maxage=604800` ; HTML mission : `max-age=3600` ; identifiant invalide : `no-store`.
- `_routes.json` et ses exclusions sont conservés ; `/m/*` est bien exécuté par les Functions, vérifié localement et sur la préproduction.
- Police embarquée sous licence SIL OFL 1.1, licence fournie dans `public/brand/Azeret-Mono-LICENSE.txt`.
- Contrôle par motifs des 80 fichiers candidats avant publication : aucun jeton Cloudflare/GitHub ou bloc de clé privée détecté. `npm install` : zéro vulnérabilité signalée.

## Checklist QA de la section 8

| Contrôle | État et preuve / limite |
| --- | --- |
| 360, 375, 768 et 1440 px, sans débordement de page | **FAIT**, accueil, dossier, trois pages légales et mission. Les larges tableaux/diagrammes du dossier gardent leur défilement interne. [Résultats live](qa-pass-2/report.json) |
| Chrome / Chromium ordinateur et dimensions mobiles | **FAIT** avec Chromium Playwright ; inspection complémentaire dans le navigateur intégré |
| iOS Safari, Android Chrome sur appareil physique, Firefox, Safari macOS | **NON VÉRIFIÉ** : appareils et navigateurs correspondants non disponibles dans l'environnement utilisé ; les dimensions mobiles ne prouvent pas leur compatibilité |
| Six configurations de console | **FAIT**, 24 exécutions sur la préproduction : trois modèles × deux comportements × quatre largeurs |
| Journal progressif et pause pendant une exécution | **FAIT**, progression observée avant la pause ; pause supprime l'attente et montre le résultat fixe |
| Mouvements réduits | **FAIT**, zéro animation active, cinq étapes lisibles, absence de traînée, console et écusson fonctionnels |
| Pause/reprise du cycle | **FAIT**, [20 allers-retours](qa-pass-2/lifecycle-results.json) ; quatre reprises supplémentaires après défilement manuel, sélection de la carte la plus proche de 72 px |
| Sans JavaScript | **FAIT**, contenu accueil/dossier lisible, cinq étapes statiques, console désactivée avec explication explicite |
| Clavier et focus | **FAIT**, lancement avec Entrée, radios avec Espace, FAQ avec Entrée, sommaire mobile avec Entrée, partage focalisable avec contour visible, téléchargement avec Entrée ; menu mobile Escape/fermeture/lien testé |
| Écusson et téléchargement | **FAIT**, statut et modèle corrects, vrai fichier PNG 600×660 téléchargé aux quatre largeurs |
| Partage X | **FAIT** pour l'URL d'intent et le texte encodé, vérifiés sans publier de post |
| Carte dans un brouillon de post X | **NON VÉRIFIÉ** : aucune session X utilisée. Métadonnées, réponse image 1200×630 et rendu visuel vérifiés ; cela ne prouve pas le comportement du cache X |
| Lighthouse mobile ≥90 accueil et dossier | **FAIT en laboratoire local**, 99/100 en performance pour les deux pages, détails ci-dessous |
| LCP <2 secondes | **FAIT en laboratoire local**, 1,967 s et 1,958 s. Pas de mesure terrain ni de garantie sur tous les appareils/réseaux |
| IDs valides, invalides et injections | **FAIT**, tests unitaires et vrais 404 sur page/image en préproduction |
| En-têtes HTTPS et noindex | **FAIT** sur préproduction ; cas apex testés unitairement. Aucun domaine personnalisé modifié ou utilisé pour publier cette passe |
| CSP et erreurs JavaScript | **FAIT** pour les pages du site : aucune erreur applicative. Particularité de l'afficheur PNG de Chromium décrite ci-dessous |
| UTF-8 et absence d'encodage cassé | **FAIT**, build et inspection ; aucune occurrence d'artefacts d'encodage dans les pages générées |
| Aucun champ à compléter hors pages légales | **FAIT** dans les pages du site générées |
| Texte exact du dossier | **FAIT**, comparaison automatique avec `reference/mule-dossier.html` aux quatre largeurs |
| Liens et cartes fournis | **FAIT** pour les destinations configurées X/GitHub et les routes internes, l'exclusion des liens de trading et la carte OG du dossier ; disponibilité du compte X non auditée |
| Analytics Cloudflare | **NON ACTIVÉ**, hors périmètre, jeton non fourni pour cette passe |
| Validation juridique, identités de l'éditeur | **NON FAIT**, responsabilité du propriétaire et de son conseil ; pages en brouillon noindex |
| 2FA, propriétaires de comptes, surveillance après lancement | **NON VÉRIFIÉ**, hors périmètre de cette passe |

La navigation directe vers le fichier PNG utilise l'afficheur d'images intégré de Chromium. Celui-ci injecte trois styles que la CSP de l'image bloque : ces messages sont consignés séparément dans `imageViewerCspWarnings` du rapport. Ils ne proviennent pas d'un script ou style du site ; la CSP n'a pas été assouplie. La page de mission s'affiche correctement et le PNG téléchargé est valide.

## Lighthouse mobile

Mesure locale sur `http://127.0.0.1:4321`, site compilé et servi compressé, Chromium headless, throttling mobile Lighthouse par défaut (CPU ×4, RTT 150 ms, débit 1 638,4 kbit/s). Les mesures retenues ont été effectuées sans autre suite de tests navigateur en parallèle. Les premières mesures simultanées, perturbées par la charge CPU, ne sont pas retenues.

| Page | Performance | Accessibilité | LCP | CLS | Rapport |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` | 99 | 100 | 1 967,08 ms | 0,01506 | [JSON](qa-pass-2/lighthouse-home.json) |
| `/dossier` | 99 | 100 | 1 958,06 ms | 0,00041 | [JSON](qa-pass-2/lighthouse-dossier.json) |

Le signal SEO « bloqué à l'indexation » est attendu pour la construction de préproduction. Les résultats complets Lighthouse JSON/HTML sont conservés localement dans `artifacts/pass-2/lighthouse-home/` et `artifacts/pass-2/lighthouse-dossier/`, et dans l'archive de livraison.

## Captures

Les captures de cette table viennent de la préproduction au commit `bb4e17a`. Les captures de console et d'écusson sont des captures des composants ; le dossier et la mission sont capturés en pleine page. Les largeurs indiquées sont celles de la fenêtre de test.

| Vue | 375 px | 1440 px |
| --- | --- | --- |
| Console réussie | [PNG](qa-pass-2/console-honest-375.png) | [PNG](qa-pass-2/console-honest-1440.png) |
| Console retournée | [PNG](qa-pass-2/console-dishonest-375.png) | [PNG](qa-pass-2/console-dishonest-1440.png) |
| Écusson réussi | [PNG](qa-pass-2/patch-honest-375.png) | [PNG](qa-pass-2/patch-honest-1440.png) |
| Écusson retourné | [PNG](qa-pass-2/patch-dishonest-375.png) | [PNG](qa-pass-2/patch-dishonest-1440.png) |
| Dossier | [PNG](qa-pass-2/dossier-375.png) | [PNG](qa-pass-2/dossier-1440.png) |
| `/m/0042-s-inv-20261007` | [PNG](qa-pass-2/mission-375.png) | [PNG](qa-pass-2/mission-1440.png) |
| Image OG ouverte directement | [PNG](qa-pass-2/og-in-browser-375.png) | [PNG](qa-pass-2/og-in-browser-1440.png) |
| Cycle, étape Inspect (local) | [PNG](qa-pass-2/lifecycle-375-step-4.png) | [PNG](qa-pass-2/lifecycle-1440-step-4.png) |

[Image OG originale 1200×630](qa-pass-2/og-1200x630.png). [Exemple de téléchargement canvas](qa-pass-2/download-375.png).

## Commandes reproductibles

```powershell
npm ci
npm test
npm run build
npx wrangler pages dev dist --port 8788
# Autre terminal :
node scripts/pass-2-qa.mjs
# Préproduction :
$env:QA_BASE_URL='https://codex-pass-2.mule-site.pages.dev'
$env:QA_OUTPUT='artifacts/pass-2/live'
node scripts/pass-2-qa.mjs
```

La suite du cycle utilise `node scripts/browser-qa.mjs` et `QA_OUTPUT`. Lighthouse utilise `node scripts/qa-server.mjs`, puis `node scripts/lighthouse.mjs` ; variables `QA_URL` et `QA_OUTPUT` pour choisir la page et le dossier. Ne pas lancer Lighthouse en parallèle d'autres tests navigateur.

## Champs à fournir par le propriétaire

- Identité ou raison sociale de l'éditeur, adresse, forme juridique, immatriculation et capital si applicables.
- Directeur de la publication et moyen de contact de l'éditeur.
- Contact confidentialité, confirmation par le conseil du traitement des données techniques par l'hébergeur et futur texte de mesure d'audience.
- Validation juridique des trois brouillons avant de retirer leur noindex.

L'hébergeur est renseigné : **Cloudflare, Inc., 101 Townsend St., San Francisco, California 94107, USA**. Adresse recopiée depuis la [section 15 des conditions officielles de Cloudflare](https://www.cloudflare.com/website-terms/), consultée le 7 octobre 2026. Le choix et l'API du moteur PNG reposent sur le [README officiel workers-og](https://github.com/kvnang/workers-og) ; aucune police distante n'est utilisée.

## Sorties curl

Les exports complets sont [ici](qa-pass-2/curl-headers-live.txt) et [ici pour le dossier après redirection](qa-pass-2/curl-dossier-final.txt). `/dossier` répond 308 vers `/dossier/`, puis 200 ; la canonique du dossier est bien `/dossier/`. La mission valide et son image répondent 200, la date invalide 404. Les sorties brutes suivent.

```http
curl -I https://codex-pass-2.mule-site.pages.dev/dossier
HTTP/1.1 308 Permanent Redirect
Date: Wed, 07 Oct 2026 02:06:55 GMT
Connection: keep-alive
Location: /dossier/
Strict-Transport-Security: max-age=31536000; includeSubDomains
content-security-policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests
permissions-policy: camera=(), microphone=(), geolocation=(), payment=()
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
x-robots-tag: noindex, nofollow
Report-To: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=E2aLG1PJO%2BCyU6DeLUp2VteTHeh9GEW%2BpeBEFXx70N2IqEZgFSzEERSKm7uln%2FR0vocvotl4fWGw59WERb%2Fx3NGfRYZFom0BUm1iCHn7V%2Fd11pSUVz%2BzC3493GPVNYuLENqOBNxcGmIcaVUUKcgIJHO7bZnkm6bQlrVHWrxuRw%3D%3D"}]}
Nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
Server: cloudflare
CF-RAY: a469596ed97c4e73-CDG
alt-svc: h3=":443"; ma=86400


curl -I https://codex-pass-2.mule-site.pages.dev/m/0042-s-inv-20261007
HTTP/1.1 200 OK
Date: Wed, 07 Oct 2026 02:06:55 GMT
Content-Type: text/html; charset=utf-8
Connection: keep-alive
Cache-Control: public, max-age=3600
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-Robots-Tag: noindex, nofollow
Report-To: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=5T47Pm08tWAeYq%2B8%2FRcRq4mCs3tZSsVdWI7jZEgxEfDsxWIk8G7lsn8HNC%2BSzLXNT7sghOHd1HjC8yQ%2Ft0WSOGkeALtLdXFB6Hb7%2Fx%2Br6xQSj5ELHK1VdGpSh7G3CIwi8BGWuG%2FejsI09rtDt0t%2BE3w%2F4pFUoprj4rVrozyNQg%3D%3D"}]}
Nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
Server: cloudflare
CF-RAY: a469596f7d6b0490-CDG
alt-svc: h3=":443"; ma=86400


curl -I https://codex-pass-2.mule-site.pages.dev/m/0042-s-inv-20260229
HTTP/1.1 404 Not Found
Date: Wed, 07 Oct 2026 02:06:56 GMT
Content-Type: text/plain; charset=utf-8
Connection: keep-alive
Cache-Control: no-store
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-Robots-Tag: noindex, nofollow
Report-To: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=PKsjOCCcDxKsj146JEWDU2Wexrtoz9Toonx1mANASFH7OS1yYCyCdVZfCYzmktL8SxhO51df7g%2BmnANPoFKN2aC1CB7yGkeHS7yU%2BI%2BZNYCfkDLwZl1VXOu0ROZZc8C%2FYnqB82UwUTT9hnvGvgTJ%2BadaMRm2rCrmS5BijkMXjA%3D%3D"}]}
Nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
Server: cloudflare
CF-RAY: a4695970292fd9b9-CDG
alt-svc: h3=":443"; ma=86400


curl -I https://codex-pass-2.mule-site.pages.dev/m/0042-s-inv-20261007/og.png
HTTP/1.1 200 OK
Date: Wed, 07 Oct 2026 02:06:56 GMT
Content-Type: image/png
Connection: keep-alive
Cache-Control: public, max-age=86400, s-maxage=604800
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-Robots-Tag: noindex, nofollow
Report-To: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=PUwvC%2BDCs4hgPi4E0P2HaVdmrBY3C1FWNy0EB1bZ4o0CSTfFLtvWfjr%2Bp98NqBp0emWlBgQQwRFvLo8Yolo9wwK%2BQF0HTlBTHZDZnoQghJSV10DZ6w%2FO6ApeHpXUMCGUA7Ke%2Bls9ateqt7keWe9DvS51G83%2B1c2Gw1QfbbfYzg%3D%3D"}]}
Nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
Server: cloudflare
CF-RAY: a46959716827d125-CDG
alt-svc: h3=":443"; ma=86400



```

```http
# curl -I https://codex-pass-2.mule-site.pages.dev/dossier/
HTTP/1.1 200 OK
Date: Wed, 07 Oct 2026 02:07:26 GMT
Content-Type: text/html; charset=utf-8
Connection: keep-alive
Cache-Control: public, max-age=0, must-revalidate
ETag: "f026e8a6739c2743f4f6abff96f132c2"
Strict-Transport-Security: max-age=31536000; includeSubDomains
content-security-policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests
permissions-policy: camera=(), microphone=(), geolocation=(), payment=()
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
x-robots-tag: noindex, nofollow
Report-To: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=hm%2Fe8OUL%2FDBR%2FY0LfvWgOPCQx6BPOS8tfSR20TLBi4zFUVFDBT%2BDNMBfEwZxDm%2Fit1r05H0Df3hYn5vAGi8mCDwNfPtx4dr%2BCtKhW6xUyN8Jf4Jy%2B1x40FvrFJX2nWCakxzODAUybNp%2Bti2gW7MMtKEpo%2FObiziLda2Pr02IGg%3D%3D"}]}
Nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
Server: cloudflare
CF-RAY: a4695a2b6dce52be-CDG
alt-svc: h3=":443"; ma=86400


```
