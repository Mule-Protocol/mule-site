# Compteur de missions partagé

## Comportement

Le compteur de la tuile `Missions run on this page` additionne :

- une unité par minute entière depuis `2026-10-07T23:23:00Z` (8 octobre, 01:23 à Paris) ;
- une unité par simulation terminée par un visiteur, que son résultat soit SETTLED ou RETURNED.

La partie automatique est calculée à la lecture : aucun cron ni visiteur n'est nécessaire pour qu'elle progresse. Sa date de départ est fixe dans `src/lib/mission-counter.ts` et ne doit pas être remise à zéro lors d'un déploiement. Les anciens compteurs locaux n'avaient aucun historique partagé à reprendre.

D1 conserve le total manuel. Le navigateur récupère l'heure du serveur et ce total, puis recalcule la partie automatique à chaque minute. Il se resynchronise toutes les 60 secondes et au retour sur la page. Une mission terminée déclenche une synchronisation immédiate ; les autres visiteurs la voient à leur prochaine synchronisation. Les numéros de badges et le compteur local sous la console gardent leur fonctionnement actuel.

Les libellés, les pages légales, les styles, la CSP et les réglages de lancement sont inchangés, conformément à la demande. Aucun wallet ni mesure d'audience n'est ajouté. Les mentions existantes relatives au compteur local restent donc présentes ; le brouillon de confidentialité devra être revu par le propriétaire et son conseil avant publication.

## Stockage et erreurs

`GET /api/mission-counter` renvoie `{ manualTotal, serverTime }`. `POST` accepte uniquement `{ id: UUIDv4 }` depuis la même origine. Les réponses sont `no-store` et `noindex, nofollow`.

Chaque mission utilise un reçu aléatoire. Son insertion et l'incrément du total sont effectués dans un lot SQL transactionnel : renvoyer le même reçu ne compte pas deux fois. D1 ne stocke que le total et ces reçus, sans IP, compte, adresse de wallet ou contenu de mission dans le schéma applicatif. Les traitements techniques de l'hébergeur restent distincts.

Le navigateur conserve chaque reçu non acquitté dans une clé `localStorage` séparée, `mule:pending-mission:<UUID>`, avec la valeur constante `1`. Il la retire après confirmation. Une recharge reprend les envois en attente ; plusieurs onglets peuvent réessayer le même reçu sans doubler le total. Si le stockage est bloqué, les tentatives restent en mémoire : fermer la page avant acquittement peut alors perdre la mission.

Sans D1 ou pendant une panne initiale, la tuile affiche `—`. Après une synchronisation réussie, une panne conserve le dernier total manuel connu ; les minutes continuent de progresser. La console reste utilisable. Il s'agit d'un compteur de simulations déclarées par le navigateur, pas d'une preuve de travaux exécutés sur Solana : des requêtes directes avec de nouveaux reçus peuvent l'incrémenter.

## Liaison des bases et activation

Le propriétaire a créé les bases et fourni leurs identifiants le 8 octobre 2026. La liaison `MULE_COUNTER` est maintenant déclarée dans `wrangler.jsonc` :

| Environnement | Identifiant D1 |
| --- | --- |
| Local et préproduction (`env.preview`) | `3f30d002-7ef7-4c93-81e4-518b2fd4d59c` |
| Production (`env.production`) | `39adea8c-6526-4601-a03b-395fba01b503` |

Les noms des bases ne sont pas nécessaires à cette liaison : les identifiants fournis sont utilisés directement. Les essais de préproduction utilisent une base distincte de la production.

Le propriétaire confirme avoir initialisé les deux bases avec [`migrations/0001_mission_counter.sql`](../migrations/0001_mission_counter.sql), via l'onglet **Console** de D1. Le jeton autorisé n'a pas D1 Write. Après initialisation, `SELECT * FROM mission_counter;` renvoie une ligne `id=1`, `manual_total=0` avant les premiers essais. Ne pas réexécuter l'initialisation ni remettre le total à zéro sur une base déjà utilisée.

Le projet utilise la [configuration Wrangler de Pages](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) : la préproduction reçoit `env.preview` et le déploiement de `main` reçoit `env.production`. La PR reste en brouillon jusqu'au déploiement de cette liaison, à la vérification de lecture/écriture en préproduction ; l'initialisation de la base de production a été confirmée par le propriétaire. Aucun déploiement de production ni fusion n'est effectué par l'agent.

## Vérifications locales du 8 octobre 2026

- `npm test` : **53 tests réussis**, dont 6 sur les minutes et 8 sur l'API avec le vrai schéma SQLite (comptage partagé, idempotence, atomicité, erreurs, validation et en-têtes).
- `npm run build` : réussi, contrôle Astro et vérification du HTML inclus.
- `node scripts/mission-counter-qa.mjs` : réussi contre une vraie Function Pages et D1 **locaux**, sans écrire dans une base distante. Seule l'heure renvoyée au navigateur est contrôlée pour vérifier les minutes précisément.
- Deux visiteurs aux horloges différentes : même total ; +1 à la minute exacte ; missions SETTLED et RETURNED partagées ; badge manuel toujours `0001` pour chaque nouveau visiteur ; total conservé au rechargement ; rattrapage de dix minutes après suspension ; réponse POST perdue puis recharge sans double comptage.
- Captures inspectées à 375 et 1440 px : aucun débordement, aucun changement de libellé. Aucun JavaScript en erreur pendant la recette.
- La recette générale `scripts/pass-2-qa.mjs` utilise désormais une API simulée pour ne pas écrire dans un compteur distant lors des autres contrôles du site.

Les journaux, la base locale et les captures sont dans le dossier ignoré `artifacts/mission-counter/`. La recette navigateur refuse toute URL de serveur qui ne soit pas `localhost` ou `127.0.0.1`.
