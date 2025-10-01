/**
 * Export utility functions for dashboard data
 */

export interface ExportData {
  statistics: {
    totalRequests: number
    approvedRequests: number
    pendingRequests: number
    completedRequests?: number
    totalTrend?: string
    approvedTrend?: string
    completedTrend?: string
  }
  requests: Array<{
    id: string
    pageArea: string
    type: string
    status: { label: string }
    submittedDate: string
    targetLaunchDate?: string
  }>
  exportDate: string
  selectedMonth: string
  selectedRowsCount?: number
  totalRowsCount?: number
}

export interface ExportOptions {
  onStart?: () => void
  onSuccess?: (format: 'csv' | 'pdf') => void
  onError?: (error: Error, format: 'csv' | 'pdf') => void
  onComplete?: () => void
}

/**
 * Export dashboard data to CSV format with loading states and error handling
 * @param data Export data containing statistics and requests
 * @param options Optional callbacks for loading states and error handling
 */
export const exportToCSV = async (data: ExportData, options?: ExportOptions): Promise<void> => {
  try {
    options?.onStart?.()

    // Add small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 100))

    const csvContent = [
      // Statistics section
      'Dashboard Statistics',
      `Export Date,${data.exportDate}`,
      `Selected Month,${data.selectedMonth}`,
      `Records Exported,${data.requests.length} of ${data.totalRowsCount || data.requests.length} total`,
      '',
      'Metric,Value,Trend',
      `Total Requests,${data.statistics.totalRequests},${data.statistics.totalTrend || ''}`,
      `Approved Requests,${data.statistics.approvedRequests},${data.statistics.approvedTrend || ''}`,
      `Pending Requests,${data.statistics.pendingRequests},`,
      `Completed Requests,${data.statistics.completedRequests || 0},${data.statistics.completedTrend || ''}`,
      '',
      // Requests section
      'Recent Requests',
      'Request ID,Page Area,Type,Submission Date,Target Go-live Date,Status',
      ...data.requests.map(req => 
        `${req.id},"${req.pageArea.replace(/"/g, '""')}","${req.type}",${req.submittedDate},${req.targetLaunchDate || '-'},${req.status.label}`
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dashboard-export-${data.selectedMonth.replace(/\s+/g, '-')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    options?.onSuccess?.('csv')
  } catch (error) {
    const exportError = error instanceof Error ? error : new Error('Failed to export CSV')
    options?.onError?.(exportError, 'csv')
    throw exportError
  } finally {
    options?.onComplete?.()
  }
}

/**
 * Export dashboard data to PDF format with loading states and error handling
 * @param data Export data containing statistics and requests
 * @param options Optional callbacks for loading states and error handling
 */
export const exportToPDF = async (data: ExportData, options?: ExportOptions): Promise<void> => {
  try {
    options?.onStart?.()

    // Add small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 200))

    // Create a new window with formatted content for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Please allow popups to export PDF. Check your browser popup settings.')
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dashboard Export - ${data.selectedMonth}</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 20px; 
            line-height: 1.5;
          }
          h1 { 
            color: #333; 
            border-bottom: 2px solid #5754FF; 
            padding-bottom: 10px; 
            margin-bottom: 20px;
          }
          h2 { 
            color: #666; 
            margin-top: 30px; 
            margin-bottom: 15px;
          }
          .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin: 20px 0; 
          }
          .stat-card { 
            border: 1px solid #ddd; 
            padding: 15px; 
            border-radius: 8px; 
            background: #fafafa;
          }
          .stat-title {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
          }
          .stat-value { 
            font-size: 24px; 
            font-weight: bold; 
            color: #5754FF; 
          }
          .stat-trend {
            color: #16a34a; 
            font-size: 12px;
            margin-top: 4px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px; 
            font-size: 14px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px 8px; 
            text-align: left; 
          }
          th { 
            background-color: #f8f9fa; 
            font-weight: 600;
            color: #374151;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .export-info { 
            color: #666; 
            font-size: 12px; 
            margin-bottom: 20px; 
            padding: 10px;
            background: #f0f0f0;
            border-radius: 4px;
          }
          .print-button {
            background: #5754FF;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 20px;
          }
          .print-button:hover {
            background: #4338ca;
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>
        
        <h1>Dashboard Export</h1>
        <div class="export-info">
          <strong>Export Date:</strong> ${data.exportDate}<br>
          <strong>Selected Month:</strong> ${data.selectedMonth}<br>
          <strong>Records Exported:</strong> ${data.requests.length} of ${data.totalRowsCount || data.requests.length} total requests
        </div>
        
        <h2>Statistics Summary</h2>
        <div class="stats">
          <div class="stat-card">
            <div class="stat-title">Total Requests</div>
            <div class="stat-value">${data.statistics.totalRequests}</div>
            ${data.statistics.totalTrend ? `<div class="stat-trend">${data.statistics.totalTrend} from last month</div>` : ''}
          </div>
          <div class="stat-card">
            <div class="stat-title">Approved Requests</div>
            <div class="stat-value">${data.statistics.approvedRequests}</div>
            ${data.statistics.approvedTrend ? `<div class="stat-trend">${data.statistics.approvedTrend} from last month</div>` : ''}
          </div>
          <div class="stat-card">
            <div class="stat-title">Pending Requests</div>
            <div class="stat-value">${data.statistics.pendingRequests}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Completed Requests</div>
            <div class="stat-value">${data.statistics.completedRequests || 0}</div>
            ${data.statistics.completedTrend ? `<div class="stat-trend">${data.statistics.completedTrend} from last month</div>` : ''}
          </div>
        </div>
        
        <h2>Recent Requests</h2>
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Page Area</th>
              <th>Type</th>
              <th>Submission Date</th>
              <th>Target Go-live Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.requests.map(req => `
              <tr>
                <td><strong>${req.id}</strong></td>
                <td>${req.pageArea}</td>
                <td>${req.type}</td>
                <td>${req.submittedDate}</td>
                <td>${req.targetLaunchDate || '-'}</td>
                <td>${req.status.label}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <script>
          // Auto-focus for better print experience
          window.onload = function() {
            window.focus();
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load, then focus the window
    printWindow.onload = () => {
      printWindow.focus()
    }

    options?.onSuccess?.('pdf')
  } catch (error) {
    const exportError = error instanceof Error ? error : new Error('Failed to export PDF')
    options?.onError?.(exportError, 'pdf')
    throw exportError
  } finally {
    options?.onComplete?.()
  }
}

/**
 * Validate export data before processing
 * @param data Export data to validate
 * @returns Validation result with any errors
 */
export const validateExportData = (data: ExportData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.selectedMonth?.trim()) {
    errors.push('Selected month is required')
  }

  if (!data.exportDate?.trim()) {
    errors.push('Export date is required')
  }

  if (!data.statistics) {
    errors.push('Statistics data is required')
  } else {
    if (typeof data.statistics.totalRequests !== 'number' || data.statistics.totalRequests < 0) {
      errors.push('Total requests must be a non-negative number')
    }
    if (typeof data.statistics.approvedRequests !== 'number' || data.statistics.approvedRequests < 0) {
      errors.push('Approved requests must be a non-negative number')
    }
    if (typeof data.statistics.pendingRequests !== 'number' || data.statistics.pendingRequests < 0) {
      errors.push('Pending requests must be a non-negative number')
    }
  }

  if (!Array.isArray(data.requests)) {
    errors.push('Requests data must be an array')
  } else {
    data.requests.forEach((req, index) => {
      if (!req.id?.trim()) {
        errors.push(`Request ${index + 1}: ID is required`)
      }
      if (!req.pageArea?.trim()) {
        errors.push(`Request ${index + 1}: Page area is required`)
      }
      if (!req.type?.trim()) {
        errors.push(`Request ${index + 1}: Type is required`)
      }
      if (!req.status?.label?.trim()) {
        errors.push(`Request ${index + 1}: Status label is required`)
      }
      if (!req.submittedDate?.trim()) {
        errors.push(`Request ${index + 1}: Submission date is required`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate filename for export based on data and format
 * @param data Export data
 * @param format Export format
 * @returns Generated filename
 */
export const generateExportFilename = (data: ExportData, format: 'csv' | 'pdf'): string => {
  const monthSlug = data.selectedMonth.replace(/\s+/g, '-').toLowerCase()
  const dateSlug = data.exportDate.replace(/\D/g, '')
  const extension = format === 'csv' ? 'csv' : 'pdf'
  
  return `dashboard-export-${monthSlug}-${dateSlug}.${extension}`
}

/**
 * Format export data for better display
 * @param data Raw export data
 * @returns Formatted export data
 */
export const formatExportData = (data: ExportData): ExportData => {
  return {
    ...data,
    exportDate: new Date(data.exportDate).toLocaleDateString('en-CA'), // YYYY-MM-DD format
    requests: data.requests.map(req => ({
      ...req,
      submittedDate: new Date(req.submittedDate).toLocaleDateString('en-CA'), // YYYY-MM-DD format
      targetLaunchDate: req.targetLaunchDate ? new Date(req.targetLaunchDate).toLocaleDateString('en-CA') : req.targetLaunchDate
    }))
  }
}

/**
 * Export dashboard data with comprehensive error handling and loading states
 * @param data Export data
 * @param format Export format ('csv' or 'pdf')
 * @param options Optional callbacks for loading states and error handling
 */
export const exportDashboardData = async (
  data: ExportData, 
  format: 'csv' | 'pdf', 
  options?: ExportOptions
): Promise<void> => {
  // Validate data first
  const validation = validateExportData(data)
  if (!validation.isValid) {
    const error = new Error(`Export validation failed: ${validation.errors.join(', ')}`)
    options?.onError?.(error, format)
    throw error
  }

  // Format data for better display
  const formattedData = formatExportData(data)

  // Call appropriate export function
  if (format === 'csv') {
    await exportToCSV(formattedData, options)
  } else {
    await exportToPDF(formattedData, options)
  }
}