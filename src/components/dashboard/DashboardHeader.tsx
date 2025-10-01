'use client'

import { useState } from 'react'
import { MonthSelector, useMonthSelector } from './MonthSelector'
import { ExportButton } from './ExportButton'
import { type ExportData } from '@/lib/dashboard/export-utils'

interface DashboardHeaderProps {
  onMonthChange?: (month: string) => void
  onExport?: (format: 'csv' | 'pdf') => void
  exportData?: ExportData
}

export function DashboardHeader({ onMonthChange, onExport, exportData }: DashboardHeaderProps) {
  const { currentMonth, availableMonths } = useMonthSelector()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [isExporting, setIsExporting] = useState(false)

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    onMonthChange?.(month)
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true)
    try {
      await onExport?.(format)
    } finally {
      setIsExporting(false)
    }
  }

  // Update export data with selected month
  const currentExportData = exportData ? {
    ...exportData,
    selectedMonth
  } : undefined

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <h1 className="text-3xl font-semibold text-black">Dashboard</h1>
      <div className="flex items-center gap-3">
        <MonthSelector
          currentMonth={selectedMonth}
          availableMonths={availableMonths}
          onChange={handleMonthChange}
        />
        <ExportButton
          onExport={handleExport}
          isExporting={isExporting}
          exportData={currentExportData}
        />
      </div>
    </div>
  )
}