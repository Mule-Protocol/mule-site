# QA — angle Solana de la page d’accueil

Base : main à [cd57efa](https://github.com/Mule-Protocol/mule-site/commit/cd57efadebb2a0d88ea4c90e7d880c32bc825f40), fusion de la PR #7. Branche : codex/solana-angle. Contrôles du 7 octobre 2026.

## Les cinq changements exacts

| Emplacement | Avant | Après |
| --- | --- | --- |
| Hero — surtitre | Unit M-1 / Autonomous settlement | Unit M-1 / Settlement for Solana agents |
| Hero — sous-titre | Stubborn by design. Funds stay locked until the work checks out. | Stubborn by design. AI agents on Solana already move money. MULE holds it until the work checks out. |
| Problème — paragraphe entre h2 et .split | Aucun paragraphe à cet emplacement | On Solana, agents already trade, pay for data and hire other agents. The payment settles in seconds. What it bought, nobody checks. |
| Description par défaut | Stubborn by design. MULE is an escrow protocol in development: funds stay locked until an AI agent’s work checks out. | Stubborn by design. MULE is an escrow protocol in development on Solana: funds stay locked until an AI agent’s work checks out. |
| FAQ — après « What does MULE actually do? » | Question absente ; 8 questions | **Why Solana?** — Because the agents are already there: they trade, pay for data and hire each other on Solana today. Fees are small enough for a two-dollar job, settlement takes seconds, and the escrow program is public, so anyone can read the rules it enforces. |

Le nouveau paragraphe réutilise la classe globale existante muted. Aucun ajout CSS. Le titre, les deux blocs de paiement et la conclusion du problème restent identiques. La FAQ utilise la même structure details/summary/p et passe de 8 à 9 questions.

## Validation

- npm test : **39/39 tests réussis** — [sortie complète](tests.txt).
- npm run build : **réussi**, 0 erreur, 0 avertissement Astro ; contrôle CSP du HTML généré réussi — [sortie complète](build.txt).
- À 375, 768 et 1440 px : aucun débordement horizontal de texte dans les trois sections ; aucune intersection entre le texte du hero et la mascotte. [Avant](before/browser.json) · [Après](after/browser.json). Captures inspectées visuellement.
- La nouvelle description est présente à l’identique dans meta description, og:description et twitter:description, vérifiée à chaque largeur dans le HTML rendu. La FAQ Why Solana? est troisième.
- [Vérification du périmètre et empreintes](scope-check.json) : exactement quatre fichiers source modifiés ; les 22 assets compilés (CSS, JS et polices), le HTML du dossier et l’image OG sont identiques avant/après. src/content/dossier.html et src/config/site.mjs n’ont aucune modification. LAUNCHED=false, CONTRACT_ADDRESS=null, LEGAL_PUBLISHED=false conservés.
- Aucun style ni script inline ajouté au HTML, aucune nouvelle dépendance ni aucun nouveau script du site. Les deux styles d’animation déjà présents dans le DOM après exécution sur main ne sont pas des ajouts de cette retouche.

## Lighthouse mobile

Lighthouse 13.5.0, Chromium 153, simulation mobile, mêmes paramètres et machine. Builds statiques locaux avec l’environnement d’indexation de main et la politique d’en-têtes de production. Seule la directive upgrade-insecure-requests est omise par le serveur QA pour HTTP localhost ; le code du site et ses en-têtes déployés ne sont pas modifiés. Les ports 4321/4322 servent respectivement les builds avant/après. Aucune mesure n’est un déploiement de production ou un test sur téléphone physique.

| Série | Scores médians P / A / BP / SEO | Performances individuelles | LCP médian (ms) | CLS médian |
| --- | --- | --- | --- | --- |
| Initiale — main | 100 / 100 / 100 / 100 | 100, 100, 100 | 1381.5 | 0.01506 |
| Initiale — retouche | 91 / 100 / 100 / 100 | 91, 91, 73 | 1511.8 | 0.01506 |
| Alternée — main | 100 / 100 / 100 / 100 | 37, 100, 100 | 1376.3 | 0.01506 |
| Alternée — retouche | 100 / 100 / 100 / 100 | 86, 100, 100 | 1366.7 | 0.01506 |

La première série avait baissé de 100 à 91 en médiane. Une seule série alternée, bornée à trois mesures par version, a donc été exécutée sans autre changement de code. Elle donne 100 → 100 en médiane ; main lui-même varie de 37 à 100 dans cette série. Il n’y a pas de baisse de médiane sur cette comparaison alternée, mais ces mesures locales sont variables et ne garantissent pas un score en production. Tous les relevés, y compris les moins favorables, sont conservés.

Le titre h1 est bien l’élément LCP dans les rapports ; sa géométrie mobile est identique. LCP médian de la série alternée : **1376.3 → 1366.7 ms**. Accessibilité, bonnes pratiques et SEO : 100 dans les douze relevés.

[Première série avant](lighthouse-before.json) · [Première série après](lighthouse-after.json) · [Comparaison alternée](lighthouse-paired.json) · [Les douze rapports complets HTML/JSON](lighthouse-reports.zip).

Le précédent relevé réseau annoncé à 99/100/100/100 n’est pas directement comparable à cette mesure locale ; la comparaison repose sur le main exact reconstruit dans le même environnement.

## Captures

Captures natives du navigateur par section, viewport de 375/768/1440 × 900, mouvement réduit pour stabiliser l’animation. Aucune retouche d’image. FAQ ouverte avant : « What does MULE actually do? », la nouvelle question étant absente de main. FAQ ouverte après : « Why Solana? ».

| Section | Largeur | Avant | Après |
| --- | --- | --- | --- |
| hero | 375 px | [PNG](before/hero-375.png) | [PNG](after/hero-375.png) |
| problem | 375 px | [PNG](before/problem-375.png) | [PNG](after/problem-375.png) |
| faq | 375 px | [PNG](before/faq-375.png) | [PNG](after/faq-375.png) |
| hero | 768 px | [PNG](before/hero-768.png) | [PNG](after/hero-768.png) |
| problem | 768 px | [PNG](before/problem-768.png) | [PNG](after/problem-768.png) |
| faq | 768 px | [PNG](before/faq-768.png) | [PNG](after/faq-768.png) |
| hero | 1440 px | [PNG](before/hero-1440.png) | [PNG](after/hero-1440.png) |
| problem | 1440 px | [PNG](before/problem-1440.png) | [PNG](after/problem-1440.png) |
| faq | 1440 px | [PNG](before/faq-1440.png) | [PNG](after/faq-1440.png) |

## Écarts et limites

Aucun écart aux cinq textes demandés ni au périmètre source. La variabilité Lighthouse est la réserve décrite ci-dessus ; aucune optimisation hors périmètre n’a été ajoutée pour forcer un score. Aucun appel à l’API Cloudflare, changement DNS, secret, production ou image OG effectué pour cette tâche. La PR n’est pas fusionnée.
