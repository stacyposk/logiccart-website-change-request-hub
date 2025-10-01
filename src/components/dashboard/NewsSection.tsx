'use client'

import { Card, CardContent } from '@/components/ui/card'
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion'
import { Volume2 } from 'lucide-react'
import { NewsItem } from '@/lib/dashboard/types'
import { NewsSectionSkeleton } from './LoadingSkeletons'
import { NewsSectionError, NewsSectionEmpty } from './ErrorStates'

interface NewsSectionProps {
  newsItems: NewsItem[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function NewsSection({ 
  newsItems, 
  loading = false, 
  error = null, 
  onRetry 
}: NewsSectionProps) {
  // Show loading state
  if (loading) {
    return <NewsSectionSkeleton />
  }

  // Show error state
  if (error) {
    return <NewsSectionError onRetry={onRetry} />
  }

  // Show empty state
  if (!newsItems || newsItems.length === 0) {
    return <NewsSectionEmpty />
  }

  // Helper function to format date in YYYY-MM-DD format
  const formatDate = (dateString: string) => {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    // Otherwise, convert to YYYY-MM-DD format
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
        System News
      </h2>
      <div className="space-y-3">
        {newsItems.map((item) => (
          <Card key={item.id} className="transition-all duration-300 hover:shadow-lg hover:shadow-[#5754FF]/20 touch-manipulation">
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={item.id} className="border-none">
                  <AccordionTrigger className="px-3 sm:px-6 py-4 sm:py-5 hover:no-underline touch-manipulation min-h-[3rem]">
                    <div className="flex items-start gap-4 w-full text-left">
                      <div className="flex-shrink-0 mt-0.5">
                        <Volume2 className="h-5 w-5 text-slate-500" style={{ minWidth: '20px', minHeight: '20px' }} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {/* Mobile: Stack date and headline in 2 rows */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                          <span className="text-sm text-slate-600 shrink-0 mb-1 sm:mb-0">
                            {formatDate(item.date)}
                          </span>
                          <span className="text-sm font-medium text-slate-900 break-words sm:truncate">
                            {item.headline}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 sm:px-6 pb-3 sm:pb-4">
                    <div className="ml-9 text-sm text-slate-700 leading-relaxed break-words">
                      {item.details}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}