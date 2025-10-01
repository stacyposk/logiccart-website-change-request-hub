'use client'

import { Minus, Sparkles } from 'lucide-react'

interface AIRecapProps {
  summary: string
  className?: string
}

/**
 * AI Recap Component
 * 
 * Displays the AI summary from the AI Preview Analysis on the success page.
 * Styled consistently with the AI Preview sheet formatting.
 * 
 * Features:
 * - Consistent styling with AI Preview sheet
 * - Graceful handling of missing summary data
 * - Responsive design for mobile and desktop
 */
export function AIRecap({ summary, className = '' }: AIRecapProps) {
  if (!summary || typeof summary !== 'string' || summary.trim() === '') {
    return null
  }

  // Split by periods and filter out empty/whitespace-only points
  const summaryPoints = summary.split('. ').filter(point => point.trim() !== '')
  
  // If no valid content after processing, don't render
  if (summaryPoints.length === 0) {
    return null
  }

  return (
    <div className={`text-left ${className}`}>
      <hr className="border-t border-indigo-200 mb-4" />
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        AI Summary
      </h3>
      <ul className="space-y-1 mb-4">
        {summaryPoints.map((point, index) => (
          <li key={index} className="flex items-start gap-2 text-base text-black">
            <Minus className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" />
            <span>{point.endsWith('.') ? point.slice(0, -1) : point}</span>
          </li>
        ))}
      </ul>
      <hr className="border-t border-indigo-200" />
    </div>
  )
}