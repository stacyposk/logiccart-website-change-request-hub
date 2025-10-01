# Project Structure & Organization

## Root Level
- `src/` - Main application source code
- `.kiro/` - Kiro configuration and specifications
  - `specs/` - Feature specifications and requirements
  - `steering/` - Project guidance documents
- `lambdas/` - AWS Lambda functions (future backend integration)
- `specs/` - JSON schemas and feature specifications
- `policies/` - Accessibility and performance guidelines
- `sample_tickets/` - Example data structures
- `state/` - Configuration and environment files

## Source Code Structure (`src/`)
```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles and CSS variables
│   ├── layout.tsx         # Root layout with sidebar and header
│   ├── page.tsx           # Submit Request form page (authenticated)
│   ├── auth/              # Authentication pages
│   │   ├── layout.tsx     # Auth layout (no sidebar/header)
│   │   ├── start/         # PKCE flow initiation
│   │   │   └── page.tsx   # Invisible redirect to Cognito
│   │   └── callback/      # OAuth callback handler
│   │       └── page.tsx   # Token exchange and redirect
│   ├── dashboard/         # Dashboard page
│   │   └── page.tsx       # Enhanced dashboard with statistics and data table
│   └── success/           # Success confirmation page
│       └── page.tsx       # Request submission confirmation with AI summary
├── components/
│   ├── ui/                # shadcn/ui components (enhanced)
│   │   ├── table.tsx      # Data table with selection
│   │   ├── accordion.tsx  # News accordion cards
│   │   ├── checkbox.tsx   # Square checkboxes with rounded corners
│   │   └── ...            # Other shadcn/ui components
│   ├── dashboard/         # Dashboard-specific components
│   │   ├── DashboardHeader.tsx      # Header with month selector and export
│   │   ├── StatisticsCards.tsx      # Gradient statistics with trends
│   │   ├── RecentRequestsTable.tsx  # Data table with selection and row highlighting
│   │   ├── StatusFilterChips.tsx    # Status filtering chips (All, Approved, Pending, Completed)
│   │   ├── NewsSection.tsx          # Individual accordion cards
│   │   ├── ExportButton.tsx         # CSV/PDF export functionality
│   │   ├── LoadingSkeletons.tsx     # Loading states
│   │   └── ErrorStates.tsx          # Error handling components
│   ├── Header.tsx         # Mobile-optimized header with centered favicon
│   ├── Sidebar.tsx        # Navigation with active states
│   ├── MainContent.tsx    # Content wrapper with responsive padding
│   ├── UrlList.tsx        # Multi-URL input component
│   ├── DualImageDropzone.tsx # Desktop/Mobile image upload
│   ├── AIPreviewSheet.tsx # AI analysis slide-over sheet with copy functionality
│   └── AIRecap.tsx        # AI summary display component for success page
├── contexts/
│   └── SidebarContext.tsx # Sidebar state management
└── lib/
    ├── api/               # API client and types (production ready)
    ├── auth/              # Authentication utilities
    │   └── amplify-config.ts # Cognito configuration
    ├── dashboard/         # Dashboard-specific utilities
    │   ├── types.ts       # TypeScript interfaces
    │   ├── mock-data.ts   # Mock data (replaced with real API)
    │   ├── export-utils.ts # CSV/PDF export functionality
    │   ├── date-utils.ts  # Month handling and auto-updates
    │   └── useDashboardData.ts # Data fetching hook (real API)
    └── utils.ts           # Utility functions
```

## Key Conventions

### File Naming
- **Pages**: `page.tsx` (App Router convention)
- **Components**: PascalCase (e.g., `Button.tsx`)
- **Utilities**: camelCase (e.g., `utils.ts`)
- **Types**: `types.ts` in relevant directories

### Component Organization
- **UI components** in `src/components/ui/` (shadcn/ui pattern)
- **Page components** directly in `src/app/` directories
- **Reusable logic** in `src/lib/`

### API Layer
- **Mock implementations** in `src/lib/api/client.ts` (ready for DynamoDB integration)
- **Type definitions** in `src/lib/api/types.ts` (matches expected API responses)
- **Dashboard data** in `src/lib/dashboard/mock-data.ts` (structured for real API replacement)
- **Export utilities** in `src/lib/dashboard/export-utils.ts` (CSV/PDF generation)

### Configuration Files
- `specs/` contains JSON schemas for data validation
- `policies/` contains markdown guidelines for accessibility and performance
- `sample_tickets/` provides example data structures
- `.kiro/specs/` contains comprehensive feature specifications and requirements

### State Management
- **Form state**: React Hook Form with Zod validation
- **Dashboard state**: Custom hooks with loading/error states
- **Table selection**: Local state with row selection management
- **Status filtering**: Local state for dashboard filter chips
- **Navigation state**: Context API for sidebar collapse/expand
- **Cross-page data**: sessionStorage for submission tracking and AI summaries
- **Export state**: Loading states during CSV/PDF generation
- **Row highlighting**: URL parameters and scroll-to functionality for dashboard navigation

### Backend Integration (Production Ready)
- **TypeScript interfaces** integrated with DynamoDB schema
- **Real API integration** replacing mock data structures
- **Authentication layer** with Cognito and CloudFront Functions
- **Error handling** operational for network failures and auth errors
- **Loading states** implemented for all async operations
- **Data filtering** operational with user-specific requests
- **Session management** with secure token storage and deep linking

## Import Patterns
- Use `@/` alias for `src/` directory
- Import UI components from `@/components/ui/`
- Import utilities from `@/lib/utils`
- Import API functions from `@/lib/api/client`