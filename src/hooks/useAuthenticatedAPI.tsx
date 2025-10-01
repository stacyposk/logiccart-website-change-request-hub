import React, { useState, useEffect, useMemo } from 'react'
import { getTokenFromCookie } from '@/lib/auth/token-capture'

/**
 * Hook for managing authenticated API state and providing authentication status
 */
export const useAuthenticatedAPI = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = () => {
    if (typeof window === 'undefined') {
      setIsAuthenticated(false)
      setIsLoading(false)
      return
    }

    // Check both sessionStorage and cookies for tokens
    const sessionToken = sessionStorage.getItem('access_token')
    const cookieToken = getTokenFromCookie('CognitoAuthAccessToken')
    
    const hasValidToken = !!(sessionToken || cookieToken)
    
    setIsAuthenticated(hasValidToken)
    setIsLoading(false)
  }

  const refreshAuthStatus = () => {
    checkAuthStatus()
  }

  const clearAuthState = () => {
    if (typeof window !== 'undefined') {
      // Clear sessionStorage
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('id_token')
      
      // Clear cookies
      document.cookie = 'CognitoAuthAccessToken=; Max-Age=0; Path=/'
      document.cookie = 'CognitoAuthIdToken=; Max-Age=0; Path=/'
      
      setIsAuthenticated(false)
    }
  }

  const redirectToAuth = () => {
    if (typeof window !== 'undefined') {
      clearAuthState()
      window.location.href = '/auth/start'
    }
  }

  return {
    isAuthenticated,
    isLoading,
    refreshAuthStatus,
    clearAuthState,
    redirectToAuth
  }
}

/**
 * Higher-order component wrapper for authenticated components
 */
export function withAuthentication<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, redirectToAuth } = useAuthenticatedAPI()

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        redirectToAuth()
      }
    }, [isAuthenticated, isLoading, redirectToAuth])

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Redirecting to authentication...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}