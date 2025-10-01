'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCurrentMonth, getAvailableMonths } from '@/lib/dashboard/date-utils'

interface MonthSelectorProps {
  currentMonth: string
  availableMonths: string[]
  onChange: (month: string) => void
}

export function MonthSelector({ currentMonth, availableMonths, onChange }: MonthSelectorProps) {
  return (
    <Select value={currentMonth} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {availableMonths.map((month) => (
          <SelectItem key={month} value={month}>
            {month}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Hook for managing month selector state
export function useMonthSelector() {
  const currentMonth = getCurrentMonth()
  const availableMonths = getAvailableMonths()
  
  return {
    currentMonth,
    availableMonths
  }
}