# MULE — Website build brief

> Paste this whole document to the agent building the site.
> Settings to fill in before sending are marked `<<LIKE_THIS>>`.

```
THEME            = LIGHT         # LIGHT | DARK | HYBRID (light site, dark console + telemetry sections)
LAUNCHED         = false         # false = contract address hidden, "published at launch" notice shown
CONTRACT_ADDRESS = <<CA>>
X_HANDLE         = @mule_protocol
PUMP_URL         = <<url>>
DEXSCREENER_URL  = <<url>>
GITHUB_URL       = <<url>>
TREASURY_MULTISIG= <<address>>
DOMAIN           = muleprotocol.com
```

---

## 1. Role and goal

You are a senior frontend engineer and art director. Build the marketing site for **MULE**, a Solana project: an escrow and settlement protocol that pays AI agents only when their work passes predefined acceptance criteria. The product is in development. The site must:

1. Make the concept understood in under 10 seconds, on a phone.
2. Look like nothing else in the AI/crypto space. No generic "AI-generated website" look.
3. Build trust: honest status, public treasury, no promises of returns.
4. Generate shares on X (the mission patch, section 5.5).

Work in two passes. **Pass 1:** sections 5.1 (hero) and 5.3 (mission lifecycle) only, deployed to a preview URL, then stop for review. **Pass 2:** everything else.

---

## 2. Brand platform

- **Name / ticker:** MULE / $MULE
- **Concept:** "Autonomous Cargo". The mascot is a quadruped cargo robot shaped like a mule (real-world nickname for legged cargo robots: "robot mules"). Its long ears are sensor antennas, which are its visual signature.
- **Personality:** stubborn, reliable, dry humor. A mule won't move until it's satisfied, and neither will the escrow.
- **Tagline:** Pay AI agents on delivery.
- **Signature:** Stubborn by design.
- **Voice:** short, declarative, operational. Mission-control vocabulary: mission, payload, lock, transit, inspect, settle, returned. Never hype: no "revolutionary", "next-gen", "seamless", "unlock", "to the moon", no emoji.
- **Visual references (study, don't copy):** NASA Graphics Standards Manual (1975), Teenage Engineering, Nothing (dot-matrix), The Designers Republic (Wipeout), the UI design of the TV series *Andor*.

---

## 3. Design system

### 3.1 Color tokens

Light ("Day ops"):
```
--bg:        #E9E8E3   bone
--bg-2:      #DEDDD7   panel
--ink:       #0E0E0E   text, lines
--ink-2:     #4A4A45   secondary text
--line:      rgba(14,14,14,.12)
--grid:      rgba(14,14,14,.07)
--signal:    #FF4F00   international orange
--signal-ink:#C23A00   orange for SMALL text on light bg (contrast)
--ok:        #0E0E0E   settled = ink + ✓ (no green)
```

Dark ("Night ops"):
```
--bg:        #0F0F0E   graphite
--bg-2:      #181816   panel
--ink:       #E9E8E3   bone
--ink-2:     #B9B8B1
--line:      #2A2A27
--grid:      rgba(233,233,227,.06)
--signal:    #FF4F00
--signal-ink:#FF4F00
```

HYBRID = light everywhere, dark for the mission console (5.4) and telemetry (5.8). The switch between them is a hard cut with a thin orange rule, never a gradient.

Rules:
- One vivid color only (orange). It covers at most ~5% of any screen: CTAs, payload, status, one detail per section.
- `#FF4F00` on bone fails WCAG AA for small text: use `--signal-ink` for orange text under 18px.
- No other colors. No green "success", no purple, no blue links.

### 3.2 Typography

Self-host via Fontsource, subset to Latin, `font-display: swap`, preload the hero fonts only.

| Role | Font | Use |
|---|---|---|
| Display | **Archivo**, width 125%, weight 800 | Headlines, uppercase, tight leading (0.95–1.0), letter-spacing -0.02em |
| Data / UI | **Azeret Mono** 400/600 | Labels, body copy, buttons, captions, uppercase labels with +0.08em tracking |
| Numerals / logo | **Doto** 700/900 (dot-matrix) | Logo, counters, mission IDs, ticker, telemetry figures |

Scale (mobile → desktop): H1 44 → 112px, H2 32 → 64px, body 14 → 16px, labels 10 → 12px. Use `clamp()`.

### 3.3 Graphic language

- 24px background grid (1px lines at `--grid`), visible everywhere.
- Square corners everywhere (`border-radius: 0`). 1px rules. Corner crop marks around key visuals.
- Technical callouts: thin leader lines from an object to a mono label ("ESCROW 5.00 USDC").
- Status lights: small square blinking with `steps(1)`, never a soft pulse.
- Section numbering: `02 / PROBLEM`, `03 / LIFECYCLE`, etc. in mono, top-left of each section.

### 3.4 Forbidden (hard rules)

Inter, Geist, Space Grotesk, Instrument Sans, Poppins · rounded cards · pill badges · gradients · glassmorphism · glow/neon · blur · drop shadows · purple · glowing orbs · 3D grid floors · Lucide/Heroicons/Tabler icons · emoji · centered hero with two buttons · 3-column feature card grid · bento grids · fade-in-on-scroll applied to everything · stock 3D renders · "Trusted by" logo strips.

If you need an icon, draw a custom 1px-stroke SVG in the technical style.

---

## 4. Tech and quality bar

- **Stack:** Astro + TypeScript, vanilla CSS with custom properties (no Tailwind default look), GSAP + ScrollTrigger for scroll sequences, Rive (or a sprite/SVG fallback) for the mascot, deployed on Cloudflare Pages: current Astro in static output mode, no adapter; dynamic parts (`/m/[id]`, share images, www redirect, later the console API) are Pages Functions in `functions/`. Analytics: Cloudflare Web Analytics (free, cookieless).
- **Performance (mobile, 4G throttled):** Lighthouse Performance ≥ 90, LCP < 2.0s, CLS < 0.05, initial JS < 120 KB gzipped, total initial weight < 1.5 MB. Lazy-load everything below the hero.
- **Mobile first:** design at 375px first, then 768 and 1440. No horizontal scroll at 360px. Tap targets ≥ 44px.
- **Motion:** every animation has a purpose. Full `prefers-reduced-motion` fallback (static frames, no scroll pinning).
- **Accessibility:** semantic HTML, keyboard navigable, visible focus states (2px orange outline, square), alt text, AA contrast.
- **Transparent video warning:** if the mascot ships as video, WebM alpha doesn't work on Safari. Prefer Rive or SVG; otherwise provide HEVC-alpha for Safari.
- **SEO / sharing:** title, description, canonical, Open Graph and Twitter `summary_large_image` cards for every page (1200×630, designed in the brand style, not a screenshot), favicon set (SVG + PNG + apple-touch), `robots.txt`, `sitemap.xml`.
- **Config:** all links and addresses come from one config file (the settings block at the top).

### 4.1 Reference prototype and motion

`mule-site.html` is a working one-file prototype of this brief, including every animation below. Port it into the Astro build and keep its behaviour; improve the code, not the look.

- **Hero:** the mule walks in place (legs alternate, body bobs), antenna tips blink, the sensor eye blinks every few seconds, an orange scan line sweeps the drawing top to bottom, callout lines draw in on load.
- **Section numbers:** flip like a split-flap board when they enter the screen.
- **Problem:** the word "hope" gets struck through in orange.
- **Lifecycle:** pinned scroll sequence; the mule walks between stations, LOCKED stamps onto the crate, a scan sweeps the crate at INSPECT, both outcomes stamp at SETTLE.
- **Console:** log lines type in, the result stamp lands with a short shake, the mission patch unfolds.
- **Telemetry:** pending values scramble into place once.
- **Nav:** a 2px orange scroll-progress line under the bar.
- **Buttons:** ink fill sweeps in left to right in steps.
- **Cursor trail (desktop only):** the 24px grid intersections the pointer crosses light up as ink dots and fade in four steps, with an orange square at the pointer. Off on touch screens and under `prefers-reduced-motion`.
- All blinks and wipes use `steps()` timing, never soft fades.

---

## 5. Page structure and copy

All site copy in English, exactly as written unless marked as placeholder.

### 5.0 Nav (sticky, 48px, 1px bottom rule)
Left: `MULE` in Doto 900. Center (desktop): `MISSION · PROTOCOL · $MULE · DOSSIER` (anchor links). Right: status light + `DEVNET · SIM` (pre-product) and a `BUY $MULE` text link only when `LAUNCHED = true`. Mobile: logo + status + menu button opening a full-screen mono menu.

### 5.1 Hero — `01 / UNIT M-1`
Layout: asymmetric. Text left (7 cols), mascot right (5 cols). On mobile, the mascot sits above the text, cropped tight.
- Eyebrow (orange, mono): `UNIT M-1 / AUTONOMOUS SETTLEMENT`
- H1: `PAY AI AGENTS ON DELIVERY.`
- Sub: `Stubborn by design. Funds stay locked until the work checks out.`
- CTA primary (orange fill, ink text): `RUN A MISSION →` (scrolls to 5.4)
- CTA secondary (1px outline): `READ THE DOSSIER` (links to the `/dossier` page, see section 6; never a PDF or any downloadable file)
- Mascot: the robot mule walking in place (loop), with callouts `CRITERIA: SCHEMA v1`, `ESCROW 5.00 USDC`, `M-1 · STATUS: IN TRANSIT`. Until the final mascot asset exists, use a clean SVG line-art placeholder.
- Contract address bar under the CTAs:
  - `LAUNCHED = false`: `CONTRACT ADDRESS: PUBLISHED AT LAUNCH. ONLY TRUST THIS SITE AND <<X_HANDLE>>.`
  - `LAUNCHED = true`: the CA in mono, truncated on mobile, with a `COPY` button (confirmation: `COPIED`).
- Bottom: full-width ticker (inverted colors) scrolling simulated missions: `MSN-0041 SETTLED ✓ 5.00 USDC ▸ MSN-0042 IN TRANSIT ▸ MSN-0040 RETURNED 1.00 USDC`. Label it `SIMULATED FEED` at its left edge.

### 5.2 Problem — `02 / PROBLEM`
Big type, nothing else on screen.
- H2: `AGENTS CAN DO THE WORK. NOBODY CAN TRUST THEM WITH THE MONEY.`
- Two short columns:
  - `PAY UPFRONT` — `The agent can walk away with it.`
  - `PAY AFTER` — `The agent has to trust you.`
- Closing line: `Today, agent commerce runs on hope. MULE runs on rules.`

### 5.3 Mission lifecycle — `03 / LIFECYCLE` (signature section)
Pinned scroll sequence (desktop and mobile). The mascot carries the payload through 5 stations along a horizontal track; a progress rail shows `01 → 05`. Each step swaps the caption and the mascot state.

| # | Label | Caption | Visual state |
|---|---|---|---|
| 01 | LOAD | Define the job and the acceptance criteria. | Crate lands on the mule's back, criteria label attaches |
| 02 | LOCK | Funds go into escrow. Nobody can touch them. | Crate locks, orange `LOCKED` stamp |
| 03 | TRANSIT | The agent does the work and submits the delivery. | Mule walks, ticker of telemetry |
| 04 | INSPECT | The validator checks it against the criteria. No vibes. Rules. | Scan line passes over the crate, checklist ticks |
| 05 | SETTLE | Pass: the agent gets paid. Fail: you get refunded. | Split ending: `SETTLED ✓` or `RETURNED`, both shown |

Reduced-motion fallback: the five steps stacked as a static numbered list with still frames.

### 5.4 Mission console — `04 / CONSOLE` (dark in HYBRID)
A front-end **simulation** of the product. Clearly labelled: `SIMULATION · NO REAL FUNDS · DEVNET VERSION IN DEVELOPMENT`.
- Inputs: mission template (`Extract an invoice to JSON` / `Summarize a contract into 5 fields` / `Normalize a list of addresses`), agent behavior toggle `HONEST` / `DISHONEST`, button `LAUNCH MISSION · 5.00 dUSDC`.
- On launch, a step log fills line by line (~0.8s per step), terminal-style but in brand typography:
  `[01] ESCROW LOCKED — 5.00 dUSDC — tx 4hQ…92` → `[02] MISSION ACCEPTED — AGENT MULE-01` → `[03] DELIVERY SUBMITTED — hash 0x9f…` → `[04] INSPECTION — 6/6 FIELDS VALID` (or `5/6 — MISSING: total_amount`) → `[05] SETTLED — PAID TO AGENT` (or `RETURNED — REFUNDED TO CLIENT`).
- Transaction hashes are random and visibly fake (no explorer links in simulation mode). Structure the code so a real devnet backend can replace the simulator later behind the same interface (`runMission(template, behavior) → AsyncIterable<Step>`).
- Final state shows a large stamp (`SETTLED ✓` / `RETURNED`) and the button `GET YOUR MISSION PATCH →`.

### 5.5 Mission patch — share loop
- After a console run, generate a unique "mission patch": a circular/hexagonal embroidered-patch-style badge in brand style, with the mission number (`MSN-0042`), status, template name, date, and the mule silhouette.
- Route `/m/[id]` with a dynamic OG image (1200×630) generated server-side in a Pages Function (a Workers-compatible OG library such as `workers-og`), so sharing the link on X shows the patch.
- Buttons: `SHARE ON X` (web intent, prefilled: `My agent got paid on delivery. Mission MSN-0042 settled. <<url>> <<X_HANDLE>>` — or the `RETURNED` variant: `My dishonest agent got nothing. Stubborn by design.`) and `DOWNLOAD PNG`.
- Patch IDs are sequential-looking but generated client-side in simulation mode. No personal data collected.

### 5.6 $MULE — `05 / $MULE`
- H2: `THE PROTOCOL'S COLLATERAL.`
- Three rows (not cards), each with a number, a label and one line. Status tag on each: `PLANNED`.
  - `BOND` — Agents stake $MULE to take on larger missions. Bad deliveries cost them.
  - `ARBITRATE` — Validators stake $MULE to resolve disputes. Dishonest rulings get slashed.
  - `GOVERN` — Holders vote on mission categories and protocol parameters.
- Funding block: `MULE launched on pump.fun. Creator fees go to a public multisig and are spent against published milestones. Every spend is reported.` + link to 5.8.
- Notice (small mono): `$MULE has no promised value, yield or return. These utilities are planned and not live.`

### 5.7 Mission log (roadmap) — `06 / MISSION LOG`
A vertical log, newest at top, status as mono tags. No dates.
- `M-0 BRAND, SITE AND DOSSIER — DELIVERED ✓`
- `M-1 DEVNET ESCROW PROGRAM + LIVE CONSOLE — IN TRANSIT`
- `M-2 SECURITY AUDIT — QUEUED`
- `M-3 MAINNET BETA, ONE MISSION CATEGORY — QUEUED`
- `M-4 BONDS AND ARBITRATION — QUEUED`

### 5.8 Telemetry (transparency) — `07 / TELEMETRY` (dark in HYBRID)
Dot-matrix figures, like an instrument panel. Values are placeholders until live; label them `PENDING LAUNCH`.
- `TREASURY MULTISIG` — <<TREASURY_MULTISIG>> (copy button + explorer link)
- `CREATOR FEES RECEIVED` / `SPENT` / `BALANCE` — placeholder
- `TEAM TOKENS LOCKED` — placeholder % + unlock date + lock link
- `LAST MISSION REPORT` — link
- `SOURCE CODE` — <<GITHUB_URL>>

### 5.9 FAQ — `08 / FAQ`
Accordion with square +/− markers.
- **Is MULE live?** Not yet. The console on this site is a simulation. The devnet version is in development and will be announced on <<X_HANDLE>>.
- **What does MULE actually do?** It holds payment in escrow until an AI agent's delivery passes criteria agreed upfront, then pays the agent or refunds the client.
- **Can it judge any kind of work?** No. MULE starts with work that can be checked automatically, like structured data extraction. Disputes go to human review at first.
- **What is $MULE for?** Bonds for agents, stakes for validators, and governance. These are planned, not live.
- **Is $MULE an investment?** No. It's a utility token for a protocol in development, with no promised value or returns. Only buy what you can afford to lose.
- **Where do the creator fees go?** To a public multisig, spent against the mission log milestones. See Telemetry.
- **Will this site ask me to connect a wallet?** No. Nothing on this site needs a wallet, and we will never ask you to connect one or sign anything to claim tokens. If a page does, it isn't us.
- **How do I avoid scams?** The only official contract address is on this site and in the pinned post of <<X_HANDLE>>. We will never DM you first.

### 5.10 Footer
Logo, links (X, GitHub, Dossier, pump, DexScreener — hide the last two while `LAUNCHED = false`), and legal notice:
`$MULE is a utility token for the MULE protocol, currently in development. Nothing on this site is financial advice, an offer, or a promise of value or returns. The console is a simulation. Crypto-assets are volatile and you may lose everything you put in.`

---

## 6. Assets (to be supplied; use placeholders until then)

| Asset | Format | Placeholder until supplied |
|---|---|---|
| Mascot walk loop | `.riv` (preferred) or SVG sprite | SVG line art |
| Mascot states (load, locked, scan, settled, returned) | `.riv` states or SVG | SVG line art |
| Mascot head icon | SVG | Simple geometric SVG |
| OG images | 1200×630 PNG | Generated in brand style |
| Litepaper ("Dossier") | Web page at `/dossier`, ported from `mule-dossier.html` into the site's components | Provided (`mule-dossier.html`) |

---

## 7. Deliverables and acceptance

1. Git repository with a README (setup, config, deploy).
2. Cloudflare Pages preview URL.
3. Pass 1 review screenshots at 375, 768 and 1440px, and a 20s screen recording of the lifecycle scroll.
4. Lighthouse mobile report meeting section 4.
5. A short list of anything you couldn't do or chose differently, and why.

**Definition of done:** a first-time visitor on a phone understands "agents get paid only when the work checks out" before scrolling past section 5.3, and nobody could mistake the site for a template.

---

## 8. Production

Ship in this order. Each step ends with something the owner can check.

1. **Final mascot.** Replace the line-art placeholder with the final Unit M-1 assets (hero walk loop, lifecycle states, head icon) once they exist. Until then, keep the placeholder; don't block the rest on it.
2. **Port.** Rebuild `mule-site.html` in Astro. Pages: `/` (the landing), `/dossier` (ported from `mule-dossier.html`), `/m/[id]` (mission patch share page), `404`. Keep every animation from section 4.1.
3. **Staging.** Deploy every branch to a Cloudflare Pages preview. Production branch protected. Previews carry `noindex` and are never linked publicly. Production itself is public, with no password.
4. **Domain.** `DOMAIN` from the settings block, apex + `www` redirect, HTTPS only. Registrar lock, DNSSEC and any defensive domain are handled by the owner at the registrar, not by the builder.
5. **QA** (checklist below), then the owner signs off.
6. **Launch day:** set `CONTRACT_ADDRESS`, flip `LAUNCHED = true`, redeploy, check the address on the live site character by character against the pump.fun page, then post.

### Accounts and security

Account takeover is the most common way crypto launches get hijacked.

- 2FA with an authenticator app or hardware key (never SMS) on the Cloudflare (registrar, DNS, Pages), GitHub and X accounts. Recovery codes stored offline.
- At least two people with owner access to each account, no shared passwords.
- The site never asks visitors to connect a wallet or sign anything before the product exists. Say so in the FAQ.

### Headers and third parties

- Security headers: `Content-Security-Policy` allowing only self, the font files and the analytics domain; `Strict-Transport-Security`; `X-Frame-Options: DENY`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` denying camera, microphone, geolocation and payment.
- No third-party scripts besides analytics. Fonts self-hosted.
- Analytics: Cloudflare Web Analytics (cookieless). Have counsel confirm no consent banner is needed.

### Share images and icons

- Static share cards: export `Share card · site` and `Share card · dossier` from the MULE X Kit canvas as PNG 1200×630, fill in `[DOMAIN]`, use them as `og:image` / `twitter:image` on `/` and `/dossier`.
- Dynamic share card for `/m/[id]`: generated in a Pages Function (`workers-og` or similar) in the same style (patch, mission ID, status).
- Icons from the brand system: `mule-favicon.svg`, plus PNG 32, 180 (apple-touch), 192 and 512, and a web manifest.

### Legal pages (France)

French law requires a "Mentions légales" page on any public site: publisher identity, publication director, host (name and address of Cloudflare, Inc.), contact. Add it, plus a short privacy notice and a risk disclosure page linked from the footer. Counsel writes or reviews all three before launch.

### QA checklist

- iOS Safari, Android Chrome, desktop Chrome, Firefox and Safari; widths 360, 768, 1440.
- Reduced motion on: no animation, lifecycle readable, no cursor trail.
- Keyboard only: every link, button, console control and FAQ item reachable with a visible focus.
- Lighthouse mobile ≥ 90 on `/` and `/dossier`.
- No encoding errors (every page declares UTF-8; look for "Â" and "â€").
- Console: honest and dishonest runs on all three templates, patch renders, X share link opens with the right text.
- Every external link correct; no placeholder `[BRACKETS]` left in production.
- Share cards show correctly when the URL is pasted into a draft post on X.

### After launch

- Uptime monitor on `/` with alerts to two people.
- Telemetry section updated with each weekly mission report.
- Any change to the contract address display goes through two people.
