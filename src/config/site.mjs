export const site = Object.freeze({
  THEME: 'LIGHT',
  LAUNCHED: false,
  LEGAL_PUBLISHED: false, // passer à true après validation par le conseil du propriétaire
  CONTRACT_ADDRESS: null,
  DOMAIN: 'muleprotocol.com',
  origin: 'https://muleprotocol.com',
  X_HANDLE: '@mule_protocol',
  X_URL: 'https://x.com/mule_protocol',
  PUMP_URL: null,
  DEXSCREENER_URL: null,
  GITHUB_URL: 'https://github.com/mule-protocol/mule-site',
  TREASURY_MULTISIG: null,
  REVIEW_PASS: 2,
});

// Token launch and search indexing are deliberately independent.
export function isProduction(environment = {}) {
  return environment.CF_PAGES === '1' && environment.CF_PAGES_BRANCH === 'main';
}

export function robotsText(environment) {
  return isProduction(environment)
    ? `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
}
