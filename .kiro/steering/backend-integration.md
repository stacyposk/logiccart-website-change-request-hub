# AWS Production Deployment Integration Guide

This document provides comprehensive guidance for integrating the complete frontend with the deployed AWS serverless backend architecture, including API endpoints, data structures, and production deployment patterns.

## Current Implementation Status

### ✅ **Frontend Complete**
- Modern Next.js 15 app with form validation, image upload, AI preview, and responsive design
- Dashboard with statistics, data table, news sections, and status filtering
- Submit Request form with enhanced AI Preview Analysis (copy functionality, error handling)
- Enhanced Success page with AI summary display and improved navigation
- CSV/PDF export functionality with selected row filtering
- Dashboard navigation with row highlighting and scroll-to functionality
- Mobile-responsive design across all pages
- Session storage for submission tracking and AI summary persistence

### ✅ **Backend Infrastructure Deployed**
- Lambda functions: Ticket Creation, Upload URL (deployed manually)
- HTTP API Gateway with CORS configuration (deployed)
- DynamoDB tables: tickets, ticket-decisions (deployed)
- S3 buckets: S3 uploads bucket, S3 data bucket (deployed)

### ✅ **Integration & Deployment Complete**
- ✅ Frontend connected to deployed backend services
- ✅ Frontend deployed to S3 + CloudFront with authentication
- ✅ All Lambda functions deployed and operational (6 functions)
- ✅ SNS notifications and Bedrock Runtime API decision engine operational
- ✅ Cognito authentication layer with CloudFront Functions protection

## AWS Production API Integration

### 1. **Dashboard Data API (Production)**

**Deployed Infrastructure:**
- HTTP API Gateway: Single instance with CORS enabled
- Lambda Functions: Separate functions for different endpoints
- DynamoDB: Simple table scans for Free Tier optimization

**API Contracts:**
```typescript
// GET /api/dashboard
interface DashboardResponse {
  totals: {
    total: number
    approved: number
    pending: number
    completed: number
  }
  trends: {
    totalTrend: string      // "+10%" (month-over-month using month field)
    approvedTrend: string
    completedTrend: string
  }
  recent: TicketSummary[]   // Top 3-5 recent requests
  news: NewsItem[]
  lastUpdated: string
}

// GET /api/tickets?status=&email=&from=&to=&limit=&lastKey=
interface TicketsResponse {
  items: TicketSummary[]
  lastKey?: string          // For pagination
}
```

**Frontend Integration:**
- Update API client to use deployed API Gateway endpoints
- Replace mock data with real DynamoDB table scans
- Maintain existing loading states and error handling

### 2. **Request Submission API (Production)**

**Deployed Infrastructure:**
- Ticket Creation Lambda: Handles form submissions and DynamoDB storage
- Upload URL Lambda: Generates presigned URLs for S3 uploads
- S3 uploads bucket: for direct image uploads

**API Contracts:**
```typescript
// POST /api/tickets
interface CreateTicketRequest {
  requesterName: string     // Consistent camelCase JSON
  requesterEmail: string
  department: string
  pageArea: string
  changeType: string
  pageUrls: string[]
  description: string
  language: string
  copyEn?: string
  copyZh?: string
  notes?: string
  targetLaunchDate?: string
  urgency: string
  assets?: AssetMetadata[]  // Metadata provided by client
}

interface CreateTicketResponse {
  ticketId: string          // camelCase for consistency
  submittedAt: string       // ISO-8601 UTC format
}

interface AssetMetadata {
  filename: string
  sizeKb: number           // camelCase
  width: number            // Measured by frontend
  height: number           // Measured by frontend
  altText: string          // camelCase
  type: 'desktop' | 'mobile'
  s3Key: string            // camelCase
}
```

**Frontend Integration:**
- Update API client to use deployed API Gateway endpoints
- Implement presigned URL flow for direct S3 uploads
- Use consistent camelCase JSON throughout
- Store timestamps as ISO-8601 UTC with month field for trends

### 3. **Export Data API**

**Current Implementation:**
- Client-side CSV/PDF generation in `src/lib/dashboard/export-utils.ts`
- Supports selected row filtering and complete statistics export
- No backend integration required (client-side only)

**Optional Backend Enhancement:**
```typescript
// POST /api/export
interface ExportRequest {
  format: 'csv' | 'pdf'
  selectedMonth: string
  selectedRequestIds?: string[]  // If empty, export all
  includeStatistics: boolean
}
```

## AWS Production Data Architecture

### **DynamoDB Schema (Deployed)**
```typescript
// tickets table
interface TicketsTable {
  tableName: 'tickets'
  partitionKey: 'ticketId'    // String (camelCase)
  attributes: {
    ticketId: string          // TKT-20250916123456-abc123
    createdAt: string         // ISO-8601 UTC: 2025-09-15T10:00:00Z
    updatedAt: string         // ISO-8601 UTC: 2025-09-15T10:00:00Z
    month: string             // YYYY-MM for efficient trend aggregation
    status: 'pending' | 'approved' | 'rejected' | 'completed'
    requesterName: string     // camelCase JSON throughout
    requesterEmail: string
    // ... other fields in camelCase
  }
  // No GSIs - using table scans for Free Tier optimization
  billingMode: 'ON_DEMAND'
}
```

### **Free Tier Dashboard Queries**
```typescript
// Use table scans with FilterExpression for Free Tier optimization
// Status filtering: FilterExpression with status attribute
// Email filtering: FilterExpression with requesterEmail attribute
// Trend calculation: Use month field for month-over-month comparisons
```

### **News Items Structure**
```typescript
interface NewsItem {
  id: string
  date: string              // YYYY-MM-DD format
  headline: string          // Displayed in accordion trigger
  details: string           // Displayed in accordion content
  type?: 'maintenance' | 'deployment' | 'announcement'
  priority?: 'high' | 'medium' | 'low'
  isRead?: boolean         // For future read/unread functionality
}
```

## Enhanced User Flow Integration

### **Success Page to Dashboard Navigation**
```typescript
// URL parameter structure for dashboard navigation
interface DashboardNavigation {
  highlight?: string  // Request ID to highlight
  scroll?: 'true'     // Enable scroll-to functionality
}

// Example: /dashboard?highlight=DEMO-1234&scroll=true
```

**Navigation Features:**
- Success page "View on Dashboard" button navigates with request ID parameter
- Dashboard automatically scrolls to and highlights the corresponding row
- Smooth scrolling behavior for better user experience
- Fallback handling when request ID is not found in current view

### **AI Summary Integration**
```typescript
// Enhanced session storage for AI summary persistence
interface EnhancedTicketSubmission extends TicketSubmission {
  ai_summary?: string  // Persisted from AI Preview Analysis
}

// Success page displays AI summary from session storage
// Formatted consistently with AI Preview sheet styling
```

## Mobile Optimization Considerations

### **Responsive Design Patterns**
- Mobile-first approach with `sm:`, `md:`, `lg:` breakpoints
- Reduced padding on mobile: `px-4 sm:px-8` (16px mobile, 32px desktop)
- Stacked layouts on mobile: `flex-col sm:flex-row`
- Touch-friendly interactive elements (minimum 44px touch targets)

### **Mobile Header Implementation**
- Centered favicon between hamburger menu and search icons
- No background on mobile navigation icons
- Edge-aligned controls for better thumb accessibility

### **Enhanced Mobile Features**
- Filter chips with touch-friendly sizing and spacing
- Copy button with appropriate touch target size
- Success page with optimized card width and spacing
- Smooth scroll behavior optimized for mobile devices

## Session Storage Integration

### **Current Implementation**
```typescript
// Stored after successful submission
interface TicketSubmission {
  ticket_id: string
  submitted_at: string
  page_area: string
  change_type: string
  first_page_url: string
  target_launch_date: string
  urgency: string
  requester_email: string
  ai_summary?: string  // AI Preview Analysis summary for success page display
}

// Storage key: 'ticketSubmission'
// Used for: Success page display, dashboard filtering, and AI summary display
```

## Error Handling Patterns

### **Frontend Error States**
- Loading skeletons for all async operations
- Error boundaries for component-level failures
- Retry mechanisms with user-friendly error messages
- Form validation with field-level error display

### **API Error Handling**
```typescript
// Expected error response format
interface ApiError {
  message: string
  code?: string
  field?: string  // For field-specific validation errors
}

// Frontend handles these error types:
// - Network errors (connection failures)
// - Validation errors (400 responses)
// - Server errors (500 responses)
// - Timeout errors
```

## Performance Considerations

### **Frontend Optimizations**
- Static export configuration for fast loading
- Image optimization with size/dimension validation
- Lazy loading for dashboard components
- Efficient re-rendering with React.memo
- Debounced search and filtering

### **Backend Integration Recommendations**
- Implement caching for dashboard statistics
- Use pagination for large request datasets
- Optimize image upload with presigned S3 URLs
- Consider WebSocket for real-time dashboard updates

## Security Considerations

### **Frontend Security**
- Input validation with Zod schemas
- XSS prevention with proper escaping
- File upload validation (size, type, dimensions)
- Session storage (not localStorage) for sensitive data

### **Backend Security Requirements**
- Authentication/authorization for API endpoints
- Input sanitization and validation
- File upload security (virus scanning, type validation)
- Rate limiting for API endpoints
- CORS configuration for frontend domain

## Testing Integration

### **Frontend Test Coverage**
- Unit tests for utility functions and filtering logic
- Component tests for UI interactions, copy functionality, and error handling
- Integration tests for form submission flow and dashboard navigation
- Accessibility tests for keyboard navigation and new interactive elements
- User flow tests for success page to dashboard navigation
- Error handling tests for AI Preview retry mechanism
- Clipboard integration tests for copy functionality

### **API Testing Recommendations**
- Contract testing between frontend and backend
- Mock API responses during development
- End-to-end testing for complete user flows
- Performance testing for dashboard data loading

## Enhanced Visual Design System

### **Success Page Design Language**
```typescript
// Custom gradient system for success celebration
interface SuccessPageDesign {
  background: '/bg-gradient.jpg'  // Gradient background image
  card: {
    background: 'solid-white'     // Optimal readability
    width: 'max-w-xl'            // Compact focused presentation
    effects: 'hover-glow'        // Purple glow on hover
    spacing: 'mt-8 py-16'        // Enhanced vertical spacing
  }
  icon: {
    gradient: 'linear-gradient(135deg, #5e60f1 30%, #eb8650 70%, #e5ae8d 90%)'
    size: '64px'
    type: 'check-mark'
  }
}
```

### **Typography and Color Enhancements**
```typescript
interface EnhancedDesignSystem {
  aiSummary: {
    textColor: 'text-black'           // High prominence content
    iconStyle: 'simple-solid-purple'  // No circular background
    dividers: 'border-indigo-200'     // Subtle purple-tinted separation
  }
  notifications: {
    textColor: 'text-muted-foreground'  // Supporting content
  }
  interactive: {
    hoverEffects: 'rgba(87,84,255,0.05)'  // Consistent brand color hover
    copyButton: 'clipboard-integration'    // Developer handoff functionality
  }
}
```

## AWS Production Deployment Architecture

### **Static Frontend Deployment (S3 + CloudFront)**
- Next.js static export with `output: 'export'` configuration
- Private S3 bucket with CloudFront Origin Access Control (OAC)
- Custom subdomain with AWS Certificate Manager (ACM) SSL certificate
- CloudFront distribution with compression and HTTPS enforcement
- Cache headers: HTML (no-cache), static assets (1 year max-age)
- Custom error pages for SPA routing (404/403 → /index.html)

### **Serverless Backend (Fully Operational)**
- HTTP API Gateway with CORS configuration and authentication
- Lambda functions: 6 specialized functions deployed and operational
- DynamoDB tables with efficient querying and real-time data
- S3 buckets for file uploads and data storage with presigned URLs
- SNS notifications for email alerts operational
- Bedrock Runtime API with Nova Lite for intelligent decision making deployed
- Cognito authentication with CloudFront Functions protection

### **Environment Configuration**
```bash
# Required .env.local
NEXT_PUBLIC_API_BASE=https://your-api-gateway-domain.com/
NEXT_PUBLIC_GET_UPLOAD_URL_PATH=/api/upload-url
NEXT_PUBLIC_CREATE_TICKET_PATH=/api/tickets
NEXT_PUBLIC_MAX_UPLOAD_MB=3

# Production deployment uses:
# - Custom subdomaACM SSL certificate
# - Private S3 bucket with CloudFront OAC
# - Professional domain appearance for users
```