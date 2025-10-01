/**
 * StatusFilterTabs Component
 * 
 * Tab-style filter navigation for Recent Requests table by status.
 * Follows Shadcn dashboard pattern with underline indicators.
 * Provides "All", "Approved", "Pending", "Completed" filter options.
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface StatusFilterTab {
  id: 'all' | 'approved' | 'pending' | 'completed'
  label: string
}

interface StatusFilterTabsProps {
  activeFilter: string
  onFilterChange: (filterId: string) => void
  className?: string
}

const FILTER_TABS: StatusFilterTab[] = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' }
]

export function StatusFilterTabs({ 
  activeFilter, 
  onFilterChange, 
  className 
}: StatusFilterTabsProps) {
  return (
    <div className={cn("inline-flex h-10 items-center justify-center rounded-sm bg-muted p-1 text-muted-foreground mb-6", className)}>
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.id
        
        return (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              "touch-manipulation min-h-[36px]", // Touch target compliance
              isActive
                ? "bg-white text-[#5754FF] border border-[#5754FF] shadow-sm"
                : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
            )}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Filter by ${tab.label} status`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}