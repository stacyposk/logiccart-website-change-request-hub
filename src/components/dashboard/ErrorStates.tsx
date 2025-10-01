/**
 * Error State Components
 * 
 * Provides error states for dashboard components when data loading fails.
 * Includes retry functionality and graceful degradation.
 */

'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Wifi, Database } from 'lucide-react'

interface ErrorStateProps {
  title: string
  message: string
  onRetry?: () => void
  retryable?: boolean
  type?: 'network' | 'server' | 'data' | 'general'
}

/**
 * Generic error state component
 */
export function ErrorState({ 
  title, 
  message, 
  onRetry, 
  retryable = true,
  type = 'general'
}: ErrorStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'network':
        return <Wifi className="h-8 w-8 text-red-500" />
      case 'server':
      case 'data':
        return <Database className="h-8 w-8 text-red-500" />
      default:
        return <AlertCircle className="h-8 w-8 text-red-500" />
    }
  }

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8 text-center">
        <div className="mb-4">
          {getIcon()}
        </div>
        <CardTitle className="text-lg font-semibold text-red-900 mb-2">
          {title}
        </CardTitle>
        <p className="text-sm text-red-700 mb-4 max-w-md">
          {message}
        </p>
        {retryable && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Error state for statistics cards
 */
export function StatisticsCardsError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Unable to Load Statistics"
      message="We couldn't load the request statistics. Please check your connection and try again."
      onRetry={onRetry}
      type="data"
    />
  )
}

/**
 * Error state for recent requests table
 */
export function RecentRequestsTableError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">Recent Requests</h2>
      <ErrorState
        title="Unable to Load Recent Requests"
        message="We couldn't load your recent requests. This might be due to a temporary connection issue."
        onRetry={onRetry}
        type="network"
      />
    </div>
  )
}

/**
 * Error state for news section
 */
export function NewsSectionError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
        News
      </h2>
      <ErrorState
        title="Unable to Load News"
        message="We couldn't load the latest news and updates. Please try refreshing the page."
        onRetry={onRetry}
        type="server"
      />
    </div>
  )
}

/**
 * Empty state for when no data is available
 */
interface EmptyStateProps {
  title: string
  message: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <Card className="border-gray-200 bg-gray-50/50">
      <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8 text-center">
        <div className="mb-4 text-gray-400">
          {icon || <Database className="h-8 w-8" />}
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </CardTitle>
        <p className="text-sm text-gray-600 mb-4 max-w-md">
          {message}
        </p>
        {action && (
          <Button
            variant="outline"
            size="sm"
            onClick={action.onClick}
            className="text-gray-700 hover:bg-gray-100"
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Empty state for statistics (when no data available)
 */
export function StatisticsCardsEmpty() {
  return (
    <EmptyState
      title="No Statistics Available"
      message="There are no request statistics to display at this time."
      icon={<Database className="h-8 w-8" />}
    />
  )
}

/**
 * Empty state for recent requests table
 */
export function RecentRequestsTableEmpty() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">Recent Requests</h2>
      <EmptyState
        title="No Recent Requests"
        message="You haven't submitted any requests yet. Start by creating your first request."
        action={{
          label: "Submit Request",
          onClick: () => window.location.href = '/'
        }}
      />
    </div>
  )
}

/**
 * Empty state for news section
 */
export function NewsSectionEmpty() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
        News
      </h2>
      <EmptyState
        title="No News Available"
        message="There are no news updates to display at this time."
      />
    </div>
  )
}