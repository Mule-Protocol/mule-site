# Mise en ligne de muleprotocol.com — partie B

Vérifications du **7 octobre 2026**, entre 17:08 et 17:24 UTC (19:08–19:24 à Paris). [PR #5](https://github.com/Mule-Protocol/mule-site/pull/5), branche `codex/domain`, **documentation uniquement, en brouillon et non fusionnée**.

**Le site est accessible et indexable sur [muleprotocol.com](https://muleprotocol.com/). Les deux domaines sont actifs avec HTTPS, `www` redirige vers le domaine principal et les pages légales sont cachées.** Deux limites sont explicitement consignées : l'indicateur `X-MULE-OG-Cache` ne passe pas à HIT sur deux requêtes consécutives à l'URL exacte (le cache CDN fonctionne), et les trois commandes `dig` ont été remplacées par les outils DNS disponibles sous Windows. Aucun réglage de cache n'a été modifié pour contourner ce résultat.

## 1. Production et fusions vérifiées

- [PR #3](https://github.com/Mule-Protocol/mule-site/pull/3) fusionnée le 7 octobre à 17:02:19 UTC, commit de fusion [`f3fb242aeb1d538095f18072f4fc64e6c9f66587`](https://github.com/Mule-Protocol/mule-site/commit/f3fb242aeb1d538095f18072f4fc64e6c9f66587).
- [PR #4](https://github.com/Mule-Protocol/mule-site/pull/4), mascotte, fusionnée à 17:04:05 UTC, commit [`90bebbbfc070efccf8936140b4661806ea25c7b5`](https://github.com/Mule-Protocol/mule-site/commit/90bebbbfc070efccf8936140b4661806ea25c7b5). Ce commit contient la fusion de la partie A, vérifiée par l'ascendance Git.
- [Run de production 37656135623](https://github.com/Mule-Protocol/mule-site/actions/runs/37656135623) : **Validate et Deploy Pages réussis**, sur `main` et ce dernier commit. [Preuve GitHub](domain/01-merges-production-ci.json).
- Déploiement de production `6915855007`, [URL immuable c3a1bd0d](https://c3a1bd0d.mule-site.pages.dev/). L'API Pages confirme `production_branch: main` et ce commit comme déploiement canonique : [état du projet](domain/01-pages-project-production.json).
- L'HTML de `mule-site.pages.dev/`, de l'URL immuable et du vrai domaine est identique : SHA-256 `0dc0db1f7e597ccdbc90d239bd9e33a8afce874fbab116eeb962be40519e1a1d`. Le footer ne contient plus les liens légaux. [Précontrôle](domain/01-production-proof.json), [vérification finale](domain/final-verification.json).
- Aucun redéploiement de production nécessaire ni lancé par cette tâche. Le workflow existant peut déployer la branche documentaire en préproduction ; cela ne change pas le déploiement canonique de `main`.

## 2. État DNS initial et Email Routing

Zone `muleprotocol.com` : `e7ee9658588c6e5a90b950de4925d977`. Compte déjà configuré : `70ac1a070379d4218dfd12de4a5e1e33`.

Le premier inventaire complet, à **17:12:16 UTC**, contenait **zéro enregistrement** : [réponse API conservée](domain/02-dns-before-api.json). La lecture d'Email Routing a ensuite renvoyé **403 / code 10000 / Authentication error** : [JSON brut](domain/02-email-routing-before.json). Les opérations de domaine ont alors été arrêtées, conformément à la consigne sur les droits. La [documentation de cette API](https://developers.cloudflare.com/api/resources/email_routing/methods/get/) exige `Zone Settings Read` ou `Zone Settings Write`, non prévus dans le périmètre Pages Edit / DNS Edit.

Le propriétaire a ensuite indiqué avoir **activé lui-même Email Routing**, avec l'état « syncing / DNS records locked ». Les opérations ont repris à partir de cette vérification manuelle, sans demander ni ajouter de permission. Un **nouvel inventaire complet avant toute mutation de l'agent** a alors relevé cinq enregistrements : trois MX, un SPF et un DKIM. Les métadonnées DNS confirment `email_routing: true` et `read_only: true` sur les MX et le DKIM.

[Export complet avant les écritures de l'agent](domain/dns-before.json) · [réponse API complète correspondante](domain/02-dns-before-current-api.json).

À cet instant, **aucun A, AAAA ou CNAME sur `muleprotocol.com` ou `www.muleprotocol.com`**. Les cinq enregistrements e-mail créés par l'activation du propriétaire constituent la référence de préservation. Aucun SPF `v=spf1 -all` ni DKIM vide n'a été ajouté ; seul DMARC a été ajouté pour la protection e-mail, comme demandé en présence de MX ou d'Email Routing.

## 3. Domaines personnalisés et certificat

Ajout par l'API Pages, dans l'ordre demandé :

1. `POST /accounts/70ac1a070379d4218dfd12de4a5e1e33/pages/projects/mule-site/domains` avec `name: muleprotocol.com` — [JSON](domain/03-create-apex.json).
2. Même endpoint avec `name: www.muleprotocol.com` — [JSON](domain/03-create-www.json).

Aucun CNAME n'a été créé automatiquement : [lecture après enregistrement Pages](domain/04-dns-after-domain-registration.json). Les deux CNAME proxifiés ont donc été créés explicitement, sans remplacement. [Réponse apex](domain/04-create-muleprotocol.com.json) · [réponse www](domain/04-create-www.muleprotocol.com.json).

| Domaine | État API à 17:20:16 UTC | Vérification | Validation | Autorité annoncée |
| --- | --- | --- | --- | --- |
| `muleprotocol.com` | active | active | active | google |
| `www.muleprotocol.com` | active | active | active | google |

**[JSON complet des deux domaines actifs](domain/domains-active.json)**. Les étapes intermédiaires sont conservées : [premier relevé](domain/05-domains-poll-01.json), [relevé actif](domain/05-domains-poll-02.json). L'activation est constatée environ trois minutes après leur création, sous la limite de 30 minutes.

Les deux connexions HTTPS ont réussi avec la vérification de certificat normale de `curl`, sans `-k` : [apex](domain/05-apex-tls-head.txt), [www](domain/05-www-tls-head.txt). L'état `active` n'est donc pas le seul élément de preuve du fonctionnement TLS.

## 4. DNS avant / après et créations

**5 enregistrements avant, 8 après. Trois créations, aucun remplacement ni aucune suppression.** [Export final complet](domain/dns-after.json) · [réponse API finale](domain/06-dns-after-api.json) · [comparaison par identifiant et champs](domain/dns-change-summary.json).

| Type | Nom | Valeur | Avant | Après / action |
| --- | --- | --- | --- | --- |
| MX | `muleprotocol.com` | `route3.mx.cloudflare.net` | Présent | Conservé inchangé |
| MX | `muleprotocol.com` | `route2.mx.cloudflare.net` | Présent | Conservé inchangé |
| MX | `muleprotocol.com` | `route1.mx.cloudflare.net` | Présent | Conservé inchangé |
| TXT | `muleprotocol.com` | `v=spf1 include:_spf.mx.cloudflare.net ~all` | Présent | Conservé inchangé |
| TXT | `cf2024-1._domainkey.muleprotocol.com` | Clé publique DKIM complète dans les exports JSON | Présent | Conservé inchangé |
| CNAME | `muleprotocol.com` | `mule-site.pages.dev`, **proxifié** | Absent | **Créé par cette tâche**, ID `bc1a607e6583169533d26fa183169134` |
| CNAME | `www.muleprotocol.com` | `mule-site.pages.dev`, **proxifié** | Absent | **Créé par cette tâche**, ID `1421c8625fc5676a6e1793a01699e7a2` |
| TXT | `_dmarc.muleprotocol.com` | `v=DMARC1; p=reject; adkim=s; aspf=s` | Absent | **Créé par cette tâche**, ID `3ea7825856f70ca1b696ecf487651726` |

[Réponse de création DMARC](domain/06-create-dmarc.json). La comparaison vérifie notamment ID, type, nom, contenu, TTL, état proxifié et priorité des enregistrements préexistants. Leurs valeurs complètes, y compris la clé DKIM et les priorités MX, figurent dans les deux exports.

## 5. Résultats des dix vérifications

Les fichiers liés contiennent les sorties brutes, avec les commandes lorsqu'elles sont regroupées par le script de contrôle. Les requêtes utilisent `curl.exe` sous Windows. [Résultats détaillés des 51 assertions HTTP](domain/http-verification.json) : **50 réussies, une assertion non satisfaite sur l'indicateur applicatif du deuxième appel OG**, détaillée au point 8. Les contrôles DNS et le diagnostic OG complémentaire sont conservés séparément ; l'échec initial n'a pas été effacé.

### 1 — Accueil, statut et sécurité : conforme

`curl -I https://muleprotocol.com/` : **200**, CSP sans `unsafe-inline`, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`. **Aucun `X-Robots-Tag`.** [Sortie brute](domain/check-01-home-head.txt).

### 2 — HTML et métadonnées : conforme

Accueil et dossier : `<meta name="robots" content="index, follow">`, canonique `https://muleprotocol.com/` ou `https://muleprotocol.com/dossier/`, aucune référence de lien vers les trois routes légales.

| Page | Sortie brute du GET / HTML | OG image | Twitter image |
| --- | --- | --- | --- |
| `/` | [GET](domain/check-02-home-source.txt) · [HTML](domain/check-02-home.html) | [200 image/png](domain/check-02-home-og-image.txt) | [200 image/png](domain/check-02-home-twitter-image.txt) |
| `/dossier/` | [GET](domain/check-02-dossier-source.txt) · [HTML](domain/check-02-dossier.html) | [200 image/png](domain/check-02-dossier-og-image.txt) | [200 image/png](domain/check-02-dossier-twitter-image.txt) |

### 3 — Brouillons cachés : conforme

Chaque réponse apex est **404**, avec `noindex, nofollow` et `no-store`. Sur `www`, `curl -I -L` observe **301 puis 404**, chemin conservé.

| Chemin | Apex : sortie brute | www : sortie brute |
| --- | --- | --- |
| `/legal` | [404](domain/check-03-apex-1.txt) | [301 → 404](domain/check-03-www-1.txt) |
| `/legal/` | [404](domain/check-03-apex-2.txt) | [301 → 404](domain/check-03-www-2.txt) |
| `/privacy` | [404](domain/check-03-apex-3.txt) | [301 → 404](domain/check-03-www-3.txt) |
| `/privacy/` | [404](domain/check-03-apex-4.txt) | [301 → 404](domain/check-03-www-4.txt) |
| `/risks` | [404](domain/check-03-apex-5.txt) | [301 → 404](domain/check-03-www-5.txt) |
| `/risks/` | [404](domain/check-03-apex-6.txt) | [301 → 404](domain/check-03-www-6.txt) |

`curl -I https://mule-site.pages.dev/legal/` : **200, noindex** — [preuve](domain/check-03-pages-legal.txt). La variante corrigée `/legal//` répond aussi **404, noindex, no-store** sur le domaine : [preuve](domain/check-03-apex-double-slash.txt).

### 4 — Mission valide : conforme

`curl -I https://muleprotocol.com/m/0042-s-inv-20261007` : **200**, `X-Robots-Tag: noindex, nofollow`. [Sortie brute](domain/check-04-mission.txt).

### 5 — Redirections : conformes

- `https://www.muleprotocol.com/dossier/?x=1` → **301**, `Location: https://muleprotocol.com/dossier/?x=1` — [sortie](domain/check-05-www-query.txt).
- `http://muleprotocol.com/` → **301** vers `https://muleprotocol.com/` — [sortie](domain/check-05-http-muleprotocol.com.txt).
- `http://www.muleprotocol.com/` → **301** vers `https://www.muleprotocol.com/` — [sortie](domain/check-05-http-www.muleprotocol.com.txt), puis la redirection HTTPS de `www` mène à l'apex.

Aucun besoin constaté d'activer « Always Use HTTPS » : les redirections demandées existent déjà. Aucun réglage n'a été lu ou changé pour les obtenir.

### 6 — robots.txt et sitemap : conformes

[robots.txt brut](domain/check-06-robots.txt) : `User-agent: *`, `Allow: /`, `Sitemap: https://muleprotocol.com/sitemap.xml`.

[sitemap.xml brut](domain/check-06-sitemap.txt) : exactement `https://muleprotocol.com/` et `https://muleprotocol.com/dossier/`.

### 7 — Hôte Pages : conforme

`curl -I https://mule-site.pages.dev/` : **200**, `X-Robots-Tag: noindex, nofollow`. [Sortie brute](domain/check-07-pages-home.txt).

### 8 — Image OG et cache : partiellement conforme

URL exacte : `https://muleprotocol.com/m/0042-s-inv-20261007/og.png`.

**200, `image/png`, 1200 × 630** sur les trois GET. Les trois PNG sont identiques, SHA-256 `cd4a1c55221e3a3e29d33775a721f577d38bac052fdc77554ecbe4d8e60374fc` : [preuve dimensions et empreintes](domain/final-verification.json), [PNG reçu](domain/check-08-og-1.png).

| Requête | X-MULE-OG-Cache | CF-Cache-Status | Preuve brute |
| --- | --- | --- | --- |
| GET exact 1 | MISS | MISS | [commande](domain/check-08-og-1-command.txt) · [en-têtes](domain/check-08-og-1-headers.txt) |
| GET exact 2 | **MISS** | **HIT** | [commande](domain/check-08-og-2-command.txt) · [en-têtes](domain/check-08-og-2-headers.txt) |
| GET exact 3, 27 s plus tard | **MISS** | **HIT**, Age 27 | [en-têtes](domain/check-08-og-3-headers.txt) |
| HEAD exact avec `Cache-Control: no-cache` | **MISS** | **HIT**, Age 96 | [en-têtes](domain/check-08-og-no-cache-head.txt) |
| HEAD avec `?domain-check=20261007` | **HIT** | MISS, Age 96 | [en-têtes](domain/check-08-og-query-head.txt) |

**Le critère précis « `X-MULE-OG-Cache` MISS puis HIT sur l'URL exacte » n'est donc pas validé.** Il ne faut pas remplacer ce constat par le HIT du CDN ou celui de l'URL avec paramètre.

Interprétation appuyée par ces observations et le [code existant du cache](https://github.com/Mule-Protocol/mule-site/blob/90bebbbfc070efccf8936140b4661806ea25c7b5/src/server/og-cache.mjs) : le CDN conserve la première réponse et son indicateur MISS ; une variante de query atteint la Function, dont la clé interne ignore les paramètres et retrouve le PNG en cache. Le cache fonctionne, mais l'indicateur applicatif servi depuis le CDN ne reflète pas les lectures suivantes. Aucun correctif de code, purge ou réglage de cache n'a été effectué dans cette branche documentaire.

Commandes complémentaires réellement exécutées :

```sh
curl -sS --max-time 30 -D docs/domain/check-08-og-3-headers.txt -o docs/domain/check-08-og-3.png https://muleprotocol.com/m/0042-s-inv-20261007/og.png
curl -sS -I --max-time 30 -H "Cache-Control: no-cache" https://muleprotocol.com/m/0042-s-inv-20261007/og.png
curl -sS -I --max-time 30 "https://muleprotocol.com/m/0042-s-inv-20261007/og.png?domain-check=20261007"
```

### 9 — TXT et DNSSEC : vérifiés avec les outils Windows

**Les trois commandes `dig +short` demandées n'ont pas été exécutées : `dig` n'est pas installé sur ce poste Windows.** Aucun faux résultat `dig` n'est fourni. Requêtes équivalentes, réponses complètes et vérification DNSSEC publique :

```powershell
Resolve-DnsName -Name muleprotocol.com -Type TXT -Server 1.1.1.1 -DnssecOk
Resolve-DnsName -Name _dmarc.muleprotocol.com -Type TXT -Server 1.1.1.1 -DnssecOk
Resolve-DnsName -Name muleprotocol.com -Type DS -Server 1.1.1.1 -DnssecOk
```

[TXT apex brut](domain/check-09-txt-apex.txt) : `v=spf1 include:_spf.mx.cloudflare.net ~all`, conservé.

[TXT DMARC brut](domain/check-09-txt-dmarc.txt) : `v=DMARC1; p=reject; adkim=s; aspf=s`.

[DS brut](domain/check-09-ds.txt) · [digest complet](domain/check-09-ds-full.txt) · [réponses structurées](domain/dns-public-verification.json) :

```text
2371 13 2 6AD9C3C1CABCBD3FDE054DBB7EF3DAE6326C757F58331131341ED1AF7172C4E7
```

Confirmation via le résolveur Cloudflare en DNS-over-HTTPS : [réponse JSON brute](domain/check-09-ds-doh.json), **Status 0, AD true**, même DS. DNSSEC est donc bien observé en fonctionnement ; aucun paramètre DNSSEC ou registrar n'a été changé.

```sh
curl -sS --max-time 30 -H "Accept: application/dns-json" "https://cloudflare-dns.com/dns-query?name=muleprotocol.com&type=DS"
```

### 10 — Pas de contrat ni de trading : conforme

Le HTML de `/` ne contient aucune adresse EVM, aucun lien pump.fun ou DexScreener, ni le mot `BUY`. Le contrôle du texte visible ne trouve aucune adresse de contrat candidate Solana/EVM. `LAUNCHED=false`, `CONTRACT_ADDRESS=null`, `PUMP_URL=null`, `DEXSCREENER_URL=null` dans le commit servi. [Audit HTML](domain/check-10-html-audit.json) · [assertions détaillées](domain/http-verification.json) · [HTML brut](domain/check-02-home-source.txt).

## 6. Ce qui reste à faire par le propriétaire

- **Indicateur de cache OG** : décider d'un correctif ciblé dans une PR distincte si le critère exact `X-MULE-OG-Cache: MISS` puis `HIT` doit être garanti sur la même URL. Cette réserve ne constitue pas une absence de cache, mais elle empêche de déclarer le point 8 entièrement conforme.
- **Email Routing** : le statut API reste non lisible avec les droits actuels. Le propriétaire l'a activé et a signalé « syncing / DNS records locked » ; les MX/SPF/DKIM sont présents et conservés. Pour relire le statut de synchronisation : **Cloudflare Dashboard → Compute → Email Service → Email Routing → muleprotocol.com**, chemin de la [documentation Cloudflare](https://developers.cloudflare.com/email-service/get-started/route-emails/). Aucun droit supplémentaire n'est demandé.
- Aucun changement « Always Use HTTPS » n'est nécessaire pour les redirections testées. Aucun autre réglage de zone n'est demandé.
- La validation des textes légaux par le conseil reste nécessaire avant de passer `LEGAL_PUBLISHED` à `true`. Les textes n'ont pas été modifiés.
- Relire la PR documentaire ; **l'agent ne la fusionne pas**.

Aucun wallet, mesure d'audience ou post X ajouté. Aucun texte ni code du site modifié dans cette partie. Les seules écritures Cloudflare de l'agent sont les deux domaines Pages, leurs deux CNAME proxifiés et le TXT DMARC. L'activation d'Email Routing a été effectuée séparément par le propriétaire.
