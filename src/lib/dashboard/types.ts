/**
 * Dashboard Data Types
 * 
 * TypeScript interfaces for dashboard components and data structures.
 * Prepared for future DynamoDB integration with requester email filtering.
 */

import { LucideIcon } from 'lucide-react'

/**
 * Trend indicator interface for statistics cards
 */
export interface TrendIndicator {
  icon: LucideIcon
  value: string
  color: 'green' | 'red' | 'grey'
  label: string
}

/**
 * Statistics card interface for dashboard overview
 */
export interface StatisticCard {
  title: string
  value: number
  icon?: LucideIcon
  variant?: 'gradient' | 'white'
  trend?: TrendIndicator
  helperText?: string
}

/**
 * Request status with color coding for UI display
 * Maps Bedrock Agent statuses: APPROVE → approved, NEEDS_INFO → pending, completed → completed
 */
export interface RequestStatus {
  id: 'approved' | 'pending' | 'completed'
  label: 'Approved' | 'Pending' | 'Completed'
  color: 'approved' | 'pending' | 'completed'
}

/**
 * Recent request interface matching existing ticket schema
 * Prepared for DynamoDB integration with requesterEmail filtering
 */
export interface RecentRequest {
  id: string
  pageArea: string
  type: 'New Banner' | 'Copy Update' | 'SEO Update' | 'Bug Fix' | 'New Feature'
  status: RequestStatus
  submittedDate: string
  requesterEmail?: string // For future filtering by user session
  priority?: 'low' | 'medium' | 'high'
  estimatedCompletion?: string
  targetLaunchDate?: string // Target go-live date (YYYY-MM-DD format)
}

/**
 * Sort configuration for table columns
 */
export interface SortConfig {
  key: keyof RecentRequest | 'status.label'
  direction: 'asc' | 'desc'
}

/**
 * Pagination configuration for table
 */
export interface PaginationConfig {
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
}

/**
 * News item interface for system updates and announcements
 */
export interface NewsItem {
  id: string
  date: string
  headline: string
  details: string
  type?: 'maintenance' | 'deployment' | 'announcement' | 'feature'
  priority?: 'low' | 'medium' | 'high'
  isRead?: boolean
}

/**
 * Main dashboard data container
 * Structured for easy API integration and data fetching
 */
export interface DashboardData {
  statistics: StatisticCard[]
  recentRequests: RecentRequest[]
  news: NewsItem[]
  lastUpdated: string
  userEmail?: string // For personalized data filtering
}

/**
 * Dashboard filters for future API integration
 * Supports filtering by user email and date ranges
 */
export interface DashboardFilters {
  requesterEmail?: string
  dateRange?: {
    start: string
    end: string
  }
  status?: string[]
  requestType?: string[]
  limit?: number
  offset?: number
}

/**
 * API response interface for future DynamoDB integration
 * Matches expected backend response structure
 */
export interface DashboardApiResponse {
  statistics: {
    totalRequests: number
    approvedRequests: number
    pendingExecution: number
    completedRequests?: number
    rejectedRequests?: number
  }
  recentRequests: RecentRequest[]
  news: NewsItem[]
  pagination?: {
    total: number
    page: number
    limit: number
    hasNext: boolean
  }
  lastUpdated: string
}

/**
 * API request interface for dashboard data fetching
 */
export interface DashboardApiRequest {
  filters?: DashboardFilters
  includeStatistics?: boolean
  includeRecentRequests?: boolean
  includeNews?: boolean
}

/**
 * Table selection state for data table with checkboxes
 */
export interface TableSelection {
  selectedRows: string[]
  isAllSelected: boolean
  isIndeterminate: boolean
}

/**
 * Loading states for dashboard components
 */
export interface DashboardLoadingState {
  statistics: boolean
  recentRequests: boolean
  news: boolean
  isInitialLoad: boolean
}

/**
 * Error states for dashboard components
 */
export interface DashboardError {
  component: 'statistics' | 'recentRequests' | 'news' | 'general'
  message: string
  code?: string
  retryable: boolean
}