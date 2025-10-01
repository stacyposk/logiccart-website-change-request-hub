/**
 * Status mapping utilities for Bedrock Agent to Dashboard conversion
 */

import { RequestStatus } from '@/lib/dashboard/types'

/**
 * Request status definitions with color coding
 * User-friendly 3-status system: Approved, Pending, Completed
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
 * Maps backend Bedrock Agent statuses to frontend display statuses
 * User-friendly approach: Both NEEDS_INFO and REJECT map to "Pending" 
 * Handles both the agent decision format (uppercase) and DynamoDB stored format (lowercase)
 */
export function mapBackendStatusToFrontend(backendStatus: string): RequestStatus {
  const normalizedStatus = backendStatus.toLowerCase()
  
  switch (normalizedStatus) {
    case 'approve':
    case 'approved':
      return REQUEST_STATUSES.approved
    case 'needs_info':
    case 'reject':
    case 'rejected':
    case 'pending':
      return REQUEST_STATUSES.pending
    case 'completed':
    case 'complete':
      return REQUEST_STATUSES.completed
    default:
      // Default unknown statuses to pending for safety
      return REQUEST_STATUSES.pending
  }
}

/**
 * Helper function to get all possible backend statuses that map to a frontend status
 * Includes both agent decision format and DynamoDB stored format
 */
export function getBackendStatusesForFrontend(frontendStatus: 'approved' | 'pending' | 'completed'): string[] {
  switch (frontendStatus) {
    case 'approved':
      return ['approve', 'approved', 'APPROVE', 'APPROVED']
    case 'pending':
      return ['needs_info', 'reject', 'rejected', 'pending', 'NEEDS_INFO', 'REJECT', 'REJECTED', 'PENDING']
    case 'completed':
      return ['completed', 'complete', 'COMPLETED', 'COMPLETE']
    default:
      return []
  }
}