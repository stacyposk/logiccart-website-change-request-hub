# Design Document

## Overview

This design document outlines the comprehensive enhancement implementation for the LogicCart Website Change Request Hub application, covering the Dashboard, Submit Request, AI Preview Analysis, and Success pages. The enhanced system features a modern responsive design with gradient-styled statistics cards, advanced data table with row selection, individual news accordion cards, mobile-optimized layouts, and comprehensive export functionality. The implementation maintains design consistency across all pages while introducing new interactive elements, improved data visualization, and enhanced mobile user experience.

## Architecture

### Component Structure
```
src/
├── app/
│   └── dashboard/
│       └── page.tsx (enhanced - header with month selector and export)
├── components/
│   ├── ui/
│   │   ├── select.tsx (existing - shadcn/ui select component)
│   │   ├── popover.tsx (existing - shadcn/ui popover component)
│   │   ├── button.tsx (existing - shadcn/ui button component)
│   │   ├── table.tsx (existing - shadcn/ui table component)
│   │   ├── checkbox.tsx (existing - shadcn/ui checkbox component)
│   │   ├── accordion.tsx (existing - shadcn/ui accordion component)
│   │   └── pagination.tsx (existing - shadcn/ui pagination component)
│   ├── Sidebar.tsx (enhanced - fix active state for dashboard)
│   └── dashboard/
│       ├── DashboardHeader.tsx (new - header with month selector and export)
│       ├── MonthSelector.tsx (new - month dropdown with auto-update)
│       ├── ExportButton.tsx (new - export functionality with popover)
│       ├── StatisticsCards.tsx (enhanced - gradient design, trend indicators)
│       ├── RecentRequestsTable.tsx (enhanced - data table with selection)
│       └── NewsSection.tsx (enhanced - individual accordion cards)
└── lib/
    └── dashboard/
        ├── types.ts (enhanced - updated interfaces for new features)
        ├── mock-data.ts (enhanced - updated dates and data structure)
        ├── export-utils.ts (new - CSV/PDF export functionality)
        └── date-utils.ts (new - month handling and auto-update logic)
```

### State Management
- **Dashboard Data**: Mock data with TypeScript interfaces ready for DynamoDB integration
- **Navigation State**: Enhanced sidebar navigation without Request History
- **Responsive State**: Mobile-first responsive design using existing breakpoints

### Routing Integration
- **Dashboard Route**: `/dashboard` using Next.js App Router
- **Navigation Links**: Update sidebar to link to dashboard page
- **Active State**: Dashboard navigation item shows active state when on dashboard page

## Components and Interfaces

### 1. Enhanced Sidebar Component

**Design Changes:**
- Fix active state logic to properly highlight Dashboard when on dashboard page
- Ensure Submit Request is not active when on dashboard page
- Maintain existing navigation structure and styling
- Keep all navigation items unchanged (Dashboard, Submit Request, Brand Assets, Design System, Documentation)

**Interface:**
```typescript
interface NavigationItem {
  icon: LucideIcon
  label: string
  href: string
  active?: boolean
}

// Navigation items with proper active state logic
const navigationItems: NavigationItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FilePlus2, label: 'Submit Request', href: '/' },
  { icon: Palette, label: 'Brand Assets', href: '#' },
  { icon: BookOpen, label: 'Design System', href: '#' },
  { icon: FileText, label: 'Documentation', href: '#' }
]

// Active state determination based on current pathname
const getActiveState = (pathname: string, itemHref: string) => {
  if (itemHref === '/dashboard') return pathname === '/dashboard'
  if (itemHref === '/') return pathname === '/' || pathname === ''
  return pathname === itemHref
}
```

### 2. Dashboard Header with Month Selector and Export

**Design:**
- Header row with "Dashboard" title on the left
- Month selector dropdown on the right side of the same row
- Export button immediately after the month selector
- Responsive layout that stacks on mobile devices
- Consistent spacing and typography with existing design system
- Apply same aurora gradient background as Submit Request page
- Follow existing page structure with same container max-width (1200px)

**Header Structure:**
```typescript
// Dashboard header with controls
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
  <h1 className="text-3xl font-bold text-white">Dashboard</h1>
  <div className="flex items-center gap-3">
    <MonthSelector currentMonth="Sep 2025" />
    <ExportButton />
  </div>
</div>
```

**Interface:**
```typescript
interface DashboardHeaderProps {
  currentMonth: string
  onMonthChange: (month: string) => void
  onExport: (format: 'csv' | 'pdf') => void
}

interface MonthSelectorProps {
  currentMonth: string
  availableMonths: string[]
  onChange: (month: string) => void
}

interface ExportButtonProps {
  onExport: (format: 'csv' | 'pdf') => void
  isExporting?: boolean
}
```

### 3. Month Selector Component

**Design:**
- Uses shadcn/ui Select component following official documentation
- Shows current month (Sep 2025) as default selection
- Automatically updates to current month when time progresses (Oct 2025)
- Includes previous months as selectable options
- Consistent styling with existing form elements

**Month Logic:**
```typescript
// Auto-update current month logic
const getCurrentMonth = (): string => {
  const now = new Date()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[now.getMonth()]} ${now.getFullYear()}`
}

// Generate available months (current and previous)
const getAvailableMonths = (): string[] => {
  const current = new Date()
  const months = []
  
  // Add current month
  months.push(getCurrentMonth())
  
  // Add previous months back to Sep 2025 (starting month)
  const startDate = new Date(2025, 8) // September 2025
  let iterDate = new Date(current)
  
  while (iterDate >= startDate) {
    iterDate.setMonth(iterDate.getMonth() - 1)
    if (iterDate >= startDate) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      months.push(`${monthNames[iterDate.getMonth()]} ${iterDate.getFullYear()}`)
    }
  }
  
  return months
}
```

### 4. Export Button Component

**Design:**
- Primary button with "Export" label
- Triggers popover with two options: "Export as CSV" and "Export as PDF"
- Popover options have pale purple hover background effect
- Handles both dashboard statistics and request table data export
- Loading states during export process

**Export Functionality:**
```typescript
interface ExportData {
  statistics: {
    totalRequests: number
    approvedRequests: number
    pendingRequests: number
    approvedTrend: string
  }
  requests: RecentRequest[]
  exportDate: string
  selectedMonth: string
}

// CSV export function
const exportToCSV = (data: ExportData): void => {
  const csvContent = [
    // Statistics section
    'Dashboard Statistics',
    `Export Date,${data.exportDate}`,
    `Selected Month,${data.selectedMonth}`,
    '',
    'Metric,Value,Trend',
    `Total Requests,${data.statistics.totalRequests},`,
    `Approved Requests,${data.statistics.approvedRequests},${data.statistics.approvedTrend}`,
    `Pending Requests,${data.statistics.pendingRequests},`,
    '',
    // Requests section
    'Recent Requests',
    'Request ID,Page Area,Type,Status,Submitted Date',
    ...data.requests.map(req => 
      `${req.id},${req.pageArea},${req.type},${req.status.label},${req.submittedDate}`
    )
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dashboard-export-${data.selectedMonth.replace(' ', '-')}.csv`
  link.click()
}

// PDF export function (using browser print or PDF library)
const exportToPDF = (data: ExportData): void => {
  // Implementation would use a PDF library like jsPDF or browser print
  // For now, trigger browser print dialog with formatted content
  window.print()
}
```

### 5. Enhanced Statistics Cards Component

**Design:**
- Three cards in responsive grid layout (grid-cols-1 md:grid-cols-3)
- Total Requests card with beautiful gradient background and white text
- Approved and Pending cards with white background and trend indicators
- Helper text with icons and color-coded trend information
- Consistent spacing and typography with existing design system

**Visual Design:**
- Total Requests card: Gradient background using colors #525bf6, #b793f7, #eb8953, #e2bca4, #87cce8 with white text
- Approved Requests card: White background with green trend indicator (trending-up icon, +5% in green-600, "from last month" in grey)
- Pending Requests card: White background with grey helper text "pending further changes or information"
- Card styling: Subtle shadow with hover effects
- Typography: CardTitle for main title, large number display for value, smaller helper text
- Status badges: 28px height for consistency

**Interface:**
```typescript
interface TrendIndicator {
  icon: LucideIcon
  value: string
  color: 'green' | 'red' | 'grey'
  label: string
}

interface StatisticCard {
  title: string
  value: number
  variant: 'gradient' | 'white'
  trend?: TrendIndicator
  helperText?: string
}

interface StatisticsCardsProps {
  statistics: StatisticCard[]
}

// Current implemented mock data structure with gradient and trends
const mockStatistics: StatisticCard[] = [
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
      value: '+8%',
      color: 'green',
      label: 'from last month'
    }
  }
]

// Gradient CSS classes
const gradientClasses = 'bg-gradient-to-br from-[#525bf6] via-[#b793f7] via-[#eb8953] via-[#e2bca4] to-[#87cce8]'
```

### 6. Data Table with Selection Component

**Design:**
- shadcn/ui Data Table component following official documentation
- Fix loading issues to ensure proper table rendering on page load
- Checkboxes on each row for individual selection
- Select all checkbox in header
- Row selection counter at bottom left
- Pagination at bottom right
- Sortable columns with sort indicators
- Enhanced status system with 28px badge height

**Visual Design:**
- Table styling: Clean, minimal design matching existing form elements
- Status badges: 3 status types with 28px height - Approved (orange-100 background for AI auto-approved), Pending (red-100 background for rejected requiring changes), Completed (green-100 background for executed requests)
- Request ID links: Primary purple color (#5754FF) with underline, placeholder href="#"
- Selection UI: "X row(s) selected" at bottom left, pagination at bottom right
- Sort indicators: Chevron icons for sortable columns
- Mobile behavior: Horizontal scroll with responsive design

**Interface:**
```typescript
interface RequestStatus {
  id: string
  label: 'Approved' | 'Pending' | 'Completed'
  color: 'approved' | 'pending' | 'completed'
}

interface RecentRequest {
  id: string
  pageArea: string
  type: 'New Banner' | 'Copy Update' | 'SEO Update' | 'Bug Fix' | 'New Feature'
  status: RequestStatus
  submittedDate: string
  requesterEmail?: string // For future filtering
}

interface SortConfig {
  key: keyof RecentRequest | 'status.label'
  direction: 'asc' | 'desc'
}

interface TableSelection {
  selectedRows: string[]
  isAllSelected: boolean
}

interface DataTableProps {
  requests: RecentRequest[]
  sortConfig: SortConfig | null
  onSort: (key: keyof RecentRequest | 'status.label') => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  selection: TableSelection
  onSelectionChange: (selection: TableSelection) => void
}

// Updated mock data structure (Sep 2025 dates in reverse chronological order)
const mockRequests: RecentRequest[] = [
  {
    id: 'REQ-2025-015',
    pageArea: 'Homepage - Hero Section',
    type: 'New Banner',
    status: { id: 'approved', label: 'Approved', color: 'approved' },
    submittedDate: '2025-09-25'
  },
  {
    id: 'REQ-2025-014',
    pageArea: 'Product Page',
    type: 'Copy Update',
    status: { id: 'pending', label: 'Pending', color: 'pending' },
    submittedDate: '2025-09-22'
  },
  {
    id: 'REQ-2025-013',
    pageArea: 'Checkout Page',
    type: 'Bug Fix',
    status: { id: 'completed', label: 'Completed', color: 'completed' },
    submittedDate: '2025-09-18'
  },
  // ... additional mock entries with Sep 2025 dates in reverse chronological order
]

// Status badge styling (implemented)
const statusStyles = {
  approved: 'bg-orange-100 text-orange-600 h-7', // 28px height
  pending: 'bg-red-100 text-red-600 h-7',
  completed: 'bg-blue-100 text-blue-600 h-7' // Updated to blue for completed
}

// Export functionality with selected rows support
interface ExportData {
  statistics: {
    totalRequests: number
    approvedRequests: number
    pendingRequests: number
    completedRequests: number
    totalTrend: string
    approvedTrend: string
    completedTrend: string
  }
  requests: RecentRequest[]
  exportDate: string
  selectedMonth: string
  selectedRowsCount: number
  totalRowsCount: number
}
```

### 7. Individual System News Accordion Cards

**Design:**
- Section title "System News" with consistent typography
- Each news item as individual accordion card instead of one card for all
- Megaphone Lucide icon before each date
- Date in YYYY-MM-DD format on same row as headline
- Each card uses shadcn/ui Accordion component
- Clean design without badges or extra icons

**Visual Design:**
- Section header: "System News" with same styling as other section headers
- Individual cards: Each news item in separate accordion card
- Date format: YYYY-MM-DD format (e.g., "2025-09-10")
- Icon placement: Megaphone icon before date
- Layout: Date and headline on same row in accordion trigger
- Typography: Consistent with existing text hierarchy
- Chevron behavior: Down when collapsed, up when expanded

**Interface:**
```typescript
interface NewsItem {
  id: string
  date: string
  headline: string
  details: string
  type?: 'maintenance' | 'deployment' | 'announcement'
}

interface NewsSectionProps {
  newsItems: NewsItem[]
}

// Updated mock data structure (accordion format)
const mockNews: NewsItem[] = [
  {
    id: 'news-001',
    date: '2025-09-10',
    headline: 'Scheduled maintenance on product page CMS',
    details: 'We will be performing scheduled maintenance on the product page CMS. Please expect downtime between 2–4pm. All pending requests will be processed after maintenance is complete.',
    type: 'maintenance'
  },
  {
    id: 'news-002', 
    date: '2025-09-08',
    headline: 'New homepage banner deployed successfully',
    details: 'The new homepage banner featuring our fall collection has been successfully deployed. All related change requests have been marked as completed.',
    type: 'deployment'
  },
  {
    id: 'news-003',
    date: '2025-09-06', 
    headline: 'Checkout bug fix rollout postponed',
    details: 'The checkout bug fix rollout has been postponed to next week due to additional testing requirements. We will notify all stakeholders once the new deployment date is confirmed.',
    type: 'announcement'
  }
]
```

### 6. Enhanced shadcn/ui Components

**Table Component:**
- Enhanced shadcn/ui table implementation with sorting capabilities
- Responsive design with horizontal scroll
- Consistent styling with existing form elements
- Sortable headers with chevron indicators
- Integration with pagination component

**Pagination Component:**
- Standard shadcn/ui pagination implementation
- Shows current page, total pages, and navigation controls
- Consistent styling with existing components
- Support for page size configuration (10 items per page)

**Accordion Component:**
- Standard shadcn/ui accordion implementation for news section
- Smooth expand/collapse animations with chevron icons
- Consistent styling with existing components
- Clean design without badges or extra icons

## Data Models

### Dashboard Data Interface
```typescript
interface DashboardData {
  statistics: StatisticCard[]
  recentRequests: RecentRequest[]
  news: NewsItem[]
  lastUpdated: string
}

interface DashboardFilters {
  requesterEmail?: string // For future filtering by user
  dateRange?: {
    start: string
    end: string
  }
  status?: string[]
}
```

### Future API Integration Interfaces
```typescript
// Ready for DynamoDB integration
interface DashboardApiResponse {
  statistics: {
    totalRequests: number
    approvedRequests: number
    pendingExecution: number
  }
  recentRequests: RecentRequest[]
  news: NewsItem[]
}

interface DashboardApiFilters {
  requesterEmail?: string
  limit?: number
  offset?: number
}
```

## Error Handling

### Data Loading States
- Loading skeletons for statistics cards
- Table loading state with placeholder rows
- Error states for failed data fetching
- Empty states when no data is available

### Navigation Errors
- Graceful handling of navigation failures
- Fallback routing for invalid dashboard routes
- Proper error boundaries for dashboard components

## Testing Strategy

### Unit Tests
- Statistics cards rendering and data display
- Table component with mock data
- News section component functionality
- Sidebar navigation updates
- Responsive behavior testing

### Integration Tests
- Dashboard page routing and navigation
- Data flow between components
- Mobile responsive behavior
- Cross-browser compatibility

### Accessibility Tests
- Keyboard navigation for table and accordion
- Screen reader compatibility for statistics
- Focus management for interactive elements
- Color contrast validation for status badges

### Visual Regression Tests
- Dashboard layout consistency
- Card styling matches existing design
- Table responsive behavior
- News section styling

## Implementation Phases

### Phase 1: Core Infrastructure
1. Install shadcn/ui table and accordion components
2. Create dashboard page structure and routing
3. Update sidebar navigation to remove Request History
4. Set up mock data interfaces and structures

### Phase 2: Statistics Section
1. Create StatisticsCards component
2. Implement responsive grid layout
3. Add hover effects and animations
4. Integrate with existing card styling system

### Phase 3: Recent Requests Table
1. Create RecentRequestsTable component
2. Implement table with mock data
3. Add status badges and action buttons
4. Ensure mobile responsive behavior

### Phase 4: News Section
1. Create NewsSection component
2. Implement news items display
3. Add optional accordion functionality
4. Style consistently with dashboard theme

### Phase 5: Integration and Polish
1. Integrate all components in dashboard page
2. Test responsive behavior across devices
3. Validate accessibility compliance
4. Optimize performance and loading states

## Technical Considerations

### Performance
- Lazy loading for dashboard components
- Efficient re-rendering with React.memo
- Optimized table rendering for large datasets
- Proper cleanup for component unmounting

### Accessibility
- Proper ARIA labels for statistics and table
- Keyboard navigation for all interactive elements
- Screen reader announcements for dynamic content
- High contrast mode support

### Browser Compatibility
- Table responsive behavior across browsers
- Accordion animation compatibility
- CSS grid support for statistics layout
- Focus management consistency

### Mobile Responsiveness
- Statistics cards stack on mobile
- Table horizontal scroll with sticky columns
- News section mobile-optimized layout
- Touch-friendly interactive elements

### Future Extensibility
- Data interfaces ready for real API integration
- Component structure supports additional features
- Filtering and sorting capabilities prepared
- User-specific data filtering architecture

## Design System Consistency

### Visual Hierarchy
- Consistent typography scale with existing pages
- Same color palette and brand colors (#5754FF)
- Matching spacing and padding patterns
- Unified shadow and border radius system

### Interactive Elements
- Same hover effects as existing components
- Consistent focus states and accessibility
- Matching button styles and variants
- Unified transition and animation timing

### Layout Patterns
- Same container max-width and padding
- Consistent section spacing and organization
- Matching card layouts and grid systems
- Unified responsive breakpoint behavior

### Aurora Gradient Integration
- Same background gradient as Submit Request page
- Consistent glassmorphism effects
- Matching card aurora styling
- Unified visual treatment across pages

## Mobile Design Enhancements

### Mobile Header Design
```typescript
// Mobile header layout with centered logo
<header className="mobile-header">
  <div className="flex items-center justify-between px-4">
    {/* Left: Hamburger menu without background */}
    <label className="flex h-10 w-10 items-center justify-center hover:bg-slate-50 -ml-2">
      <Menu className="h-5 w-5 text-slate-600" />
    </label>
    
    {/* Center: Favicon/Logo (mobile only) */}
    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 md:hidden">
      <img src="/favicon.png" alt="LogicCart" className="h-8 w-8" />
    </div>
    
    {/* Right: Search icon without background */}
    <button className="flex h-10 w-10 items-center justify-center hover:bg-slate-50 -mr-2">
      <Search className="h-5 w-5 text-slate-600" />
    </button>
  </div>
</header>
```

### Mobile Card Padding System
```typescript
// Responsive padding classes for mobile optimization
const mobileCardClasses = {
  header: 'px-4 sm:px-8 pt-6 sm:pt-8 pb-4',
  content: 'px-4 sm:px-8 pt-0 pb-6 sm:pb-8',
  stickyBar: 'px-4 sm:px-8 py-4'
}

// Mobile: 16px horizontal padding (px-4)
// Desktop: 32px horizontal padding (px-8)
```

### AI Preview Mobile Layout
```typescript
// AI Preview sheet mobile optimizations
const aiPreviewMobileClasses = {
  header: 'px-0', // Remove default padding for left alignment
  title: 'text-left', // Explicit left alignment
  cardHeader: 'px-3 sm:px-6 pt-4 pb-2', // Reduced mobile padding
  cardContent: 'px-3 sm:px-6 pt-0 pb-6' // Reduced mobile padding
}

// Mobile: 12px horizontal padding (px-3)
// Desktop: 24px horizontal padding (px-6)
```

### News Section Mobile Responsive Design
```typescript
// News accordion mobile layout
<AccordionTrigger className="px-3 sm:px-6 py-4 sm:py-5">
  <div className="flex items-start gap-4 w-full text-left">
    <Volume2 className="h-5 w-5 text-slate-500 mt-0.5" />
    <div className="flex-1 overflow-hidden">
      {/* Mobile: Stack date and headline */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
        <span className="text-sm text-slate-600 mb-1 sm:mb-0">
          {formatDate(item.date)}
        </span>
        <span className="text-sm font-medium text-slate-900 break-words sm:truncate">
          {item.headline}
        </span>
      </div>
    </div>
  </div>
</AccordionTrigger>

// Mobile: Stacked layout with full headline visibility
// Desktop: Inline layout with truncation
```

### Export Button Mobile Design
```typescript
// Export popover mobile optimizations
<PopoverContent className="w-40 p-2 rounded-sm" align="end">
  <div className="space-y-1">
    <button className="flex w-full items-center justify-start rounded-sm px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-gray-900">
      Export as CSV
    </button>
    <button className="flex w-full items-center justify-start rounded-sm px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-gray-900">
      Export as PDF
    </button>
  </div>
</PopoverContent>

// Reduced width and consistent hover colors with sidebar
```

### Checkbox Design System
```typescript
// Square checkboxes with rounded corners
const checkboxClasses = 'peer h-4 w-4 shrink-0 border border-gray-200 bg-white rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground'

// Square shape (rounded-none) for data table consistency
```

## Implementation Status

### ✅ Completed Features
- Dashboard header with month selector and export functionality
- Enhanced statistics cards with gradient design and trend indicators
- Advanced data table with row selection, sorting, and pagination
- Individual news accordion cards with mobile-responsive layout
- CSV/PDF export with selected row filtering and complete statistics
- Mobile header with centered logo and edge-aligned controls
- Mobile-optimized padding for Submit Request page cards
- AI Preview Analysis mobile layout improvements
- Square checkboxes with proper styling
- Responsive news section with stacked mobile layout

### 🎯 Key Technical Achievements
- Complete TypeScript type safety across all components
- Responsive design patterns using Tailwind CSS breakpoints
- Component composition with shadcn/ui following best practices
- Proper state management for selections and interactions
- Mock data structures ready for real API integration
- Comprehensive export functionality with statistics and trends
- Mobile-first responsive design approach
- Accessibility compliance with proper ARIA labels and keyboard navigation

### 📱 Mobile Experience Enhancements
- Optimized touch targets and spacing for mobile devices
- Reduced padding for better screen space utilization
- Stacked layouts for better content readability
- Centered branding for improved mobile navigation
- Responsive accordion behavior for news items
- Touch-friendly interactive elements throughout