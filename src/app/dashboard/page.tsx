'use client'

import { useState, useEffect, Suspense } from 'react'
import { StatisticsCards } from '@/components/dashboard/StatisticsCards'
import { RecentRequestsTable } from '@/components/dashboard/RecentRequestsTable'
import { NewsSection } from '@/components/dashboard/NewsSection'
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { useDashboardData } from '@/lib/dashboard/useDashboardData'

import { type ExportData } from '@/lib/dashboard/export-utils'
import { useToast } from '@/components/ui/use-toast'
// import { JWTTestPanel } from '@/components/JWTTestPanel' // Removed for production build

// Note: Metadata export needs to be in a separate server component for App Router
// For now, we'll handle this in the layout or create a separate metadata file

function DashboardContent() {
  const { toast } = useToast()
  const {
    statistics,
    recentRequests,
    news,
    loading,
    errors,
    retryStatistics,
    retryRecentRequests,
    retryNews,
    retryAll
  } = useDashboardData()

  // Track selected rows from the table
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([])
  
  // Track highlighted request ID from URL parameter
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Fix hydration issue - only access URL params after mount
  useEffect(() => {
    setMounted(true)
    
    // Only access URL params on client side after mount
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const ticketIdParam = urlParams.get('ticketId') || urlParams.get('highlight')
      const shouldScroll = urlParams.get('scroll') === 'true'
      
      // Force refresh is now handled in useDashboardData hook via forceRefresh parameter
      
      if (ticketIdParam && recentRequests.length > 0) {
        // Check if the ticket exists in the current data
        const ticketExists = recentRequests.some(req => req.id === ticketIdParam)
        
        if (ticketExists) {
          setHighlightedRequestId(ticketIdParam)
          
          // Clear the highlight after 3 seconds
          const timer = setTimeout(() => {
            setHighlightedRequestId(null)
          }, 3000)
          
          return () => clearTimeout(timer)
        } else if (shouldScroll) {
          // Edge case: ticket not found in current page, show toast
          toast({
            title: "Ticket created",
            description: "Ticket created—use filters to locate",
            duration: 5000,
          })
        }
      }
    }
  }, [recentRequests, toast, retryAll])

  // Show loading only briefly to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  // Show loading indicator during force refresh
  if (loading.isInitialLoad) {
    return (
      <div className="mx-auto px-4 sm:px-6 md:px-8 pb-24" style={{ maxWidth: '1440px' }}>
        <div className="space-y-6 sm:space-y-8">
          <div className="pt-2">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
          <div className="text-center py-8">
            <div className="text-lg text-muted-foreground">Loading fresh data...</div>
          </div>
        </div>
      </div>
    )
  }

  // Check if any component has errors
  const hasErrors = errors.statistics || errors.recentRequests || errors.news

  // Prepare export data
  const prepareExportData = (selectedMonth: string): ExportData => {
    // Filter requests based on selection - if no rows selected, export all
    const requestsToExport = selectedRequestIds.length > 0 
      ? recentRequests.filter(req => selectedRequestIds.includes(req.id))
      : recentRequests

    return {
      statistics: {
        totalRequests: statistics.find(s => s.title === 'Total Requests')?.value || 0,
        approvedRequests: statistics.find(s => s.title === 'Approved')?.value || 0,
        pendingRequests: statistics.find(s => s.title === 'Pending')?.value || 0,
        completedRequests: statistics.find(s => s.title === 'Completed')?.value || 0,
        totalTrend: statistics.find(s => s.title === 'Total Requests')?.trend?.value || '',
        approvedTrend: statistics.find(s => s.title === 'Approved')?.trend?.value || '',
        completedTrend: statistics.find(s => s.title === 'Completed')?.trend?.value || ''
      },
      requests: requestsToExport.map(req => ({
        id: req.id,
        pageArea: req.pageArea,
        type: req.type,
        status: { label: req.status.label },
        submittedDate: req.submittedDate,
        targetLaunchDate: req.targetLaunchDate
      })),
      exportDate: new Date().toISOString().split('T')[0],
      selectedMonth,
      selectedRowsCount: selectedRequestIds.length,
      totalRowsCount: recentRequests.length
    }
  }

  const handleMonthChange = (month: string) => {
    // For now, just log the month change
    // In the future, this would trigger data refetch for the selected month
    console.log('Month changed to:', month)
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    // This will be handled by the ExportButton component
    console.log('Export requested:', format)
  }

  // Get current export data
  const exportData = prepareExportData('Sep 2025')

  return (
    <div className="mx-auto px-4 sm:px-6 md:px-8 pb-24" style={{ maxWidth: '1440px' }}>
      <div className="space-y-6 sm:space-y-8">
        {/* Dashboard Header with Month Selector and Export */}
        <div className="pt-2">
          <DashboardHeader
            onMonthChange={handleMonthChange}
            onExport={handleExport}
            exportData={exportData}
          />
        </div>

        {/* Statistics Cards */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <DashboardErrorBoundary>
            <StatisticsCards
              statistics={statistics}
              loading={loading.statistics}
              error={errors.statistics}
              onRetry={retryStatistics}
            />
          </DashboardErrorBoundary>
        </div>

        {/* Recent Requests Table */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <DashboardErrorBoundary>
            <RecentRequestsTable
              requests={recentRequests}
              loading={loading.recentRequests}
              error={errors.recentRequests}
              onRetry={retryRecentRequests}
              onSelectionChange={setSelectedRequestIds}
              highlightedRequestId={highlightedRequestId}
            />
          </DashboardErrorBoundary>
        </div>

        {/* News Section */}
        <DashboardErrorBoundary>
          <NewsSection
            newsItems={news}
            loading={loading.news}
            error={errors.news}
            onRetry={retryNews}
          />
        </DashboardErrorBoundary>
      </div>
    </div>
  )
}

export default function DashboardPage() {

  return (
    <DashboardErrorBoundary>
      <Suspense fallback={
        <div className="mx-auto px-4 sm:px-6 md:px-8 pb-24" style={{ maxWidth: '1440px' }}>
          <div className="space-y-6 sm:space-y-8">
            <div className="pt-2">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
      
      {/* JWT Test Panel for Development - Removed for production build */}
      {/* <JWTTestPanel /> */}
    </DashboardErrorBoundary>
  )
}