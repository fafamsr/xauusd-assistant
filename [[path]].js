const UPSTREAM = 'https://biquote.io/api';
const ALLOWED = [
  /^XAUUSD$/,
  /^XAUUSD\/ohlc$/,
  /^calendar\/upcoming$/
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store, max-age=0'
};

export async function onRequest(context) {
  const { request, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return Response.json({ error: 'Méthode non autorisée' }, {
      status: 405, headers: corsHeaders
    });
  }

  const parts = params.path;
  const path = Array.isArray(parts) ? parts.join('/') : String(parts || '');

  if (!ALLOWED.some((rule) => rule.test(path))) {
    return Response.json({ error: 'Endpoint non autorisé' }, {
      status: 404, headers: corsHeaders
    });
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
        'User-Agent': 'XAUUSD-FAFA/9.2.0'
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    headers.set('X-FAFA-Data-Source', 'Biquote-proxy');

    return new Response(upstream.body, {
      status: upstream.status,
      headers
    });
  } catch (error) {
    return Response.json({
      error: 'Fournisseur de données indisponible',
      detail: String(error?.message || error)
    }, {
      status: 502, headers: corsHeaders
    });
  }
}
