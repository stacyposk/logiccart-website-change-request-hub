/**
 * Loading Skeleton Components
 * 
 * Provides loading states for dashboard components while data is being fetched.
 * Maintains visual consistency with actual components during loading.
 */

'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for statistics cards
 */
export function StatisticsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardContent className="p-6 sm:px-8 sm:py-8 space-y-4">
            <Skeleton className="h-5 sm:h-6 w-3/4" />
            <Skeleton className="h-10 sm:h-12 md:h-16 lg:h-20 w-20 sm:w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Loading skeleton for recent requests table
 */
export function RecentRequestsTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 sm:h-7 md:h-8 w-48" />
      
      <div className="rounded-md border border-gray-200 bg-white/80 backdrop-blur-sm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Table Header */}
            <div className="bg-gray-50/80 border-b border-gray-200">
              <div className="flex">
                <div className="min-w-[120px] px-3 sm:px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="min-w-[180px] sm:min-w-[200px] px-3 sm:px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="min-w-[100px] sm:min-w-[120px] px-3 sm:px-4 py-3">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="min-w-[100px] sm:min-w-[120px] px-3 sm:px-4 py-3">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="min-w-[120px] sm:min-w-[140px] px-3 sm:px-4 py-3">
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="min-w-[90px] sm:min-w-[100px] px-3 sm:px-4 py-3">
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
            
            {/* Table Rows */}
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border-b border-gray-100 last:border-b-0">
                <div className="flex">
                  <div className="min-w-[120px] px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="min-w-[180px] sm:min-w-[200px] px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="min-w-[100px] sm:min-w-[120px] px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="min-w-[100px] sm:min-w-[120px] px-3 sm:px-4 py-3">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="min-w-[120px] sm:min-w-[140px] px-3 sm:px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="min-w-[90px] sm:min-w-[100px] px-3 sm:px-4 py-3">
                    <Skeleton className="h-8 w-8 sm:w-16 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Loading skeleton for news section
 */
export function NewsSectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 sm:h-7 md:h-8 w-20" />
      
      <div className="space-y-3 sm:space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-3 sm:p-4 md:px-8 md:py-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <Skeleton className="h-4 w-4 rounded mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}