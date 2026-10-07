# Domaine MULE — partie B

État au **7 octobre 2026**. Branche documentaire `codex/domain`, depuis `main` au commit `90bebbbfc070efccf8936140b4661806ea25c7b5`.

**Arrêt à l'étape 2, avant toute modification Cloudflare : la lecture d'Email Routing est refusée (HTTP 403).** Le propriétaire a demandé d'arrêter si une opération exige un droit absent du jeton. Aucun droit supplémentaire n'a été demandé. Aucun domaine Pages, CNAME, SPF, DMARC ou DKIM n'a été créé ; aucun réglage de zone, registrar, DNSSEC, pare-feu ou cache n'a été modifié.

## Production vérifiée

- [PR #3](https://github.com/Mule-Protocol/mule-site/pull/3) fusionnée le 7 octobre 2026 à 17:02:19 UTC (19:02:19 à Paris), commit de fusion `f3fb242aeb1d538095f18072f4fc64e6c9f66587`.
- [PR #4](https://github.com/Mule-Protocol/mule-site/pull/4), mascotte, fusionnée à 17:04:05 UTC (19:04:05 à Paris), commit `90bebbbfc070efccf8936140b4661806ea25c7b5`. Ce commit contient la fusion de la partie A, vérifiée par l'ascendance Git.
- [Run de production 37656135623](https://github.com/Mule-Protocol/mule-site/actions/runs/37656135623) : succès sur `main`, commit `90bebbb…`. [État GitHub des fusions et jobs](domain/01-merges-production-ci.json).
- Déploiement de production GitHub `6915855007`, URL immuable [c3a1bd0d.mule-site.pages.dev](https://c3a1bd0d.mule-site.pages.dev/). HTML strictement identique à celui reçu sur [mule-site.pages.dev](https://mule-site.pages.dev/).
- SHA-256 des deux HTML : `0dc0db1f7e597ccdbc90d239bd9e33a8afce874fbab116eeb962be40519e1a1d`.
- Footer sans liens légaux ; métadonnée `index, follow` présente dans ce build de production. `LAUNCHED=false`, `CONTRACT_ADDRESS=null`, `LEGAL_PUBLISHED=false` confirmés dans le commit.
- [Preuve de comparaison](domain/01-production-proof.json) ; [en-têtes bruts de l'accueil Pages](domain/01-production-pages-headers.txt). Aucun redéploiement n'a été nécessaire.

Commande de contrôle réellement exécutée :

```sh
curl -sS --max-time 30 -D docs/domain/01-production-pages-headers.txt -o artifacts/domain/production-home.html https://mule-site.pages.dev/
curl -sS --max-time 30 -D artifacts/domain/immutable-headers.txt -o artifacts/domain/immutable-home.html https://c3a1bd0d.mule-site.pages.dev/
```

## DNS avant modification

Zone `muleprotocol.com`, identifiant `e7ee9658588c6e5a90b950de4925d977`, compte déjà configuré `70ac1a070379d4218dfd12de4a5e1e33`.

Lecture complète effectuée le 7 octobre 2026 à **17:12:16 UTC / 19:12:16 Paris** :

```text
GET /zones/e7ee9658588c6e5a90b950de4925d977/dns_records?per_page=100&page=1
HTTP 200
success: true
result: []
result_info: { page: 1, per_page: 100, count: 0, total_count: 0, total_pages: 1 }
```

[Réponse API complète](domain/02-dns-before-api.json) · [export de tous les enregistrements](domain/dns-before.json).

- Nombre total : **0** ; inventaire complet, une seule page.
- MX : **aucun**.
- A, AAAA ou CNAME sur `muleprotocol.com` ou `www.muleprotocol.com` : **aucun**.
- Email Routing : **inconnu**, ne pas assimiler l'absence de MX à une confirmation de désactivation.
- Enregistrements créés par cette tâche : **aucun**.
- Aucun nouvel export « après » n'est revendiqué : les opérations ont été arrêtées avant la première mutation. L'inventaire ci-dessus est le dernier état effectivement lu.

## Blocage et action du propriétaire

[Réponse API brute sans secret](domain/02-email-routing-before.json) :

```json
{
  "httpStatus": 403,
  "path": "zones/e7ee9658588c6e5a90b950de4925d977/email/routing",
  "data": {
    "success": false,
    "errors": [{ "code": 10000, "message": "Authentication error", "documentation_url": "https://developers.cloudflare.com/api/resources/email_routing/methods/get" }],
    "messages": [],
    "result": null
  }
}
```

La [documentation de cette API](https://developers.cloudflare.com/api/resources/email_routing/methods/get/) exige `Zone Settings Read` ou `Zone Settings Write`, hors des droits Pages Edit / DNS Edit prévus pour cette tâche. L'API DNS répond bien avec le même jeton ; le refus est constaté sur Email Routing.

**Action à faire par le propriétaire : Cloudflare Dashboard → Compute → Email Service → Email Routing → sélectionner `muleprotocol.com`, puis relever si le routage est actif, désactivé ou si le domaine n'est pas configuré.** Ce chemin est celui de la [documentation Cloudflare actuelle](https://developers.cloudflare.com/email-service/get-started/route-emails/). Cette étape demande seulement une lecture ; ne pas sélectionner « Onboard Domain » et ne pas modifier de réglage. Communiquer le statut permettra de reprendre avec le même jeton et sans extension de droits.

## État des étapes restantes

| Étape | État |
| --- | --- |
| 1. Production à jour | Vérifiée ; aucun déploiement nécessaire |
| 2. Inventaire DNS et Email Routing | DNS exporté ; lecture Email Routing refusée |
| 3. Ajout des deux domaines Pages | Non exécuté |
| 4. Création des CNAME proxifiés si nécessaire | Non exécutée |
| 5. Activation et certificats, attente maximum 30 minutes | Non commencée |
| 6. Protection e-mail conditionnelle | Non exécutée ; dépend du statut Email Routing |

Aucune réponse JSON d'état des domaines personnalisés n'est fournie : cette lecture n'a pas eu lieu avant l'arrêt. Aucun état `active` ni certificat émis n'est supposé.

## Dix vérifications demandées

Ces contrôles ne sont pas présentés comme réalisés sur un domaine branché : le branchement n'a pas été exécuté.

| N° | Contrôle | Résultat à ce stade |
| --- | --- | --- |
| 1 | HEAD `/` sur le vrai domaine, statut 200 et sécurité, sans X-Robots-Tag | Non exécuté après l'arrêt |
| 2 | HTML accueil/dossier, indexation, canoniques, images et absence de liens légaux | Non exécuté sur le vrai domaine ; précontrôle de l'accueil Pages décrit ci-dessus |
| 3 | Six chemins cachés sur apex/www et `/legal/` sur Pages | Non exécuté dans cette partie ; preuves de la partie A dans `LEGAL-HIDDEN.md` |
| 4 | Mission `/m/…` avec noindex | Non exécuté |
| 5 | Redirections www et HTTP → HTTPS | Non exécuté ; besoin éventuel d'Always Use HTTPS non déterminé |
| 6 | robots.txt et sitemap sur le domaine | Non exécuté |
| 7 | Accueil `mule-site.pages.dev` avec noindex | **Vérifié** dans les en-têtes bruts du GET : `X-Robots-Tag: noindex, nofollow` |
| 8 | PNG OG 1200 × 630 et MISS puis HIT sur le domaine | Non exécuté |
| 9 | TXT apex, TXT DMARC et DS DNSSEC | Non exécuté ; aucune preuve DNSSEC live revendiquée |
| 10 | Absence de contrat, pump.fun, DexScreener et BUY dans le HTML du domaine | Non exécuté sur le domaine ; seuls les réglages source sont vérifiés ci-dessus |

Le code du site et ses textes restent inchangés. Cette branche ne contient que le rapport et ses preuves. La PR documentaire doit rester en brouillon et ne pas être fusionnée par l'agent.
