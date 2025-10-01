import {
  UploadUrlResponse,
  CreateTicketResponse,
  TicketPayload,
  DashboardApiResponse,
  TicketsApiResponse,
  TicketsQueryParams,
  AIPreviewRequest,
  AIPreviewResponse,
  BedrockAgentResponse
} from './types'
import { getTokenFromCookie } from '@/lib/auth/token-capture'

// Environment configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''
const MAX_UPLOAD_MB = (() => {
  const envValue = process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || '5'
  const parsed = parseInt(envValue, 10)
  return isNaN(parsed) ? 5 : parsed
})()
const REQUEST_TIMEOUT = 10000 // 10 seconds

// Error types for better error handling
class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

// User-friendly error message transformation
function transformErrorMessage(error: unknown): string {
  if (error instanceof TimeoutError) {
    return 'Request timed out. Please check your connection and try again.'
  }

  if (error instanceof NetworkError) {
    return 'Unable to connect to the server. Please check your internet connection.'
  }

  if (error instanceof APIError) {
    // Transform common API error codes to user-friendly messages
    switch (error.code) {
      case 'AUTH_REQUIRED':
        return 'Your session has expired. You will be redirected to sign in.'
      case 'INVALID_FILE_TYPE':
        return 'The selected file type is not supported. Please use PNG, JPEG, or WebP images.'
      case 'FILE_TOO_LARGE':
        return 'The file is too large. Please select a smaller image.'
      case 'VALIDATION_ERROR':
        return 'Please check your form data and try again.'
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment and try again.'
      default:
        return error.message || 'An error occurred while processing your request.'
    }
  }

  // Generic fallback
  return 'Something went wrong. Please try again.'
}

// Get authorization headers for API calls
function getAuthHeaders(): Record<string, string> {
  // Use ID token for JWT authorization (required by HTTP API Gateway JWT authorizer)
  let idToken = null
  
  if (typeof window !== 'undefined') {
    idToken = sessionStorage.getItem('id_token') || getTokenFromCookie('CognitoAuthIdToken')
  }
  
  if (idToken) {
    return {
      'Authorization': `Bearer ${idToken}`
    }
  }
  return {}
}

// Handle authentication errors by redirecting to auth flow
function handleAuthError(): void {
  if (typeof window !== 'undefined') {
    // Clear invalid tokens from both storage locations
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('id_token')
    sessionStorage.removeItem('token_expires_at')
    
    // Clear cookies as well
    document.cookie = 'CognitoAuthAccessToken=; Max-Age=0; Path=/'
    document.cookie = 'CognitoAuthIdToken=; Max-Age=0; Path=/'
    document.cookie = 'lc_session=; Max-Age=0; Path=/'
    
    // Redirect to auth flow
    window.location.href = '/auth/start'
  }
}

// Check if user is authenticated
function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  
  const sessionIdToken = sessionStorage.getItem('id_token')
  const cookieIdToken = getTokenFromCookie('CognitoAuthIdToken')
  const tokenExpiresAt = sessionStorage.getItem('token_expires_at')
  
  // Check if we have a token
  const hasToken = !!(sessionIdToken || cookieIdToken)
  
  // Check if token is not expired
  if (hasToken && tokenExpiresAt) {
    const expiresAt = parseInt(tokenExpiresAt, 10)
    const isExpired = Date.now() >= expiresAt
    if (isExpired) {
      console.log('JWT token has expired, clearing session')
      handleAuthError()
      return false
    }
  }
  
  return hasToken
}

// Fetch with timeout wrapper
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT,
  requireAuth: boolean = true
): Promise<Response> {
  // Check authentication before making request (skip for public endpoints)
  if (requireAuth && !isAuthenticated()) {
    console.warn('No authentication token found, redirecting to auth flow')
    handleAuthError()
    throw new APIError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    // Only add auth headers for protected endpoints
    if (requireAuth) {
      Object.assign(headers, getAuthHeaders())
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TimeoutError('Request timed out')
      }
      if (error.message.includes('fetch')) {
        throw new NetworkError('Network connection failed')
      }
    }

    throw error
  }
}

// Parse API response with error handling
async function parseAPIResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    let errorCode: string | undefined

    try {
      const errorData = await response.json()
      if (errorData.message) {
        errorMessage = errorData.message
      }
      if (errorData.code) {
        errorCode = errorData.code
      }
    } catch {
      // If we can't parse the error response, use the status text
    }

    // Handle authentication errors
    if (response.status === 401) {
      console.warn('JWT authentication failed, redirecting to auth flow')
      handleAuthError()
      throw new APIError('Authentication required', response.status, 'AUTH_REQUIRED')
    }

    throw new APIError(errorMessage, response.status, errorCode)
  }

  try {
    return await response.json()
  } catch (error) {
    throw new APIError('Invalid response format from server')
  }
}

// Retry logic with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Don't retry on certain error types
      if (error instanceof APIError && error.status && error.status >= 400 && error.status < 500) {
        // Client errors (4xx) shouldn't be retried
        throw error
      }

      if (attempt === maxRetries) {
        throw error
      }

      // Exponential backoff: wait longer between retries
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Get a pre-signed URL for uploading a file to S3 (protected endpoint - requires JWT authentication)
 * @param filename - The name of the file to upload
 * @param contentType - The MIME type of the file
 * @param sizeKB - The size of the file in kilobytes
 * @returns Promise<UploadUrlResponse> - Contains upload_url and s3_key
 */
export async function getUploadUrl(
  filename: string,
  contentType: string,
  sizeKB: number
): Promise<UploadUrlResponse> {
  const url = `${API_BASE}/api/upload-url`

  const requestBody = {
    filename,
    contentType,
    sizeKb: sizeKB
  }

  return withRetry(async () => {
    // Protected endpoint - requires JWT authentication
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    return parseAPIResponse<UploadUrlResponse>(response)
  })
}

/**
 * Upload a file directly to S3 using a pre-signed URL
 * @param putUrl - The pre-signed URL for uploading
 * @param file - The file to upload
 */
export async function uploadFileToS3(putUrl: string, file: File): Promise<void> {
  return withRetry(async () => {
    // Enhanced diagnostic logging
    console.log('=== S3 Upload Debug Info ===')
    console.log('Upload URL:', putUrl)
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    })
    console.log('Current origin:', window.location.origin)
    console.log('Request headers:', {
      'Content-Type': file.type,
      'Content-Length': file.size
    })

    // Use direct fetch for S3 uploads (NEVER include Authorization headers with presigned URLs)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const response = await fetch(putUrl, {
        method: 'PUT',
        signal: controller.signal,
        body: file,
        headers: {
          'Content-Type': file.type,
          // CRITICAL: No Authorization header for S3 presigned URL uploads
        },
      })

      clearTimeout(timeoutId)

      console.log('S3 Response status:', response.status)
      console.log('S3 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        // Enhanced error logging
        console.error('S3 Upload failed with status:', response.status)
        console.error('Response headers:', Object.fromEntries(response.headers.entries()))
        
        let errorDetails = `Status: ${response.status}, StatusText: ${response.statusText}`
        
        // Try to get response body for more details
        try {
          const errorText = await response.text()
          if (errorText) {
            console.error('S3 Error response body:', errorText)
            errorDetails += `, Body: ${errorText}`
          }
        } catch (e) {
          console.error('Could not read error response body:', e)
        }

        // Detect CORS errors
        if (response.status === 403) {
          console.error('🚨 CORS Error Detected! Check:')
          console.error('1. S3 bucket CORS allows origin:', window.location.origin)
          console.error('2. S3 bucket CORS allows PUT method')
          console.error('3. S3 bucket CORS allows Content-Type header')
          console.error('4. Presigned URL matches request headers exactly')
        }

        throw new APIError(
          `S3 upload failed: ${response.statusText}`,
          response.status,
          'S3_UPLOAD_FAILED'
        )
      }

      console.log('✅ S3 Upload successful!')
      // S3 PUT returns empty body on success
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError('S3 upload timed out')
        }
        if (error.message.includes('fetch')) {
          throw new NetworkError('S3 upload network error')
        }
      }

      throw error
    }
  }, 1) // Only retry once for S3 uploads
}

/**
 * Create a new ticket with the provided payload
 * @param payload - The ticket data to submit
 * @returns Promise<CreateTicketResponse> - Contains ticket_id and optional submitted_at
 */
export async function createTicket(payload: TicketPayload): Promise<CreateTicketResponse> {
  const url = `${API_BASE}/api/tickets`

  return withRetry(async () => {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return parseAPIResponse<CreateTicketResponse>(response)
  })
}

/**
 * Validate file size against the configured maximum
 * @param fileSizeBytes - File size in bytes
 * @returns boolean - true if file is within size limit
 */
export function validateFileSize(fileSizeBytes: number): boolean {
  const maxSizeBytes = MAX_UPLOAD_MB * 1024 * 1024
  return fileSizeBytes <= maxSizeBytes
}

/**
 * Get the maximum allowed file size in MB
 * @returns number - Maximum file size in MB
 */
export function getMaxUploadSizeMB(): number {
  return MAX_UPLOAD_MB
}

/**
 * Get dashboard data including statistics, trends, recent tickets, and news
 * @returns Promise<DashboardApiResponse> - Complete dashboard data
 */
export async function getDashboard(): Promise<DashboardApiResponse> {
  const url = `${API_BASE}/api/dashboard`
  
  // Debug logging
  console.log('Dashboard API URL:', url)
  console.log('API_BASE:', API_BASE)

  return withRetry(async () => {
    console.log('Attempting dashboard API call...')
    const response = await fetchWithTimeout(url, {
      method: 'GET',
    })

    console.log('Dashboard API response status:', response.status)
    return parseAPIResponse<DashboardApiResponse>(response)
  })
}

/**
 * Get filtered list of tickets
 * @param params - Query parameters for filtering tickets
 * @returns Promise<TicketsApiResponse> - Filtered ticket list with pagination
 */
export async function getTickets(params?: TicketsQueryParams): Promise<TicketsApiResponse> {
  const url = new URL(`${API_BASE}/api/tickets`)

  // Add query parameters if provided
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return withRetry(async () => {
    const response = await fetchWithTimeout(url.toString(), {
      method: 'GET',
    })

    return parseAPIResponse<TicketsApiResponse>(response)
  })
}

/**
 * Get AI analysis preview for form data (protected endpoint - requires JWT authentication)
 * @param payload - Form data and assets to analyze
 * @returns Promise<AIPreviewResponse> - AI analysis with issues and recommendations
 */
export async function getAIPreview(payload: AIPreviewRequest): Promise<AIPreviewResponse> {
  const url = `${API_BASE}/api/ai-preview`

  return withRetry(async () => {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    }) // Now requires JWT authentication

    return parseAPIResponse<AIPreviewResponse>(response)
  })
}

// Bedrock Agent approval removed - handled automatically via Lambda-to-Lambda invocation

/**
 * Get API configuration for use in other parts of the application
 * @returns ApiConfig - Current API configuration
 */
export function getApiConfig() {
  return {
    baseUrl: API_BASE,
    maxUploadMb: MAX_UPLOAD_MB,
    timeoutMs: REQUEST_TIMEOUT,
  }
}

// Export error transformation function for use in components
export { transformErrorMessage }