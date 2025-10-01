/**
 * Tests for ExportButton component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExportButton } from '../ExportButton'
import { type ExportData } from '@/lib/dashboard/export-utils'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the export utilities
const mockExportDashboardData = jest.fn()

jest.mock('@/lib/dashboard/export-utils', () => ({
  exportDashboardData: mockExportDashboardData,
  type: {
    ExportData: {},
    ExportOptions: {}
  }
}))

describe('ExportButton', () => {
  const mockOnExport = jest.fn()
  const mockExportData: ExportData = {
    statistics: {
      totalRequests: 24,
      approvedRequests: 18,
      pendingRequests: 6,
      approvedTrend: '+5%'
    },
    requests: [
      {
        id: 'REQ-2025-001',
        pageArea: 'Homepage - Hero Section',
        type: 'New Banner',
        status: { label: 'Approved' },
        submittedDate: '2025-09-15'
      }
    ],
    exportDate: '2025-09-20',
    selectedMonth: 'Sep 2025'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockExportDashboardData.mockResolvedValue(undefined)
  })

  it('should render export button', () => {
    render(<ExportButton onExport={mockOnExport} />)
    
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })

  it('should show loading state when exporting', () => {
    render(<ExportButton onExport={mockOnExport} isExporting={true} />)
    
    expect(screen.getByRole('button', { name: /exporting/i })).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should open popover when clicked', async () => {
    render(<ExportButton onExport={mockOnExport} />)
    
    const exportButton = screen.getByRole('button', { name: /export/i })
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(screen.getByText('Export as CSV')).toBeInTheDocument()
      expect(screen.getByText('Export as PDF')).toBeInTheDocument()
    })
  })

  it('should call export function when CSV option is selected', async () => {
    render(<ExportButton onExport={mockOnExport} exportData={mockExportData} />)
    
    const exportButton = screen.getByRole('button', { name: /export/i })
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(screen.getByText('Export as CSV')).toBeInTheDocument()
    })
    
    const csvOption = screen.getByText('Export as CSV')
    fireEvent.click(csvOption)
    
    await waitFor(() => {
      expect(mockExportDashboardData).toHaveBeenCalledWith(
        mockExportData,
        'csv',
        expect.any(Object)
      )
      expect(mockOnExport).toHaveBeenCalledWith('csv')
    })
  })

  it('should call export function when PDF option is selected', async () => {
    render(<ExportButton onExport={mockOnExport} exportData={mockExportData} />)
    
    const exportButton = screen.getByRole('button', { name: /export/i })
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(screen.getByText('Export as PDF')).toBeInTheDocument()
    })
    
    const pdfOption = screen.getByText('Export as PDF')
    fireEvent.click(pdfOption)
    
    await waitFor(() => {
      expect(mockExportDashboardData).toHaveBeenCalledWith(
        mockExportData,
        'pdf',
        expect.any(Object)
      )
      expect(mockOnExport).toHaveBeenCalledWith('pdf')
    })
  })

  it('should handle export errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockExportDashboardData.mockRejectedValue(new Error('Export failed'))
    
    render(<ExportButton onExport={mockOnExport} exportData={mockExportData} />)
    
    const exportButton = screen.getByRole('button', { name: /export/i })
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(screen.getByText('Export as CSV')).toBeInTheDocument()
    })
    
    const csvOption = screen.getByText('Export as CSV')
    fireEvent.click(csvOption)
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error))
    })
    
    consoleErrorSpy.mockRestore()
  })

  it('should close popover after selecting an option', async () => {
    render(<ExportButton onExport={mockOnExport} exportData={mockExportData} />)
    
    const exportButton = screen.getByRole('button', { name: /export/i })
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(screen.getByText('Export as CSV')).toBeInTheDocument()
    })
    
    const csvOption = screen.getByText('Export as CSV')
    fireEvent.click(csvOption)
    
    await waitFor(() => {
      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument()
    })
  })
})