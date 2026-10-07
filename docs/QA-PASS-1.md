# MULE — revue de la première passe

État vérifié le 7 octobre 2026. Héros et cycle de mission portés et **déployés en préproduction sur Cloudflare Pages**. Première passe en attente de revue ; aucune production publiée.

La revue indépendante a demandé des corrections de lisibilité mobile, de pause/reprise, d'accessibilité et de routage des fichiers statiques. Leur suivi figure dans [QA-PASS-1-CORRECTIONS.md](QA-PASS-1-CORRECTIONS.md). Les mesures Lighthouse ci-dessous concernent la première livraison, avant ces corrections.

Le brief impose une première passe limitée aux sections 5.1 et 5.3, une URL de préproduction, puis une revue du propriétaire avant la suite : `reference/MULE_site_prompt.md`, section 1. L'architecture statique sans adaptateur a été validée par le propriétaire et figure dans les deux documents de référence actualisés.

## Résultat et accès

- Prévisualisation locale : http://127.0.0.1:4321/ (machine de développement uniquement).
- Préproduction Cloudflare : déploiement de `codex/pass-1` réussi par GitHub Actions ; URL remise au propriétaire pour revue.
- Production : `https://muleprotocol.com` est la cible, **pas une mise en ligne vérifiée**.
- Dépôt : `https://github.com/Mule-Protocol/mule-site`, créé puis rendu public par le propriétaire le 7 octobre pour disposer des protections de branche gratuites. Le code et l'historique ont été vérifiés avant leur envoi ; aucun secret détecté.
- Secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` enregistrés dans GitHub Actions, jamais dans le code. Règle `main` active : PR obligatoire, contrôle `Validate` requis et branche à jour, aucun contournement administrateur, force push et suppression interdits.
- `Validate` a été configuré par Codex dans Settings → Branches → règle de protection de `main`, puis enregistré lors de la première livraison. Après le signalement de la review, une lecture de l'[API publique de la branche](https://api.github.com/repos/Mule-Protocol/mule-site/branches/main) le 7 octobre retourne bien `contexts: ["Validate"]`, `enforcement_level: "everyone"` et le contrôle lié à l'application GitHub Actions (`app_id: 15368`). Aucun réglage du dépôt n'a été modifié pendant les corrections.
- Première exécution distante réussie : [GitHub Actions, run 37553373564](https://github.com/Mule-Protocol/mule-site/actions/runs/37553373564), commit `9f913166ede9f665bce4e9ce54ea921dcc9b676f`. Validation, build et déploiement réussis.
- Cloudflare : projet Pages `mule-site` créé, branche de production `main`. Aucun changement DNS ou registrar effectué.

## Mesures locales

Lighthouse mobile, Chromium headless, simulation de réseau mobile 4G et ralentissement CPU ×4. Ce ne sont pas des mesures sur le domaine déployé ni sur un téléphone physique.

| Critère | Résultat | État |
|---|---:|---|
| Performance ≥ 90 | 99/100 | Fait sur `/` local |
| Accessibilité automatisée | 100/100 | Fait ; ne remplace pas la QA manuelle complète |
| LCP < 2 s | 1,971 s | Fait localement ; marge faible, remesurer après déploiement |
| CLS < 0,05 | 0,001 | Fait |
| JS initial < 120 Ko gzip | 2 868 octets | Fait ; GSAP/ScrollTrigger chargés à l'arrivée du cycle |
| Ensemble des JS, y compris différés | 47 476 octets gzip | Information |
| Poids initial < 1,5 Mo | 140 605 octets transférés | Fait |
| Audit npm | 0 vulnérabilité signalée | Fait sur le verrouillage actuel |
| TypeScript / Astro | 0 erreur, 0 avertissement, 1 indication de typage dans le script Lighthouse | Fait |
| Tests de configuration et HTTP | 4/4 réussis | Fait |

Preuves : `artifacts/pass-1/lighthouse-mobile.html`, `lighthouse-mobile.json`, `lighthouse-summary.json`, `browser-qa.json` ; audit : `artifacts/dependency-audit.json`.

Le dernier ajustement après la mesure Lighthouse concerne le mode d'indexation du build et le balayage SVG en pas discrets. Il ne change pas le chargement des ressources mesurées. Les captures et contrôles fonctionnels sont actualisés sur ce build.

## Contrôles Pages et lancement

- **Fait localement** : compilation réelle en mode `CF_PAGES_BRANCH=main` ; `robots.txt` autorise l'indexation et la balise robots est `index, follow`.
- **Fait localement** : compilation de préproduction ; `robots.txt` interdit l'indexation et la balise robots est `noindex, nofollow`.
- **Fait localement** : `/404` porte `noindex` dans les deux modes. Le contrôle des fichiers générés est exécuté par `scripts/check-build.mjs`, y compris en CI.
- **Fait localement** : Wrangler a compilé `functions/_middleware.ts` et reconnu les quatre règles de `_headers`. Requêtes sur le simulateur officiel avec les noms d'hôte apex, www et preview : 301 www conservant chemin et query ; sécurité sur 200/404 ; `X-Robots-Tag` sur les previews, absent de l'apex. Sorties curl brutes : `artifacts/pass-1/curl-local-pages.txt`.
- **Fait sur la préproduction déployée** : HTTPS 200, `X-Robots-Tag: noindex, nofollow`, balise robots concordante, `robots.txt` avec `Disallow: /`, CSP, HSTS et autres en-têtes attendus présents. Héros et cycle visibles ; aucun avertissement ou erreur relevé dans la console du navigateur. Preuves : `artifacts/pass-1/curl-preview.txt`, `robots-preview.txt` et `deployed-check.json`.
- **Fait** : `LAUNCHED=false`, adresse de contrat et liens de trading absents ; aucune connexion de wallet, police distante ou requête vers un tiers observée pendant la QA.
- **Non fait** : attachement des deux domaines, validation des certificats, capture de Custom domains et `curl -I` sur le domaine réel. Attend les revues et la fin du site prévues par le brief.
- **Non fait** : SPF/DMARC/DKIM. L'état Email Routing sera contrôlé avant toute création. Aucun enregistrement existant modifié.
- **Export DNS préalable disponible** : `artifacts/dns-before.json`, export complet à 2026-10-06T23:44:24Z, zéro enregistrement à cet instant. Ce n'est pas l'export final après déploiement.
- **Non fait** : activation de Cloudflare Web Analytics. Aucun identifiant analytics inventé.

## Checklist QA de la section 8

| Item demandé | Fait / non fait | Preuve ou raison |
|---|---|---|
| iOS Safari, Android Chrome, Chrome desktop, Firefox, Safari ; 360/768/1440 | **Non fait intégralement** | Chromium headless testé à 360, 375, 768 et 1440 px, sans débordement horizontal. Appareils physiques, Firefox et Safari non testés. |
| Mouvements réduits : aucune animation, cycle lisible, aucun curseur | **Fait localement** | Cinq étapes statiques, zéro animation active, aucune section épinglée ; mode pause également testé. Lecture sans JavaScript vérifiée. |
| Clavier : liens, boutons, console, FAQ accessibles avec focus visible | **Non fait intégralement** | Lien d'évitement avec contour 2 px, menu et fermeture Échap testés. Console et FAQ appartiennent à la deuxième passe ; audit manuel complet restant. |
| Lighthouse mobile ≥ 90 sur `/` et `/dossier` | **Non fait intégralement** | `/` : 99/100 local. `/dossier` n'est pas encore porté, conformément à la première passe. |
| Aucun défaut d'encodage ; UTF-8 | **Fait pour les pages livrées** | Contrôle du HTML généré ; aucune séquence « Â », « â€ » ou caractère de remplacement. Reste à vérifier les futures pages. |
| Console : 2 comportements × 3 modèles, écusson, partage X | **Non fait** | Deuxième passe, après revue. |
| Liens externes corrects, aucun placeholder en production | **Non fait intégralement** | Aucun placeholder visible introduit dans le portage. X reprend l'adresse fournie ; dépôt GitHub public accessible. Aucun site en production. CTA console/dossier désactivés pendant cette revue. |
| Cartes de partage dans un brouillon X | **Non fait** | Contrôle à effectuer par le propriétaire dans X ; aucun accès X demandé. Cartes PNG fournies intégrées à la préproduction. |

## Captures et enregistrement

Dans `artifacts/pass-1/` :

- `hero-375.png`, `hero-768.png`, `hero-1440.png` ; contrôle supplémentaire `hero-360.png`.
- `lifecycle-375-step-1.png`, `lifecycle-375-step-5.png` et équivalents à 1440 px.
- `reduced-motion-375.png` : cinq étapes statiques.
- `lifecycle-20s.webm` : enregistrement réel du défilement à 1440 × 900, 20 secondes.

## Choix et travaux restants

Le SVG du prototype reste la mascotte en attendant les assets définitifs. Les logos, icônes et cartes de partage viennent du kit fourni. Le style et le mouvement sont portés ; un bouton de pause et un menu mobile accessible ont été ajoutés.

Les boutons console et dossier sont désactivés pendant la première passe. Ils seront reliés à leurs destinations dans la deuxième. Les métadonnées, icônes, la page 404, les en-têtes et le workflow sont préparés maintenant car nécessaires à une préproduction vérifiable.

Prochaine étape : revue du héros et du cycle sur la préproduction déployée. Après validation : construire les autres sections, `/dossier`, les écussons et images dans `functions/m/[id].ts`, puis les pages légales, confidentialité et risques à faire rédiger ou revoir par le conseil indiqué dans le brief. L'API M-1 future ira dans `functions/api/`.

La vérification des comptes/2FA, du second propriétaire et des textes juridiques revient au propriétaire selon le brief. Registrar, DNSSEC et domaine de secours sont hors du travail demandé. Aucun post X, changement de contrat ou lancement de token n'a été effectué.
