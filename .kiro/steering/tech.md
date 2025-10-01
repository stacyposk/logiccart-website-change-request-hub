# Tech Stack & Build System

## Framework & Core Technologies
- **Next.js 15** with App Router (static export configured)
- **TypeScript** for type safety
- **React 18** with hooks and functional components
- **Tailwind CSS** for styling with custom design system

## UI Components & Libraries
- **shadcn/ui** component library (Radix UI primitives) - Enhanced with custom styling
- **Lucide React** for icons (TrendingUp, Volume2, AlertTriangle, CheckCircle2, etc.)
- **React Hook Form** for form management with validation
- **class-variance-authority** and **clsx** for conditional styling
- **tailwind-merge** for class merging and responsive utilities

## Form Management & Validation
- **React Hook Form** for form management
- **Zod** for schema validation and type safety

## Date Handling
- **date-fns** for date manipulation and formatting
- **React Day Picker** for calendar components

## Testing Framework
- **Jest** for unit testing
- **Testing Library** for React component testing
- **@testing-library/jest-dom** for custom matchers

## Development Tools
- **ESLint** with Next.js config
- **PostCSS** with Autoprefixer
- **tailwindcss-animate** for animations

## Build Commands
```bash
# Development
npm run dev          # Start dev server on localhost:3000

# Production
npm run build        # Build static export
npm run start        # Serve production build
npm run lint         # Run ESLint

# Testing
npm run test         # Run Jest tests
npm run test:watch   # Run tests in watch mode

# Dependencies
npm install          # Install all dependencies
```

## Architecture Patterns (Production Ready)
- **Static export** - deployed to S3 + CloudFront with authentication
- **AWS serverless backend** - HTTP API Gateway + 6 Lambda functions + DynamoDB operational
- **Authentication system** - AWS Cognito + CloudFront Functions + PKCE flow
- **Component composition** with shadcn/ui patterns and custom enhancements
- **Form state management** with React Hook Form and Zod validation
- **Dashboard data management** with real API endpoints and efficient querying
- **Session storage** for cross-page data persistence, submission tracking, and AI summaries
- **Export functionality** with client-side CSV/PDF generation
- **Navigation flow** with URL parameters, scroll-to functionality, and deep linking
- **Error handling** with retry mechanisms and user-friendly messaging
- **Clipboard integration** for developer handoff functionality
- **Responsive design** with mobile-first approach and breakpoint optimization
- **Success page deep-linking** with dashboard navigation and edge case handling
- **AI intelligence** with real-time analysis and automated decision making

## Data Export & Integration
- **CSV Export**: Client-side generation with statistics and selected row filtering
- **PDF Export**: Browser print integration with formatted layouts
- **Data Structures**: TypeScript interfaces ready for backend API integration
- **Mock Data**: Realistic data structures matching expected DynamoDB schema
- **Error Handling**: Comprehensive error states and retry mechanisms

## AI & Decision Engine (Operational)
- **Bedrock Runtime API** operational for intelligent ticket analysis and decision-making
- **Amazon Nova Lite** deployed for cost-effective vision capabilities and banner analysis
- **Real-time AI Preview** with acceptance criteria generation and copy functionality
- **Automated Decision Logic** with dual-branch processing (New Banner vs New Feature)
- **Policy-Based Validation** with consolidated policy.md file in S3
- **Email Notifications** with SNS integration and structured decision reasoning
- ** dComplete AI Workflow** from form analysis to automated decisions

## Configuration Notes
- Static export enabled (`output: 'export'`) for S3 deployment
- Images unoptimized for static hosting compatibility
- Trailing slashes enabled for static hosting compatibility
- Custom Tailwind theme with CSS variables for theming
- No Server Actions, Route Handlers, or server-only APIs (all API calls to API Gateway)
- Environment variables: NEXT_PUBLIC_* prefix for client-side access
- Consistent camelCase JSON throughout API contracts
- Cache headers: HTML (no-cache), static assets (1 year max-age)