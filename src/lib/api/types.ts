/**
 * Types of changes that can be requested
 * These match the exact options available in the form dropdown
 */

/**
 * Types of changes that can be requested
 * These match the exact options available in the form
 */
export type ChangeType = 'Content Update' | 'Layout' | 'Bug Fix' | 'New Feature'

/**
 * Response from the get upload URL API endpoint
 * Contains the pre-signed URL and S3 key for direct file upload
 */
export interface UploadUrlResponse {
  /** Pre-signed URL for uploading directly to S3 using HTTP PUT */
  uploadUrl: string
  /** S3 key where the file will be stored (used later in AssetMeta) */
  s3Key: string
}

/**
 * Response from the create ticket API endpoint
 */
export interface CreateTicketResponse {
  /** Unique identifier for the created ticket */
  ticketId: string
  /** Timestamp when the ticket was submitted (ISO 8601 string, server time preferred) */
  submittedAt?: string
}

/**
 * Metadata for uploaded assets/images
 * Contains all information needed to reference and display uploaded images
 */
export interface AssetMeta {
  /** Original filename of the uploaded file */
  filename: string
  /** File size in kilobytes (calculated from File.size / 1024) */
  sizeKb: number
  /** Image width in pixels (extracted using createImageBitmap or Image) */
  width: number
  /** Image height in pixels (extracted using createImageBitmap or Image) */
  height: number
  /** Alt text for accessibility (required for all images) */
  altText: string
  /** Type of image (desktop or mobile) */
  type: 'desktop' | 'mobile'
  /** S3 key where the asset is stored (returned from upload URL response) */
  s3Key: string
}

/**
 * Complete payload for creating a ticket
 * This represents all the data that will be sent to the backend API
 */
export interface TicketPayload {
  /** Name of the person making the request */
  requesterName: string
  /** Email address of the person making the request */
  requesterEmail: string
  /** Department of the requester */
  department: string
  /** Area of the website to be changed (e.g., "Homepage Banner", "Product Page") */
  pageArea: string
  /** Type of change being requested */
  changeType: ChangeType
  /** List of URLs affected by the change (at least one required) */
  pageUrls: string[]
  /** Brief description of the specific change requested */
  description: string
  /** English copy content (entered via English tab in UI) */
  copyEn?: string
  /** Chinese copy content (entered via Chinese tab in UI) */
  copyZh?: string
  /** Target launch date in YYYY-MM-DD format (must be today or future date) */
  targetLaunchDate?: string
  /** Array of uploaded image assets with metadata */
  assets?: AssetMeta[]
}

/**
 * Error response from API endpoints
 * Standardized error format for consistent error handling
 */
export interface ApiErrorResponse {
  /** Human-readable error message for display to users */
  message: string
  /** Error code for programmatic handling (e.g., 'VALIDATION_ERROR', 'UPLOAD_FAILED') */
  code?: string
  /** Additional error details for debugging (not shown to users) */
  details?: Record<string, unknown>
}

/**
 * Dashboard API response from GET /api/dashboard
 * Contains all dashboard data including statistics, trends, recent tickets, and news
 */
export interface DashboardApiResponse {
  /** Statistics totals by status */
  totals: {
    total: number
    approved: number
    pending: number
    completed: number
  }
  /** Month-over-month trend percentages */
  trends: {
    totalTrend: string      // e.g., "+12%"
    approvedTrend: string   // e.g., "+8%"
    completedTrend: string  // e.g., "+15%"
  }
  /** Recent ticket summaries (top 5) */
  recent: TicketSummary[]
  /** System news and announcements */
  news: NewsItem[]
  /** When the data was last updated */
  lastUpdated: string
  /** Metadata about the query */
  metadata?: {
    totalScanned: number
    scanOperations: number
    cached: boolean
  }
}

/**
 * Tickets API response from GET /api/tickets
 * Contains filtered ticket list with pagination
 */
export interface TicketsApiResponse {
  /** Array of ticket summaries */
  items: TicketSummary[]
  /** Total count of items returned */
  count: number
  /** Pagination key for next page (if more results available) */
  lastKey?: string
}

/**
 * Ticket summary for dashboard display
 * Contains essential ticket information with privacy protection
 */
export interface TicketSummary {
  /** Unique ticket identifier */
  ticketId: string
  /** Masked requester name for privacy (e.g., "John D.") */
  requesterName: string
  /** Page area being changed */
  pageArea: string
  /** Type of change requested */
  changeType: string
  /** Current ticket status */
  status: string
  /** When the ticket was created (ISO-8601 UTC) */
  createdAt: string
  /** Target go-live date (YYYY-MM-DD format) */
  targetLaunchDate?: string
}

/**
 * News item for system announcements
 */
export interface NewsItem {
  /** Unique news item identifier */
  id: string
  /** Date of the news item (YYYY-MM-DD) */
  date: string
  /** News headline */
  headline: string
  /** Detailed news content */
  details: string
  /** Type of news item */
  type?: 'maintenance' | 'deployment' | 'announcement'
  /** Priority level */
  priority?: 'high' | 'medium' | 'low'
}

/**
 * Query parameters for GET /api/tickets
 */
export interface TicketsQueryParams {
  /** Filter by ticket status */
  status?: string
  /** Filter by requester email */
  email?: string
  /** Filter by date range - from date */
  from?: string
  /** Filter by date range - to date */
  to?: string
  /** Maximum number of results to return */
  limit?: number
  /** Pagination key from previous response */
  lastKey?: string
}

/**
 * AI Preview request payload
 * Contains form data for AI analysis
 */
export interface AIPreviewRequest {
  /** Form data to analyze */
  formData: Partial<TicketPayload>
  /** Optional uploaded assets metadata */
  uploadedAssets?: AssetMeta[]
}

/**
 * AI Preview issue identified by analysis
 */
export interface AIPreviewIssue {
  /** Field name that has the issue */
  field: string
  /** Severity level of the issue */
  severity: 'low' | 'med' | 'high'
  /** Description of the issue */
  note: string
}

/**
 * AI Preview analysis response
 * Contains AI-generated feedback on form completeness and compliance
 */
export interface AIPreviewResponse {
  /** AI decision on the request */
  decision: 'approve' | 'needs_info' | 'reject'
  /** List of issues identified */
  issues: AIPreviewIssue[]
  /** Acceptance criteria recommendations */
  acceptanceCriteria: string[]
  /** AI confidence score (0-1) */
  confidence: number
}

/**
 * Bedrock Agent analysis response
 * Contains AI decision and reasoning for submitted tickets
 * Note: NEEDS_INFO and REJECT decisions both display as "Pending" in the dashboard
 */
export interface BedrockAgentResponse {
  /** AI decision on the ticket */
  decision: 'APPROVE' | 'REJECT' | 'NEEDS_INFO'
  /** List of reasons for the decision */
  reasons: string[]
  /** AI confidence score (0-1) */
  confidence: number
  /** Email template for NEEDS_INFO and REJECT decisions */
  email?: {
    subject: string
    body: string
  }
  /** Analysis method used */
  analysis_method: string
  /** When the analysis was processed */
  processed_at: string
  /** Ticket ID that was analyzed */
  ticket_id: string
  /** Type of request analyzed */
  request_type: string
  /** Whether AI analysis was used */
  ai_analysis: boolean
  /** Requester email for notifications */
  requester_email: string
}

/**
 * Configuration for API client
 * Contains all environment-specific settings for API communication
 */
export interface ApiConfig {
  /** Base URL for API endpoints (from NEXT_PUBLIC_API_BASE) */
  baseUrl: string
  /** Path for get upload URL endpoint (from NEXT_PUBLIC_GET_UPLOAD_URL_PATH) */
  getUploadUrlPath: string
  /** Path for create ticket endpoint (from NEXT_PUBLIC_CREATE_TICKET_PATH) */
  createTicketPath: string
  /** Path for dashboard endpoint (from NEXT_PUBLIC_GET_DASHBOARD_PATH) */
  getDashboardPath: string
  /** Path for tickets list endpoint (from NEXT_PUBLIC_GET_TICKETS_PATH) */
  getTicketsPath: string
  /** Path for AI preview endpoint (from NEXT_PUBLIC_AI_PREVIEW_PATH) */
  aiPreviewPath: string
  /** Maximum file upload size in MB (from NEXT_PUBLIC_MAX_UPLOAD_MB, default 5) */
  maxUploadMb: number
  /** Request timeout in milliseconds (default 10000) */
  timeoutMs: number
}