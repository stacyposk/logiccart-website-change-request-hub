/**
 * Dashboard Error Boundary
 * 
 * Provides graceful error handling for dashboard components.
 * Catches JavaScript errors and displays fallback UI.
 */

'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface DashboardErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ 
  error, 
  retry 
}: { 
  error: Error
  retry: () => void 
}) {
  return (
    <div className="mx-auto px-4 sm:px-6 md:px-8 pb-24 pt-4 sm:pt-6" style={{ maxWidth: '1200px' }}>
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
          <div className="mb-6">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          
          <CardTitle className="text-xl font-semibold text-red-900 mb-3">
            Dashboard Error
          </CardTitle>
          
          <p className="text-sm text-red-700 mb-6 max-w-md leading-relaxed">
            Something went wrong while loading the dashboard. This might be a temporary issue.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={retry}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
          
          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left w-full max-w-md">
              <summary className="text-xs text-red-600 cursor-pointer mb-2">
                Error Details (Development)
              </summary>
              <pre className="text-xs text-red-800 bg-red-100 p-3 rounded overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Dashboard Error Boundary Component
 */
export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard Error Boundary caught an error:', error, errorInfo)
    }
    
    // In production, you might want to log to an error reporting service
    // Example: logErrorToService(error, errorInfo)
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      
      return (
        <FallbackComponent 
          error={this.state.error} 
          retry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Hook for error boundary functionality in functional components
 */
export function useDashboardErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleError = React.useCallback((error: Error) => {
    setError(error)
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard error:', error)
    }
  }, [])

  return {
    error,
    resetError,
    handleError,
    hasError: error !== null
  }
}