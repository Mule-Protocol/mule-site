# MULE website

Astro 7, static output, TypeScript, self-hosted fonts and GSAP. Cloudflare Pages Functions live in `functions/`; there is no Astro hosting adapter.

Current delivery is **pass 1: hero and mission lifecycle**. The brief requires owner review before the dossier, console, patch pages and remaining sections. `LAUNCHED` is false and the contract address is absent.

## Run locally

Use Node from `.node-version`.

```sh
npm ci
npm run dev
```

Build and check:

```sh
npm test
npm run build
npx wrangler pages dev dist
```

`wrangler pages dev` serves the real Pages Functions locally. `npm run preview` serves Astro's static output only. The optional QA server (`node scripts/qa-server.mjs`, port 4321) simulates response headers and gzip for browser measurements; it is not the Cloudflare runtime.

## Configuration

Edit `src/config/site.mjs` for links, theme, domain and launch state. Keep unknown addresses and unavailable links null. Publishing the website and launching the token are separate actions.

- A build with `CF_PAGES=1` and `CF_PAGES_BRANCH=main` is indexable.
- All other builds use `noindex` and `robots.txt: Disallow: /`.
- The Pages middleware adds `X-Robots-Tag: noindex, nofollow` outside the apex domain, including production's `pages.dev` alias.
- `www.muleprotocol.com` redirects to HTTPS apex with status 301, preserving path and query.
- Security headers are defined in `public/_headers` and `src/server/response-policy.mjs`, because Pages static headers do not cover Function responses.

Fonts and supplied brand assets are local. No wallet connection or third-party scripts are included. Cloudflare Web Analytics is pending deployment configuration; the CSP allows only its documented script and beacon endpoints besides self.

## Deploy with GitHub Actions

Repository: `Mule-Protocol/mule-site`, public by the owner's instruction of October 7, 2026, so branch protections can be enforced on the free plan. Cloudflare Pages project: `mule-site`, production branch `main`, Direct Upload mode managed by GitHub Actions.

1. The repository and Pages project exist, with `main` as the production branch.
2. Store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository Actions secrets. Never put their values in code or files.
3. Push the pass 1 implementation to `codex/pass-1` to create its preview. Review it before merging the complete site to `main`.
4. Protect `main`: require pull requests and the `Validate` check; do not permit force pushes, branch deletion or administrator bypass.
5. After the brief's review gates, attach apex and www to Pages, retain proxied DNS records created for Pages, verify HTTPS and the 301. Existing unrelated DNS records must remain untouched.

`.github/workflows/deploy.yml` pins checkout, Node setup and `cloudflare/wrangler-action` to reviewed tag commits. Pull requests validate; pushes validate and deploy. Wrangler reads the checked-out Git branch. The workflow summary contains the deployment URL and branch alias.

The project does not configure registrar settings, DNSSEC, account access, billing, additional domains, or email routing. Email DNS protections must be applied only after checking existing records and the routing state.

## Review evidence

See `docs/QA-PASS-1.md`. Local artifacts are generated in `artifacts/pass-1/` and intentionally excluded from Git. Browser QA uses Playwright; install its Chromium engine before running `npm run qa`. Run `node scripts/lighthouse.mjs` against the QA server for the mobile report.

`reference/` holds the supplied brief, deployment prompt and prototypes. `provenance.json` records their hashes. SVG mascot artwork remains the supplied line-art placeholder. Icons and share cards come from the supplied MULE marketing kit.

The `sharp` override keeps the direct package and Wrangler's local simulator on the patched 0.35.5 release. It does not add image processing to the deployed site.

## Next pass

After pass 1 approval: `/dossier`, console simulation, `functions/m/[id].ts` and dynamic share image, remaining landing sections, legal/privacy/risk pages, full browser QA and deployment evidence. Future M-1 APIs belong in `functions/api/`; they are not part of this marketing-site pass.

References: [Astro static deployment](https://docs.astro.build/en/guides/deploy/), [Pages local development](https://developers.cloudflare.com/pages/functions/local-development/), [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/), [Wrangler Action](https://github.com/cloudflare/wrangler-action).
