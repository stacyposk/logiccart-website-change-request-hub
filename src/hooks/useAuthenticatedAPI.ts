'use client'

import { useState, useEffect, useMemo } from 'react'
import { getTokenFromCookie } from '@/lib/auth/token-capture'

/**
 * Hook for managing authenticated API state
 * Provides authentication status and API client instance
 */
export const useAuthenticatedAPI = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuthStatus = () => {
    if (typeof window === 'undefined') {
      setIsAuthenticated(false)
      setIsLoading(false)
      return
    }

    // Check for tokens in sessionStorage first, then cookies
    const sessionToken = sessionStorage.getItem('access_token')
    const cookieToken = getTokenFromCookie('CognitoAuthAccessToken')
    
    const hasToken = !!(sessionToken || cookieToken)
    setIsAuthenticated(hasToken)
    setIsLoading(false)

    console.log('Auth status check:', {
      hasSessionToken: !!sessionToken,
      hasCookieToken: !!cookieToken,
      isAuthenticated: hasToken
    })
  }

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const apiConfig = useMemo(() => ({
    baseURL: process.env.NEXT_PUBLIC_API_BASE || '',
    timeout: 10000,
    retryAttempts: 3,
    tokenRefreshEnabled: true
  }), [])

  return {
    isAuthenticated,
    isLoading,
    refreshAuthStatus: checkAuthStatus,
    apiConfig
  }
}