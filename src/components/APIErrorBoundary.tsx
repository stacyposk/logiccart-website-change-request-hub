'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component for handling API authentication errors
 * Automatically redirects to auth flow when authentication errors occur
 */
export class APIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('API Error Boundary caught an error:', error, errorInfo)

    // Handle authentication errors
    if (error.message.includes('Authentication') || 
        error.message.includes('401') || 
        error.message.includes('AUTH_REQUIRED')) {
      console.warn('Authentication error detected, clearing tokens and redirecting')
      
      // Clear all authentication data
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('id_token')
        sessionStorage.removeItem('token_expires_at')
        
        // Clear cookies
        document.cookie = 'CognitoAuthAccessToken=; Max-Age=0; Path=/'
        document.cookie = 'CognitoAuthIdToken=; Max-Age=0; Path=/'
        document.cookie = 'lc_session=; Max-Age=0; Path=/'
        
        // Redirect to auth flow
        setTimeout(() => {
          window.location.href = '/auth/start'
        }, 1000)
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="text-red-500 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-slate-600 mb-6">
                {this.state.error?.message.includes('Authentication') 
                  ? 'Your session has expired. Redirecting to sign in...'
                  : 'An unexpected error occurred. Please try again.'
                }
              </p>
              {!this.state.error?.message.includes('Authentication') && (
                <button
                  onClick={() => window.location.reload()}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Reload Page
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Error fallback component for specific error scenarios
 */
export const ErrorFallback: React.FC<{ error: Error | null }> = ({ error }) => {
  const isAuthError = error?.message.includes('Authentication') || 
                     error?.message.includes('401') || 
                     error?.message.includes('AUTH_REQUIRED')

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md mx-4">
        <div className="text-red-500 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          {isAuthError ? 'Authentication Required' : 'Error'}
        </h3>
        <p className="text-slate-600 mb-4">
          {isAuthError 
            ? 'Your session has expired. You will be redirected to sign in.'
            : error?.message || 'An unexpected error occurred.'
          }
        </p>
        {!isAuthError && (
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}