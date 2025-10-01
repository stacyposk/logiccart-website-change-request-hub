'use client'

import { Card, CardTitle, CardContent } from '@/components/ui/card'
import { StatisticCard } from '@/lib/dashboard/types'
import { StatisticsCardsSkeleton } from './LoadingSkeletons'
import { StatisticsCardsError as ErrorComponent, StatisticsCardsEmpty as EmptyComponent } from './ErrorStates'
import { cn } from '@/lib/utils'

interface StatisticsCardsProps {
  statistics: StatisticCard[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function StatisticsCards({ 
  statistics, 
  loading = false, 
  error = null, 
  onRetry 
}: StatisticsCardsProps) {
  // Show loading state
  if (loading) {
    return <StatisticsCardsSkeleton />
  }

  // Show error state
  if (error) {
    return <ErrorComponent onRetry={onRetry} />
  }

  // Show empty state
  if (!statistics || statistics.length === 0) {
    return <EmptyComponent />
  }

  const getCardClasses = (variant?: 'gradient' | 'white') => {
    if (variant === 'gradient') {
      return 'border-0 transition-all duration-300 hover:shadow-lg hover:shadow-[#5754FF]/30 hover:-translate-y-0.5 touch-manipulation relative overflow-hidden'
    }
    return 'bg-white transition-all duration-300 hover:shadow-lg hover:shadow-[#5754FF]/20 hover:-translate-y-0.5 touch-manipulation'
  }

  const getTextClasses = (variant?: 'gradient' | 'white') => {
    return variant === 'gradient' ? 'text-white' : 'text-slate-900'
  }

  const getTrendColorClasses = (color: 'green' | 'red' | 'grey', variant?: 'gradient' | 'white') => {
    if (variant === 'gradient') {
      return 'text-white'
    }
    switch (color) {
      case 'green':
        return 'text-green-600'
      case 'red':
        return 'text-red-600'
      case 'grey':
        return 'text-slate-500'
      default:
        return 'text-slate-500'
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {statistics.map((stat, index) => (
        <Card 
          key={index}
          className={getCardClasses(stat.variant)}
          style={stat.variant === 'gradient' ? {
            background: 'linear-gradient(135deg, #5754ff 20%, #9d85f0 60%, #e99565 90%)'
          } : undefined}
        >
          {stat.variant === 'gradient' && (
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/5 pointer-events-none" />
          )}
          <CardContent className="px-6 py-4 sm:px-8 sm:py-4 relative z-10">
            <CardTitle className={cn(
              "text-lg font-medium tracking-tight leading-tight mb-3 font-plus-jakarta-sans",
              getTextClasses(stat.variant)
            )}>
              {stat.title}
            </CardTitle>
            <div className={cn(
              "font-semibold tabular-nums mb-1 font-plus-jakarta-sans",
              getTextClasses(stat.variant)
            )}
            style={{ fontSize: '48px' }}>
              {stat.value}
            </div>
            
            {/* Trend indicator */}
            {stat.trend && (
              <div className="flex items-center gap-1 text-sm">
                <stat.trend.icon className={cn("h-4 w-4", getTrendColorClasses(stat.trend.color, stat.variant))} />
                <span className={getTrendColorClasses(stat.trend.color, stat.variant)}>
                  {stat.trend.value}
                </span>
                <span className={cn("text-slate-500", stat.variant === 'gradient' ? 'text-white' : '')}>
                  {stat.trend.label}
                </span>
              </div>
            )}
            
            {/* Helper text */}
            {stat.helperText && (
              <div className={cn("text-sm mt-1", stat.variant === 'gradient' ? 'text-white/70' : 'text-slate-500')}>
                {stat.helperText}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}