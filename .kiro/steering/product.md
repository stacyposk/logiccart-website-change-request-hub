# Product Overview

This is the **LogicCart Website Change Request Hub** - a comprehensive Next.js application for submitting, tracking, and managing website change requests for an e-commerce platform.

## Core Purpose
- Streamline the process of requesting changes to e-commerce website content
- Provide structured intake and dashboard tracking for marketing, UX/UI and Engineering/DevOps teams
- Support both English and Chinese language content
- Handle various change types: New Banner, Copy Updates, New Features, Bug Fixes, and SEO Update

## Key Features

### 📝 **Submit Request Page**
- Form validation with accessibility compliance
- AI Preview Analysis with right-side slide-over sheet
- Enhanced AI Preview with copy functionality for acceptance criteria
- Improved error handling with retry mechanism for AI Preview failures
- Multi-URL support for batch changes
- Dual image upload (Desktop/Mobile) with alt text requirements
- Conditional field display based on request type
- Mobile-optimized responsive design with reduced padding
- SLA messaging for timeline expectations

### 📊 **Dashboard Page**
- Enhanced statistics cards with gradient design and trend indicators
- Advanced data table with row selection, sorting, and pagination
- Status filtering with filter chips (All, Approved, Pending, Completed)
- Row highlighting and scroll-to functionality for navigation from success page
- CSV/PDF export functionality with selected row filtering
- Individual system news accordion cards
- Month selector with automatic updates (Sep 2025 baseline)
- Mobile-responsive layout with optimized spacing

### 🎨 **Design System**
- Consistent aurora gradient backgrounds across pages
- Glassmorphism effects and card styling
- Mobile-first responsive design patterns
- Centered favicon in mobile header navigation
- Square checkboxes with rounded corners
- Primary purple color scheme (#5754FF)

### 🔄 **AI Preview Analysis**
- Real-time form analysis with missing information detection
- Policy compliance checking (Accessibility, Performance, Brand, Design System)
- Acceptance criteria generation with copy-to-clipboard functionality
- Enhanced error handling with retry mechanism and clear messaging
- Mobile-optimized sheet layout with reduced padding
- Gradient background with proper visual hierarchy

## Target Users
- **Marketing teams** requesting content changes and banner updates
- **UX/UI stakeholders** submitting design and feature requests  
- **Engineering/DevOps teams** tracking website change requests and execution status
- **Content managers** needing structured change requests for the e-commerce platform
- **Dashboard users** monitoring request statistics and system news

### 🎉 **Success Page**
- Enhanced visual design with gradient check icon and background
- AI Summary display from AI Preview Analysis
- Improved navigation with "View on Dashboard" and "Create Another Request" buttons
- Dashboard integration with row highlighting and scroll-to functionality
- Compact card design with hover glow effects
- Mobile-optimized layout with proper spacing

## Current Implementation Status
- **Frontend Complete**: Full responsive UI with dashboard, forms, and AI preview
- **UI/UX Polish**: Enhanced success page, dashboard filtering, and AI Preview improvements
- **Backend Infrastructure**: AWS services deployed (Lambda, API Gateway, DynamoDB, S3)
- **Export Functionality**: CSV/PDF generation with statistics and selected data
- **Mobile Optimization**: Comprehensive mobile-first responsive design
- **Navigation Flow**: Seamless workflow from form submission to dashboard tracking
- **Production Deployment**: S3 + CloudFront static hosting with authentication
- **Backend Integration**: Frontend connected to deployed AWS services
- **Authentication System**: Cognito User Pool with CloudFront Functions protection
- **AI Intelligence**: Real-time AI Preview + Bedrock Runtime API decision engine operational
- **Email Notifications**: SNS integration with structured decision reasoning
- **Complete Workflow**: Authentication → Form → AI Analysis → Decision → Email → Dashboard

## AWS Architecture Overview (Production Ready)
- **Frontend**: Next.js 15 static export deployed to S3 + CloudFront with authentication
- **Security**: AWS Cognito User Pool + CloudFront Functions + PKCE authentication flow
- **Backend**: Serverless architecture with HTTP API Gateway + 6 Lambda functions
- **Database**: DynamoDB with efficient querying and real-time data integration
- **Storage**: S3 buckets for file uploads and data storage with presigned URLs
- **Intelligence**: Bedrock Runtime API with Amazon Nova Lite operational for automated decisions
- **Notifications**: SNS email notifications with structured decision reasoning
- **Cost**: Optimized within AWS Free Tier limits for all services