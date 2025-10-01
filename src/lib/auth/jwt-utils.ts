/**
 * JWT utility functions for development and testing
 */

/**
 * Extract JWT token from browser storage for curl testing
 * @returns The current access token or null if not found
 */
export function extractJWTForTesting(): string | null {
  if (typeof window === 'undefined') {
    console.warn('extractJWTForTesting can only be called in browser environment')
    return null
  }

  // Try sessionStorage first, then cookies
  const sessionToken = sessionStorage.getItem('access_token')
  if (sessionToken) {
    return sessionToken
  }

  // Fallback to cookie
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'CognitoAuthAccessToken') {
      return value
    }
  }

  return null
}

/**
 * Generate curl command with current JWT token for API testing
 * @param endpoint - The API endpoint to test (e.g., '/api/tickets')
 * @param method - HTTP method (default: 'GET')
 * @param body - Request body for POST/PUT requests
 * @returns Formatted curl command string
 */
export function generateCurlCommand(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: object
): string {
  const token = extractJWTForTesting()
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'https://your-api-gateway.com'
  
  if (!token) {
    return '# No JWT token found. Please authenticate first.'
  }

  let curlCommand = `curl -X ${method} "${apiBase}${endpoint}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json"`

  if (body && (method === 'POST' || method === 'PUT')) {
    curlCommand += ` \\
  -d '${JSON.stringify(body, null, 2)}'`
  }

  return curlCommand
}

/**
 * Decode JWT payload (without verification - for debugging only)
 * @param token - JWT token string
 * @returns Decoded payload object or null if invalid
 */
export function decodeJWTPayload(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (error) {
    console.error('Failed to decode JWT payload:', error)
    return null
  }
}

/**
 * Check if JWT token is expired
 * @param token - JWT token string
 * @returns true if token is expired, false otherwise
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWTPayload(token)
  if (!payload || !payload.exp) {
    return true
  }

  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp < currentTime
}

/**
 * Get JWT claims for debugging
 * @returns Current JWT claims or null if no valid token
 */
export function getCurrentJWTClaims(): any | null {
  const token = extractJWTForTesting()
  if (!token) {
    return null
  }

  if (isJWTExpired(token)) {
    console.warn('JWT token is expired')
    return null
  }

  return decodeJWTPayload(token)
}

/**
 * Development helper: Log current authentication status
 */
export function debugAuthStatus(): void {
  if (typeof window === 'undefined') {
    console.log('debugAuthStatus can only be called in browser environment')
    return
  }

  console.group('🔐 Authentication Debug Info')
  
  const sessionToken = sessionStorage.getItem('access_token')
  const idToken = sessionStorage.getItem('id_token')
  const expiresAt = sessionStorage.getItem('token_expires_at')
  
  console.log('SessionStorage tokens:', {
    hasAccessToken: !!sessionToken,
    hasIdToken: !!idToken,
    expiresAt: expiresAt ? new Date(parseInt(expiresAt)).toISOString() : 'Not set'
  })

  if (sessionToken) {
    const claims = decodeJWTPayload(sessionToken)
    console.log('JWT Claims:', claims)
    console.log('Token expired:', isJWTExpired(sessionToken))
  }

  // Check cookies
  const cookieToken = document.cookie.split(';')
    .find(cookie => cookie.trim().startsWith('CognitoAuthAccessToken='))
  console.log('Cookie token present:', !!cookieToken)

  console.log('Curl command for testing:')
  console.log(generateCurlCommand('/api/dashboard'))
  
  console.groupEnd()
}

// Make debug function available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugAuth = debugAuthStatus;
  (window as any).extractJWT = () => extractJWTForTesting();
  (window as any).generateCurl = (endpoint: string, method?: string, body?: object) => 
    generateCurlCommand(endpoint, method as any, body);
}