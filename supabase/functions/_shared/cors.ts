// Shared CORS configuration for Edge Functions
// SEC-04: Restrict CORS to allowed origins only

// Default allowed origins - can be overridden via ALLOWED_ORIGINS env var
const DEFAULT_ORIGINS = [
  'https://tenant-mate.vercel.app',
  'https://momomojo.github.io',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:4173',
]

// Load origins from env var (comma-separated) or use defaults
const envOrigins = Deno.env.get('ALLOWED_ORIGINS')
export const ALLOWED_ORIGINS = envOrigins
  ? envOrigins.split(',').map(o => o.trim()).filter(Boolean)
  : DEFAULT_ORIGINS

/**
 * Returns a safe, validated origin from the request.
 * Falls back to the primary production origin if not in allowlist.
 */
export function getSafeOrigin(req: Request): string {
  const origin = req.headers.get('origin') ?? ''
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  }
}

export function handleCorsPreflightOrRestrict(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) })
  }
  return null
}
