// Browser-QA policy only. The application and the real counter API are untouched.
export const COUNTER_PATH = '/api/mission-counter';
export const OFFLINE_COUNTER_ERROR = 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED';

export function isCounterRequest(request, origin) {
  if (!request || (request.method !== 'GET' && request.method !== 'POST')) return false;
  try {
    // Compare the complete URL: no alternate origin, query, fragment, credentials,
    // encoded path, suffix or trailing slash is exempt from the network checks.
    return request.url === new URL(COUNTER_PATH, origin).href;
  } catch { return false; }
}

export function isCounterResource(resource, requests, origin) {
  if (resource.initiatorType !== 'fetch') return false;
  // ResourceTiming omits the method. Require matching CDP evidence rather than
  // allowing every resource bearing the endpoint's name. The five-ms tolerance
  // covers the two browser clocks; an ambiguous disallowed method fails closed.
  const matches = requests.filter(request => request.url === resource.name
    && Number.isFinite(request.startTime)
    && Math.abs(request.startTime - resource.startTime) <= 5);
  return matches.length > 0 && matches.every(request => isCounterRequest(request, origin));
}

export function offlineCounterRequestForLog(entry, requests, origin) {
  if (entry.source !== 'network' || entry.level !== 'error'
    || entry.text !== OFFLINE_COUNTER_ERROR || typeof entry.networkRequestId !== 'string') return null;
  return requests.find(request => request.id === entry.networkRequestId
    && request.url === entry.url && isCounterRequest(request, origin)
    && request.offline === true && request.failed === true
    && request.failure === 'net::ERR_INTERNET_DISCONNECTED') || null;
}

export function classifyBrowserErrors(errors, networkLogs, requests, origin) {
  const unexpected = [], allowedCounterErrors = [], usedLogs = new Set();
  for (const error of errors) {
    // Runtime exceptions and JS console.error never become counter exceptions:
    // only the native network message at the endpoint, backed by its CDP ID, can.
    const logIndex = error.kind === 'console' && error.message === OFFLINE_COUNTER_ERROR
      ? networkLogs.findIndex((entry, index) => !usedLogs.has(index)
        && entry.url === error.url && entry.text === error.message
        && Number.isFinite(entry.timestamp) && Number.isFinite(error.observedAt)
        && Math.abs(entry.timestamp - error.observedAt) <= 2000
        && offlineCounterRequestForLog(entry, requests, origin))
      : -1;
    if (logIndex < 0) unexpected.push(error);
    else {
      usedLogs.add(logIndex);
      const entry = networkLogs[logIndex];
      const request = offlineCounterRequestForLog(entry, requests, origin);
      allowedCounterErrors.push({ ...error, requestId: request.id, url: request.url,
        method: request.method, failure: request.failure, nativeLogTimestamp: entry.timestamp });
    }
  }
  const unexpectedNetworkErrors = networkLogs.filter(entry => !offlineCounterRequestForLog(entry, requests, origin));
  return { unexpected, allowedCounterErrors, unexpectedNetworkErrors };
}
