/**
 * RecentRequestsTable Component
 * 
 * Enhanced data table with row selection, sorting, pagination, and improved status system.
 * Uses shadcn/ui components following official documentation with checkboxes for selection.
 */

'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RecentRequest, SortConfig, TableSelection } from '@/lib/dashboard/types'
import { RecentRequestsTableSkeleton } from './LoadingSkeletons'
import { RecentRequestsTableError, RecentRequestsTableEmpty } from './ErrorStates'
import { StatusFilterTabs } from './StatusFilterChips'

const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' }
]

interface RecentRequestsTableProps {
  requests: RecentRequest[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onSelectionChange?: (selectedIds: string[]) => void
  highlightedRequestId?: string | null
}

/**
 * Status badge color mapping with updated color scheme
 * Updated to match requirements: Approved (orange-100), Pending (red-100), Completed (blue-100)
 */
const getStatusBadgeClasses = (statusId: string): string => {
  switch (statusId) {
    case 'approved':
      return 'bg-orange-100 text-orange-600 h-7' // 28px height for AI auto-approved
    case 'pending':
      return 'bg-red-100 text-red-600 h-7' // 28px height for rejected requiring changes
    case 'completed':
      return 'bg-blue-100 text-blue-600 h-7' // 28px height for executed requests
    default:
      return 'bg-gray-100 text-gray-600 h-7'
  }
}

/**
 * Format date string to readable format
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Sort requests based on configuration
 */
const sortRequests = (requests: RecentRequest[], sortConfig: SortConfig | null): RecentRequest[] => {
  if (!sortConfig || !requests) return requests || []

  return [...requests].sort((a, b) => {
    let aValue: any
    let bValue: any

    if (sortConfig.key === 'status.label') {
      aValue = a.status.label
      bValue = b.status.label
    } else {
      aValue = a[sortConfig.key as keyof RecentRequest]
      bValue = b[sortConfig.key as keyof RecentRequest]
    }

    // Handle date sorting
    if (sortConfig.key === 'submittedDate' || sortConfig.key === 'targetLaunchDate') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }

    // Handle string sorting
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1
    }
    return 0
  })
}

export function RecentRequestsTable({
  requests = [],
  loading = false,
  error = null,
  onRetry,
  onSelectionChange,
  highlightedRequestId = null
}: RecentRequestsTableProps) {
  // Always call all hooks in the same order
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selection, setSelection] = useState<TableSelection>({
    selectedRows: [],
    isAllSelected: false,
    isIndeterminate: false
  })
  const itemsPerPage = 10

  // Ref for the table container to enable scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Filter requests based on active filter
  const filteredRequests = useMemo(() => {
    if (activeFilter === 'all') return requests
    return requests.filter(request => request.status.id === activeFilter)
  }, [requests, activeFilter])

  // Always call useMemo - handle empty/null requests inside
  const sortedRequests = useMemo(() => {
    return sortRequests(filteredRequests, sortConfig)
  }, [filteredRequests, sortConfig])

  // Handle scroll-to-row functionality when highlightedRequestId changes
  useEffect(() => {
    if (highlightedRequestId && requests.length > 0) {
      // Find the request in the filtered and sorted data
      const targetRequest = sortedRequests.find(req => req.id === highlightedRequestId)
      if (targetRequest) {
        // Find which page the request is on
        const requestIndex = sortedRequests.indexOf(targetRequest)
        const targetPage = Math.floor(requestIndex / itemsPerPage) + 1

        // Navigate to the correct page if needed
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage)
        }

        // Scroll to the table after a short delay to ensure rendering
        setTimeout(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            })
          }
        }, 100)
      }
    }
  }, [highlightedRequestId, sortedRequests, currentPage, itemsPerPage, requests.length])

  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRequests = sortedRequests.slice(startIndex, startIndex + itemsPerPage)

  // Always call all useCallback hooks
  const updateSelectionState = useCallback((selectedRows: string[]) => {
    const currentPageIds = paginatedRequests.map(req => req.id)
    const selectedOnCurrentPage = selectedRows.filter(id => currentPageIds.includes(id))

    const isAllSelected = currentPageIds.length > 0 && selectedOnCurrentPage.length === currentPageIds.length
    const isIndeterminate = selectedOnCurrentPage.length > 0 && selectedOnCurrentPage.length < currentPageIds.length

    setSelection({
      selectedRows,
      isAllSelected,
      isIndeterminate
    })

    // Notify parent component of selection changes
    onSelectionChange?.(selectedRows)
  }, [paginatedRequests, onSelectionChange])

  const handleRowSelection = useCallback((requestId: string, checked: boolean) => {
    const newSelectedRows = checked
      ? [...selection.selectedRows, requestId]
      : selection.selectedRows.filter(id => id !== requestId)

    updateSelectionState(newSelectedRows)
  }, [selection.selectedRows, updateSelectionState])

  const handleSelectAll = useCallback((checked: boolean) => {
    const currentPageIds = paginatedRequests.map(req => req.id)

    const newSelectedRows = checked
      ? Array.from(new Set([...selection.selectedRows, ...currentPageIds]))
      : selection.selectedRows.filter(id => !currentPageIds.includes(id))

    updateSelectionState(newSelectedRows)
  }, [paginatedRequests, selection.selectedRows, updateSelectionState])

  const handleSort = useCallback((key: keyof RecentRequest | 'status.label') => {
    let direction: 'asc' | 'desc' = 'asc'

    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }

    setSortConfig({ key, direction })
    setCurrentPage(1) // Reset to first page when sorting
  }, [sortConfig])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilter(filterId)
    setCurrentPage(1) // Reset to first page when filtering
  }, [])

  // Render sort icon function
  const renderSortIcon = useCallback((key: keyof RecentRequest | 'status.label') => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronDown className="h-4 w-4 opacity-50" />
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />
  }, [sortConfig])

  // Now handle conditional rendering after all hooks are called
  if (loading) {
    return <RecentRequestsTableSkeleton />
  }

  if (error) {
    return <RecentRequestsTableError onRetry={onRetry} />
  }

  if (!requests || requests.length === 0) {
    return <RecentRequestsTableEmpty />
  }

  // Show empty state for filtered results
  if (filteredRequests.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>

        {/* Status Filter Tabs */}
        <StatusFilterTabs
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />

        <div className="text-center py-8 text-gray-500">
          <p>No requests found for "{FILTER_CHIPS.find(chip => chip.id === activeFilter)?.label}" status.</p>
          <button
            onClick={() => handleFilterChange('all')}
            className="mt-2 text-[#5754FF] hover:text-[#4338CA] underline"
          >
            Show all requests
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>

      {/* Status Filter Tabs */}
      <StatusFilterTabs
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Table container with horizontal scroll for mobile */}
      <div
        ref={tableContainerRef}
        className="rounded-md border border-gray-200 bg-white overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="w-12 px-3 sm:px-4 py-3">
                  <Checkbox
                    checked={selection.isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 min-w-[120px] px-3 sm:px-4 py-3 text-xs sm:text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-1">
                    Request ID
                    {renderSortIcon('id')}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 min-w-[180px] sm:min-w-[200px] px-3 sm:px-4 py-3 text-xs sm:text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSort('pageArea')}
                >
                  <div className="flex items-center gap-1">
                    Page Area
                    {renderSortIcon('pageArea')}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 min-w-[100px] sm:min-w-[120px] px-3 sm:px-4 py-3 text-xs sm:text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {renderSortIcon('type')}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 min-w-[120px] sm:min-w-[140px] px-3 sm:px-4 py-3 text-xs sm:text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSort('submittedDate')}
                >
                  <div className="flex items-center gap-1">
                    Submission Date
                    {renderSortIcon('submittedDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 min-w-[120px] sm:min-w-[140px] px-3 sm:px-4 py-3 text-xs sm:text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSort('targetLaunchDate')}
                >
                  <div className="flex items-center gap-1">
                    Target Go-live Date
                    {renderSortIcon('targetLaunchDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 min-w-[100px] sm:min-w-[120px] px-3 sm:px-4 py-3 text-xs sm:text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSort('status.label')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {renderSortIcon('status.label')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRequests.map((request) => {
                const isHighlighted = highlightedRequestId === request.id
                return (
                  <TableRow
                    key={request.id}
                    className={`bg-white hover:bg-gray-50 transition-all duration-500 ${isHighlighted
                        ? 'bg-primary/5 border-l-4 border-l-primary shadow-md'
                        : ''
                      }`}
                  >
                    <TableCell className="px-3 sm:px-4 py-3">
                      <Checkbox
                        checked={selection.selectedRows.includes(request.id)}
                        onCheckedChange={(checked) => handleRowSelection(request.id, checked as boolean)}
                        aria-label={`Select request ${request.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium px-3 sm:px-4 py-3 text-xs sm:text-sm">
                      <a
                        href="#"
                        className="text-[#5754FF] underline hover:text-[#4338CA] transition-colors block truncate max-w-[100px] sm:max-w-none"
                        title={request.id}
                      >
                        {request.id}
                      </a>
                    </TableCell>
                    <TableCell className="text-gray-700 px-3 sm:px-4 py-3 text-xs sm:text-sm">
                      <span className="block truncate max-w-[150px] sm:max-w-none" title={request.pageArea}>
                        {request.pageArea}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-700 px-3 sm:px-4 py-3 text-xs sm:text-sm">
                      <span className="block truncate max-w-[80px] sm:max-w-none" title={request.type}>
                        {request.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-700 px-3 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                      {formatDate(request.submittedDate)}
                    </TableCell>
                    <TableCell className="text-gray-700 px-3 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                      {request.targetLaunchDate ? formatDate(request.targetLaunchDate) : '-'}
                    </TableCell>
                    <TableCell className="px-3 sm:px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={`text-xs whitespace-nowrap border-0 ${getStatusBadgeClasses(request.status.id)}`}
                      >
                        {request.status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Selection counter and pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span>
            {selection.selectedRows.length} of {paginatedRequests.length} row{paginatedRequests.length !== 1 ? 's' : ''} selected.
          </span>
        </div>

        <div className="flex justify-end">
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage > 1) handlePageChange(currentPage - 1)
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(page)
                      }}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage < totalPages) handlePageChange(currentPage + 1)
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  )
}