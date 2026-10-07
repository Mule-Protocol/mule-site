// Only a validated mission may reach this helper. Query strings never multiply cache keys.
export async function cachedMissionImage(request, mission, cache, render) {
  const url = new URL(`/m/${mission.id}/og.png`, request.url);
  const key = new Request(url, { method: 'GET' });
  const cached = await cache.match(key);
  let response = cached;
  if (!response) {
    response = await render();
    // Finish the small write before returning, including when the first request is HEAD.
    if (response.ok) await cache.put(key, response.clone());
  }
  const headers = new Headers(response.headers);
  headers.set('X-MULE-OG-Cache', cached ? 'HIT' : 'MISS');
  return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers });
}
