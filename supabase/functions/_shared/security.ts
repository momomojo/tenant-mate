// Shared security utilities for Edge Functions

// SEC-02: HTML encoding to prevent XSS
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// SEC-07: Payment amount validation
export function validatePaymentAmount(amount: unknown): number {
  if (amount === null || amount === undefined) {
    throw new Error('Payment amount is required')
  }

  const numAmount = Number(amount)

  if (isNaN(numAmount)) {
    throw new Error('Payment amount must be a valid number')
  }

  if (numAmount <= 0) {
    throw new Error('Payment amount must be greater than zero')
  }

  if (numAmount > 100000) {
    throw new Error('Payment amount exceeds maximum allowed')
  }

  // Round to 2 decimal places to avoid floating point issues
  return Math.round(numAmount * 100) / 100
}

// SEC-06: Simple in-memory rate limiter per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(userId: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

// Generic safe error response (don't leak internal details)
export function safeErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  status = 400
): Response {
  // Log full error server-side
  console.error('Edge Function error:', error)

  // Return generic message to client
  const message = error instanceof Error && isClientSafeError(error.message)
    ? error.message
    : 'An error occurred processing your request'

  return new Response(
    JSON.stringify({ error: message }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  )
}

// Only allow known safe error messages through to the client
function isClientSafeError(message: string): boolean {
  const safeMessages = [
    'Not authenticated',
    'Payment amount is required',
    'Payment amount must be a valid number',
    'Payment amount must be greater than zero',
    'Payment amount exceeds maximum allowed',
    'Payment ID is required',
    'Payment not found',
    'Unit not found',
    'You are not assigned to this unit',
    'Rate limit exceeded',
    'Unit ID is required',
  ]
  return safeMessages.includes(message)
}
