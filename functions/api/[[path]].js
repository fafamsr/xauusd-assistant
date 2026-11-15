
const UPSTREAM = 'https://biquote.io/api';
const ALLOWED = [
  /^XAUUSD$/,
  /^XAUUSD\/ohlc$/,
  /^calendar\/upcoming$/
];

export async function onRequest(context) {
  const { request, params } = context;
  const parts = params.path;
  const path = Array.isArray(parts) ? parts.join('/') : String(parts || '');

  if (!ALLOWED.some((rule) => rule.test(path))) {
    return Response.json({ error: 'Endpoint non autorisé' }, { status: 404 });
  }

  const incoming = new URL(request.url);
  const target = new URL(`${UPSTREAM}/${path}`);

  for (const [key, value] of incoming.searchParams) {
    if (key !== 'v') target.searchParams.set(key, value);
  }

  try {
    const upstream = await fetch(target.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'XAUUSD-FAFA/9.0'
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    const headers = new Headers(upstream.headers);
    headers.set('Cache-Control', 'no-store, max-age=0');
    headers.set('X-FAFA-Data-Source', 'Biquote-proxy');
    headers.delete('Access-Control-Allow-Origin');

    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch (error) {
    return Response.json({
      error: 'Fournisseur de données indisponible',
      detail: String(error?.message || error)
    }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
