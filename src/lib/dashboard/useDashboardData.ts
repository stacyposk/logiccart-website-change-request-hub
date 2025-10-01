/**
 * Dashboard Data Hook
 * 
 * Custom hook for managing dashboard data loading, error states, and retry logic.
 * Connects to real AWS API endpoints for production data.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { 
  StatisticCard, 
  RecentRequest, 
  NewsItem, 
  DashboardLoadingState, 
  DashboardError,
  RequestStatus
} from './types'
import { getDashboard, transformErrorMessage } from '../api/client'
import { DashboardApiResponse, TicketSummary } from '../api/types'

interface UseDashboardDataReturn {
  statistics: StatisticCard[]
  recentRequests: RecentRequest[]
  news: NewsItem[]
  loading: DashboardLoadingState
  errors: {
    statistics: string | null
    recentRequests: string | null
    news: string | null
  }
  retryStatistics: () => void
  retryRecentRequests: () => void
  retryNews: () => void
  retryAll: () => void
}

/**
 * Transform API dashboard response to frontend data structures
 */
const transformDashboardData = (apiResponse: DashboardApiResponse) => {
  // Transform statistics
  const statistics: StatisticCard[] = [
    {
      title: 'Total Requests',
      value: apiResponse.totals.total,
      variant: 'gradient' as const,
      trend: {
        icon: apiResponse.trends.totalTrend.startsWith('+') ? TrendingUp : 
              apiResponse.trends.totalTrend.startsWith('-') ? TrendingDown : Minus,
        value: apiResponse.trends.totalTrend,
        color: apiResponse.trends.totalTrend.startsWith('+') ? 'green' : 
               apiResponse.trends.totalTrend.startsWith('-') ? 'red' : 'grey',
        label: 'vs last month'
      }
    },
    {
      title: 'Approved',
      value: apiResponse.totals.approved,
      variant: 'white' as const,
      trend: {
        icon: apiResponse.trends.approvedTrend.startsWith('+') ? TrendingUp : 
              apiResponse.trends.approvedTrend.startsWith('-') ? TrendingDown : Minus,
        value: apiResponse.trends.approvedTrend,
        color: apiResponse.trends.approvedTrend.startsWith('+') ? 'green' : 
               apiResponse.trends.approvedTrend.startsWith('-') ? 'red' : 'grey',
        label: 'vs last month'
      }
    },
    {
      title: 'Pending',
      value: apiResponse.totals.pending,
      variant: 'white' as const,
      helperText: 'pending approval or further changes'
    },
    {
      title: 'Completed',
      value: apiResponse.totals.completed,
      variant: 'white' as const,
      trend: {
        icon: apiResponse.trends.completedTrend.startsWith('+') ? TrendingUp : 
              apiResponse.trends.completedTrend.startsWith('-') ? TrendingDown : Minus,
        value: apiResponse.trends.completedTrend,
        color: apiResponse.trends.completedTrend.startsWith('+') ? 'green' : 
               apiResponse.trends.completedTrend.startsWith('-') ? 'red' : 'grey',
        label: 'vs last month'
      }
    }
  ]

  // Transform recent requests
  const recentRequests: RecentRequest[] = apiResponse.recent.map((ticket: TicketSummary) => {
    const statusMap: Record<string, RequestStatus> = {
      'approved': { id: 'approved', label: 'Approved', color: 'approved' },
      'pending': { id: 'pending', label: 'Pending', color: 'pending' },
      'completed': { id: 'completed', label: 'Completed', color: 'completed' }
    }

    return {
      id: ticket.ticketId,
      pageArea: ticket.pageArea,
      type: ticket.changeType as RecentRequest['type'],
      status: statusMap[ticket.status] || statusMap['pending'],
      submittedDate: ticket.createdAt,
      priority: 'medium', // Default priority since urgency field was removed
      targetLaunchDate: ticket.targetLaunchDate
    }
  })

  return {
    statistics,
    recentRequests,
    news: apiResponse.news
  }
}

/**
 * Custom hook for dashboard data management
 */
export function useDashboardData(): UseDashboardDataReturn {
  const [statistics, setStatistics] = useState<StatisticCard[]>([])
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  
  const [loading, setLoading] = useState<DashboardLoadingState>({
    statistics: false,
    recentRequests: false,
    news: false,
    isInitialLoad: false
  })
  
  const [errors, setErrors] = useState({
    statistics: null as string | null,
    recentRequests: null as string | null,
    news: null as string | null
  })

  /**
   * Load all dashboard data from API
   */
  const loadDashboardData = useCallback(async () => {
    setLoading(prev => ({ ...prev, statistics: true, recentRequests: true, news: true }))
    setErrors({ statistics: null, recentRequests: null, news: null })
    
    try {
      const apiResponse = await getDashboard()
      const transformedData = transformDashboardData(apiResponse)
      
      setStatistics(transformedData.statistics)
      setRecentRequests(transformedData.recentRequests)
      setNews(transformedData.news)
    } catch (error) {
      const errorMessage = transformErrorMessage(error)
      setErrors({
        statistics: errorMessage,
        recentRequests: errorMessage,
        news: errorMessage
      })
    } finally {
      setLoading(prev => ({ 
        ...prev, 
        statistics: false, 
        recentRequests: false, 
        news: false,
        isInitialLoad: false
      }))
    }
  }, [])

  /**
   * Load statistics data (individual retry)
   */
  const loadStatistics = useCallback(async () => {
    setLoading(prev => ({ ...prev, statistics: true }))
    setErrors(prev => ({ ...prev, statistics: null }))
    
    try {
      const apiResponse = await getDashboard()
      const transformedData = transformDashboardData(apiResponse)
      setStatistics(transformedData.statistics)
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        statistics: transformErrorMessage(error)
      }))
    } finally {
      setLoading(prev => ({ ...prev, statistics: false }))
    }
  }, [])

  /**
   * Load recent requests data (individual retry)
   */
  const loadRecentRequests = useCallback(async () => {
    setLoading(prev => ({ ...prev, recentRequests: true }))
    setErrors(prev => ({ ...prev, recentRequests: null }))
    
    try {
      const apiResponse = await getDashboard()
      const transformedData = transformDashboardData(apiResponse)
      setRecentRequests(transformedData.recentRequests)
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        recentRequests: transformErrorMessage(error)
      }))
    } finally {
      setLoading(prev => ({ ...prev, recentRequests: false }))
    }
  }, [])

  /**
   * Load news data (individual retry)
   */
  const loadNews = useCallback(async () => {
    setLoading(prev => ({ ...prev, news: true }))
    setErrors(prev => ({ ...prev, news: null }))
    
    try {
      const apiResponse = await getDashboard()
      const transformedData = transformDashboardData(apiResponse)
      setNews(transformedData.news)
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        news: transformErrorMessage(error)
      }))
    } finally {
      setLoading(prev => ({ ...prev, news: false }))
    }
  }, [])

  /**
   * Retry functions
   */
  const retryStatistics = useCallback(() => {
    loadStatistics()
  }, [loadStatistics])

  const retryRecentRequests = useCallback(() => {
    loadRecentRequests()
  }, [loadRecentRequests])

  const retryNews = useCallback(() => {
    loadNews()
  }, [loadNews])

  const retryAll = useCallback(() => {
    loadDashboardData()
  }, [loadDashboardData])

  /**
   * Clear any cached data for force refresh
   */
  const clearCache = useCallback(() => {
    // Clear component state to force fresh data
    setStatistics([])
    setRecentRequests([])
    setNews([])
    setErrors({ statistics: null, recentRequests: null, news: null })
  }, [])

  /**
   * Initial data loading with force refresh support
   */
  useEffect(() => {
    setLoading(prev => ({ ...prev, isInitialLoad: true }))
    
    // Check for force refresh parameter
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const forceRefresh = urlParams.get('forceRefresh') === 'true'
      
      if (forceRefresh) {
        // Clear any cached data and force fresh fetch
        clearCache()
        loadDashboardData()
        
        // Clean up URL parameter after processing
        const newParams = new URLSearchParams(urlParams)
        newParams.delete('forceRefresh')
        
        // Preserve other parameters like ticketId and scroll
        const newUrl = window.location.pathname + 
          (newParams.toString() ? `?${newParams.toString()}` : '')
        
        window.history.replaceState({}, '', newUrl)
      } else {
        loadDashboardData()
      }
    } else {
      loadDashboardData()
    }
  }, [loadDashboardData, clearCache])

  return {
    statistics,
    recentRequests,
    news,
    loading,
    errors,
    retryStatistics,
    retryRecentRequests,
    retryNews,
    retryAll
  }
}