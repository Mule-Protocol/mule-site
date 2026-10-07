# Task for Astra: put the MULE site live on muleprotocol.com (Cloudflare Pages)

## Context

- The domain `muleprotocol.com` is registered at Cloudflare Registrar by the project owner. DNS is on Cloudflare, DNSSEC is on.
- Hosting is **Cloudflare Pages** (not Vercel), in the same Cloudflare account as the domain.
- You get these credentials, and nothing else:
  1. Membership of the GitHub organization `mule-protocol`, with permission to create repositories.
  2. A Cloudflare API token with exactly: **Account › Cloudflare Pages › Edit** and **Zone › DNS › Edit** on `muleprotocol.com`, plus the Cloudflare account ID.
- You never get the Cloudflare account password, registrar access or the X account. Don't ask for them.
- The full site brief is in `MULE_site_prompt.md` (attached). The reference prototype is `mule-site.html`, the dossier page is `mule-dossier.html`. Follow the brief; this task covers building, deploying and the domain.

## What to do, in order

1. **Repository.** Create `github.com/mule-protocol/mule-site` (private until the owner says otherwise). Build the Astro project from the brief: current Astro, static output, no adapter. Dynamic parts are Pages Functions in `functions/` (`_middleware.ts`, `m/[id].ts` for the patch page and its share image). Port `mule-site.html` to `/` and `mule-dossier.html` to `/dossier`. Keep `LAUNCHED = false`.
2. **Deployment pipeline.** GitHub Actions with `cloudflare/wrangler-action`, using repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`:
   - push to `main` → production deployment of the Pages project `mule-site`;
   - any other branch → preview deployment (its own `*.pages.dev` URL).
   `main` is protected (pull requests only). Previews send `X-Robots-Tag: noindex` (via middleware when the host ends in `.pages.dev`).
3. **Custom domains.** Attach `muleprotocol.com` and `www.muleprotocol.com` to the Pages project. Cloudflare creates the DNS records itself; they stay **proxied** (orange cloud), which Pages needs. HTTPS is issued automatically.
4. **www redirect.** In a Pages Functions `_middleware.ts`, redirect any request whose host is `www.muleprotocol.com` to `https://muleprotocol.com` with the same path, status 301.
5. **Email protection.** The domain sends no email. Unless the owner has turned on Cloudflare Email Routing, add:
   - `TXT @` → `v=spf1 -all`
   - `TXT _dmarc` → `v=DMARC1; p=reject; adkim=s; aspf=s`
   - `TXT *._domainkey` → `v=DKIM1; p=`

   If Email Routing is on, keep the records it created and only add the `_dmarc` record. This stops anyone sending convincing fake emails from `@muleprotocol.com`.
6. **Headers.** Put the security headers from section 8 of the brief in a `_headers` file at the root of the build output. Check them with `curl -I https://muleprotocol.com`.
7. **Public from day one.** No password or access protection on production: `muleprotocol.com` is public and indexable as soon as it is live. Keep `LAUNCHED = false` so no contract address appears.
8. **Report back** with:
   - the production URL and one preview URL;
   - a screenshot of the Pages project's Custom domains tab showing both domains active;
   - the full DNS record list for the zone (exported, not edited);
   - the `curl -I` output for `https://muleprotocol.com` and `https://www.muleprotocol.com`;
   - the QA checklist from section 8 of the brief, each item marked done or not done with a reason.

## Rules

- Change nothing at the registrar, nothing in Cloudflare outside the Pages project and DNS records, and no DNS record you didn't create.
- No wallet connection, no third-party scripts besides the analytics in the brief.
- Never put the contract address anywhere until the owner sends it on launch day.
- If something in this task conflicts with the brief, stop and ask.
