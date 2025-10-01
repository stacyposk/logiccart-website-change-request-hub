/**
 * Dashboard Mock Data
 * 
 * Realistic mock data for dashboard components matching the requirements.
 * Data structure prepared for future DynamoDB integration.
 */

import { 
  StatisticCard, 
  RecentRequest, 
  NewsItem, 
  DashboardData,
  RequestStatus 
} from './types'
import { TrendingUp } from 'lucide-react'

/**
 * Request status definitions with color coding
 * Updated to match requirements: Only 3 status types - Approved, Pending, Completed
 */
export const REQUEST_STATUSES: Record<string, RequestStatus> = {
  approved: {
    id: 'approved', 
    label: 'Approved',
    color: 'approved'
  },
  pending: {
    id: 'pending',
    label: 'Pending',
    color: 'pending'
  },
  completed: {
    id: 'completed',
    label: 'Completed',
    color: 'completed'
  }
}

/**
 * Mock statistics data matching requirements
 * Total Requests: 7, Approved: 2, Pending: 2, Completed: 3
 * (Pending includes both NEEDS_INFO and REJECT from Bedrock Agent)
 */
export const mockStatistics: StatisticCard[] = [
  {
    title: 'Total Requests',
    value: 7,
    variant: 'gradient',
    trend: {
      icon: TrendingUp,
      value: '+10%',
      color: 'green',
      label: 'from last month'
    }
  },
  {
    title: 'Approved Requests',
    value: 2,
    variant: 'white',
    trend: {
      icon: TrendingUp,
      value: '+5%',
      color: 'green',
      label: 'from last month'
    }
  },
  {
    title: 'Pending Requests',
    value: 2,
    variant: 'white',
    helperText: 'require further information'
  },
  {
    title: 'Completed Requests',
    value: 3,
    variant: 'white',
    trend: {
      icon: TrendingUp,
      value: '8%',
      color: 'green',
      label: 'from last month'
    }
  }
]

/**
 * Mock recent requests data with realistic entries
 * Updated to September 2025 dates up to Sep 14, 2025 (today) in reverse chronological order
 * Uses only 3 status types: Approved, Pending, Completed as per requirements
 * Removed all entries after Sep 14, 2025 as per requirements
 */
export const mockRecentRequests: RecentRequest[] = [
  {
    id: 'REQ-2025-007',
    pageArea: 'Contact Page - Form',
    type: 'Bug Fix',
    status: REQUEST_STATUSES.completed,
    submittedDate: '2025-09-14',
    requesterEmail: 'support@logiccart.com',
    priority: 'high',
    estimatedCompletion: '2025-09-21'
  },
  {
    id: 'REQ-2025-006',
    pageArea: 'Blog - Article Layout',
    type: 'New Feature',
    status: REQUEST_STATUSES.approved,
    submittedDate: '2025-09-12',
    requesterEmail: 'content@logiccart.com',
    priority: 'medium',
    estimatedCompletion: '2025-09-19'
  },
  {
    id: 'REQ-2025-005',
    pageArea: 'Newsletter - Signup Form',
    type: 'New Banner',
    status: REQUEST_STATUSES.pending,
    submittedDate: '2025-09-10',
    requesterEmail: 'marketing@logiccart.com',
    priority: 'medium',
    estimatedCompletion: '2025-09-17'
  },
  {
    id: 'REQ-2025-004',
    pageArea: 'FAQ - Search Function',
    type: 'New Feature',
    status: REQUEST_STATUSES.completed,
    submittedDate: '2025-09-08',
    requesterEmail: 'support@logiccart.com',
    priority: 'low',
    estimatedCompletion: '2025-09-15'
  },
  {
    id: 'REQ-2025-003',
    pageArea: 'User Profile - Settings',
    type: 'Bug Fix',
    status: REQUEST_STATUSES.approved,
    submittedDate: '2025-09-06',
    requesterEmail: 'engineering@logiccart.com',
    priority: 'high',
    estimatedCompletion: '2025-09-13'
  },
  {
    id: 'REQ-2025-002',
    pageArea: 'Shopping Cart - Totals',
    type: 'Copy Update',
    status: REQUEST_STATUSES.pending,
    submittedDate: '2025-09-04',
    requesterEmail: 'ux@logiccart.com',
    priority: 'medium',
    estimatedCompletion: '2025-09-11'
  },
  {
    id: 'REQ-2025-001',
    pageArea: 'Landing Page - CTA Button',
    type: 'SEO Update',
    status: REQUEST_STATUSES.completed,
    submittedDate: '2025-09-02',
    requesterEmail: 'seo@logiccart.com',
    priority: 'low',
    estimatedCompletion: '2025-09-09'
  }
]

/**
 * Mock news data with the three specified static updates
 * Updated structure with separate headline and details fields for accordion format
 */
export const mockNews: NewsItem[] = [
  {
    id: 'news-001',
    date: '2025-09-10',
    headline: 'Scheduled maintenance on product page CMS',
    details: 'We will be performing scheduled maintenance on the product page CMS. Please expect downtime between 2–4pm. All pending requests will be processed after maintenance is complete.',
    type: 'maintenance',
    priority: 'high',
    isRead: false
  },
  {
    id: 'news-002',
    date: '2025-09-08', 
    headline: 'New homepage banner deployed successfully',
    details: 'The new homepage banner featuring our fall collection has been successfully deployed. All related change requests have been marked as completed.',
    type: 'deployment',
    priority: 'medium',
    isRead: false
  },
  {
    id: 'news-003',
    date: '2025-09-06',
    headline: 'Checkout bug fix rollout postponed',
    details: 'The checkout bug fix rollout has been postponed to next week due to additional testing requirements. We will notify all stakeholders once the new deployment date is confirmed.',
    type: 'announcement',
    priority: 'medium',
    isRead: true
  }
]

/**
 * Complete mock dashboard data
 * Ready for integration with components and future API replacement
 */
export const mockDashboardData: DashboardData = {
  statistics: mockStatistics,
  recentRequests: mockRecentRequests,
  news: mockNews,
  lastUpdated: new Date().toISOString(),
  userEmail: 'user@logiccart.com' // For future filtering
}

/**
 * Helper function to filter requests by requester email
 * Prepared for future DynamoDB integration and session storage filtering
 */
export function filterRequestsByEmail(
  requests: RecentRequest[], 
  email?: string
): RecentRequest[] {
  if (!email) return requests
  return requests.filter(request => request.requesterEmail === email)
}

/**
 * Helper function to get statistics for filtered data
 * Useful for user-specific dashboard views
 * Updated to work with 3 status types: Approved, Pending, Completed
 */
export function calculateStatistics(requests: RecentRequest[]): StatisticCard[] {
  const total = requests.length
  const approved = requests.filter(r => r.status.id === 'approved').length
  const pending = requests.filter(r => r.status.id === 'pending').length
  const completed = requests.filter(r => r.status.id === 'completed').length

  return [
    {
      title: 'Total Requests',
      value: total,
      variant: 'gradient',
      trend: {
        icon: TrendingUp,
        value: '+10%',
        color: 'green',
        label: 'from last month'
      }
    },
    {
      title: 'Approved Requests',
      value: approved,
      variant: 'white',
      trend: {
        icon: TrendingUp,
        value: '+5%',
        color: 'green',
        label: 'from last month'
      }
    },
    {
      title: 'Pending Requests',
      value: pending,
      variant: 'white',
      helperText: 'require further information'
    },
    {
      title: 'Completed Requests',
      value: completed,
      variant: 'white',
      trend: {
        icon: TrendingUp,
        value: '8%',
        color: 'green',
        label: 'from last month'
      }
    }
  ]
}

/**
 * Helper function to simulate API delay for realistic loading states
 */
export function simulateApiDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Mock API function for fetching dashboard data
 * Simulates future DynamoDB integration with filtering
 */
export async function fetchDashboardData(
  email?: string,
  includeStatistics = true,
  includeRequests = true, 
  includeNews = true
): Promise<DashboardData> {
  // Simulate API delay
  await simulateApiDelay(100)
  
  const filteredRequests = email 
    ? filterRequestsByEmail(mockRecentRequests, email)
    : mockRecentRequests
    
  const statistics = includeStatistics 
    ? (email ? calculateStatistics(filteredRequests) : mockStatistics)
    : []
    
  return {
    statistics,
    recentRequests: includeRequests ? filteredRequests : [],
    news: includeNews ? mockNews : [],
    lastUpdated: new Date().toISOString(),
    userEmail: email
  }
}