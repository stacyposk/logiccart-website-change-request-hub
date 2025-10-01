'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Download } from 'lucide-react'
import { exportDashboardData, type ExportData, type ExportOptions } from '@/lib/dashboard/export-utils'

interface ExportButtonProps {
  onExport: (format: 'csv' | 'pdf') => void
  isExporting?: boolean
  exportData?: ExportData
}

export function ExportButton({ onExport, isExporting = false, exportData }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsOpen(false)
    
    // If exportData is provided, handle the export directly with loading states
    if (exportData) {
      const exportOptions: ExportOptions = {
        onStart: () => {
          console.log(`Starting ${format.toUpperCase()} export...`)
        },
        onSuccess: (exportFormat) => {
          console.log(`${exportFormat.toUpperCase()} export completed successfully`)
        },
        onError: (error, exportFormat) => {
          console.error(`${exportFormat.toUpperCase()} export failed:`, error.message)
          // You could show a toast notification here
        },
        onComplete: () => {
          console.log('Export process completed')
        }
      }

      try {
        await exportDashboardData(exportData, format, exportOptions)
      } catch (error) {
        // Error is already handled in exportOptions.onError
        console.error('Export failed:', error)
      }
    }
    
    // Always call the parent onExport callback
    onExport(format)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="default" 
          size="default"
          disabled={isExporting}
          className="flex items-center gap-2 text-sm"
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2 rounded-sm" align="end">
        <div className="space-y-1">
          <button
            onClick={() => handleExport('csv')}
            className="flex w-full items-center justify-start rounded-sm px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-gray-900 transition-colors"
          >
            Export as CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex w-full items-center justify-start rounded-sm px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-gray-900 transition-colors"
          >
            Export as PDF
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}