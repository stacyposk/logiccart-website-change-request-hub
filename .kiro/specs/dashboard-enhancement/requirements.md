# Requirements Document

## Introduction

This document outlines the comprehensive dashboard enhancement for the LogicCart Website Change Request Hub application. The enhanced dashboard provides a modern, responsive interface featuring a header with month selector and export functionality, gradient-styled statistics cards with trend indicators, an advanced data table with row selection capabilities, and individual system news accordion cards. The implementation includes mobile-optimized layouts, CSV/PDF export functionality, and maintains design consistency with the existing Submit Request and Success pages while introducing new interactive elements and improved data visualization.

## Requirements

### Requirement 1: Dashboard Page Header and Navigation

**User Story:** As a user, I want a clear page header "Dashboard" with month selector and export functionality, so that I can easily identify the current page and access time-based data controls.

#### Acceptance Criteria

1. WHEN the dashboard page loads THEN the system SHALL display "Dashboard" as the page header on the left side
2. WHEN the dashboard page loads THEN the system SHALL display a month dropdown select showing "Sep 2025" on the same row as the header on the right side
3. WHEN the month dropdown is displayed THEN the system SHALL use shadcn/ui select component following official documentation
4. WHEN the current month changes THEN the system SHALL automatically update the dropdown to reflect the current month (Oct 2025 when October comes)
5. WHEN the month dropdown is opened THEN the system SHALL show "Sep 2025" as a selectable option for switching back to previous months
6. WHEN the dashboard page loads THEN the system SHALL display a primary "Export" button after the month dropdown select
7. WHEN the Export button is clicked THEN the system SHALL show a popover with two options: "Export as CSV" and "Export as PDF"
8. WHEN hovering over popover options THEN the system SHALL apply pale purple background hover effect
9. WHEN export options are clicked THEN the system SHALL export dashboard statistics and request table information in the selected format

### Requirement 2: Sidebar Navigation Active State Update

**User Story:** As a user, I want the Dashboard navigation item to show as active when I'm on the dashboard page, so that I can clearly see my current location in the application.

#### Acceptance Criteria

1. WHEN a user is on the dashboard page THEN the system SHALL display the Dashboard menu item in active state
2. WHEN a user is on the dashboard page THEN the system SHALL NOT display the Submit Request menu item in active state
3. WHEN the Dashboard menu item is active THEN the system SHALL apply the same active state styling used for other navigation items
4. WHEN a user navigates away from the dashboard THEN the system SHALL remove the active state from the Dashboard menu item
5. WHEN the sidebar navigation loads on dashboard page THEN the system SHALL maintain consistent visual spacing and behavior

### Requirement 3: Enhanced Statistics Cards with Gradient and Trend Indicators

**User Story:** As a user, I want visually enhanced statistics cards with gradient backgrounds, trend indicators, and helper text, so that I can quickly understand request metrics and their changes over time.

#### Acceptance Criteria

1. WHEN the Total Requests card is displayed THEN the system SHALL apply a beautiful gradient background using colors #525bf6, #b793f7, #eb8953, #e2bca4, #87cce8
2. WHEN the Total Requests card is displayed THEN the system SHALL change all text to white color for contrast against the gradient
3. WHEN the Total Requests card is displayed THEN the system SHALL show "7" as the total number with "+10% from last month" trend indicator
4. WHEN the Approved Requests card is displayed THEN the system SHALL keep white background and show "2" as the main number
5. WHEN the Approved Requests card is displayed THEN the system SHALL add trend indicator with green trending-up icon, "+5%" text in green, and "from last month" label
6. WHEN the Pending Requests card is displayed THEN the system SHALL keep white background and show "2" as the main number
7. WHEN the Pending Requests card is displayed THEN the system SHALL add helper text "require further information" in gray
8. WHEN the Completed Requests card is displayed THEN the system SHALL keep white background and show "3" as the main number
9. WHEN the Completed Requests card is displayed THEN the system SHALL add trend indicator with green trending-up icon, "+8%" text in green, and "from last month" label
10. WHEN statistics cards are hovered THEN the system SHALL apply subtle shadow and transform effects without white borders

### Requirement 4: Data Table with Selection and Enhanced Status System

**User Story:** As a user, I want a modern data table with row selection, improved status badges, and enhanced functionality, so that I can efficiently manage and track multiple requests with better visual organization.

#### Acceptance Criteria

1. WHEN the Recent Requests table loads THEN the system SHALL fix loading issues and ensure proper table rendering on page load
2. WHEN the Recent Requests table is displayed THEN the system SHALL use shadcn/ui Data Table component following official documentation
3. WHEN the data table is displayed THEN the system SHALL include checkboxes on each row for selecting individual rows
4. WHEN the data table is displayed THEN the system SHALL include a select all checkbox in the header
5. WHEN rows are selected THEN the system SHALL display "X row(s) selected" at the bottom left edge of the table
6. WHEN the data table is displayed THEN the system SHALL include pagination at the bottom right edge of the table
7. WHEN Request IDs are displayed THEN the system SHALL make them clickable with underline in primary purple color
8. WHEN the data table is displayed THEN the system SHALL maintain sort function for each column
9. WHEN status badges are displayed THEN the system SHALL set height to 28px for all badges
10. WHEN status badges are displayed THEN the system SHALL use only 3 status types: Approved (orange-100 background), Pending (red-100 background), Completed (blue-100 background)
11. WHEN the data table is displayed THEN the system SHALL show 7 requests with September 2025 dates in reverse chronological order
12. WHEN checkboxes are displayed THEN the system SHALL use square shape with rounded-sm corners
13. WHEN export functionality is used THEN the system SHALL export selected rows only when rows are selected, or all data when no selection is made
14. WHEN export data is generated THEN the system SHALL include all 4 statistics cards with trend values in both CSV and PDF formats

### Requirement 5: Individual System News Accordion Cards

**User Story:** As a user, I want system news displayed in individual accordion cards with clear date formatting and megaphone icons, so that I can easily scan news items and expand individual items for details.

#### Acceptance Criteria

1. WHEN the System News section is displayed THEN the system SHALL update the section header to "System News"
2. WHEN news items are displayed THEN the system SHALL separate each news item into individual accordion cards instead of one card for all
3. WHEN each news card is displayed THEN the system SHALL format the date in YYYY-MM-DD format
4. WHEN each news card is displayed THEN the system SHALL display the news headline on the same row as the date
5. WHEN each news card is displayed THEN the system SHALL use a megaphone Lucide icon before each date
6. WHEN news accordion cards are displayed THEN the system SHALL use shadcn/ui accordion component for each individual card
7. WHEN a news card is clicked THEN the system SHALL expand to show additional details
8. WHEN news cards are collapsed THEN the system SHALL show only date, megaphone icon, and headline
9. WHEN news cards are viewed on mobile THEN the system SHALL stack date and headline in 2 rows for better readability
10. WHEN news cards are viewed on desktop THEN the system SHALL display date and headline inline on the same row

### Requirement 6: Design Consistency and Visual System

**User Story:** As a user, I want the dashboard to feel integrated with the existing application design, so that the interface remains cohesive and familiar.

#### Acceptance Criteria

1. WHEN the dashboard page loads THEN the system SHALL apply the same aurora gradient background as the Submit Request page
2. WHEN the dashboard page loads THEN the system SHALL apply the same glassmorphism styling effects as the Submit Request page
3. WHEN dashboard components are displayed THEN the system SHALL maintain consistent layout spacing, card padding, and typography with existing pages
4. WHEN the dashboard is viewed on mobile devices THEN the system SHALL preserve mobile responsiveness with appropriate breakpoints
5. WHEN dashboard cards and components are displayed THEN the system SHALL use the same color scheme and visual hierarchy as the existing design system

### Requirement 7: Future Data Integration and Real-Time Updates

**User Story:** As a developer, I want the dashboard structure to be ready for real data integration with automatic date updates, so that we can easily replace mock data with actual request information and maintain current month display.

#### Acceptance Criteria

1. WHEN the dashboard components are implemented THEN the system SHALL structure data interfaces to support future DynamoDB integration
2. WHEN the dashboard displays request data THEN the system SHALL prepare for filtering by requester email stored in sessionStorage
3. WHEN the Recent Requests table is implemented THEN the system SHALL use data structures compatible with the existing ticket schema
4. WHEN statistics are calculated THEN the system SHALL use logic that can be easily replaced with real database queries
5. WHEN the dashboard is implemented THEN the system SHALL include TypeScript interfaces that match expected API response formats
6. WHEN the month dropdown is implemented THEN the system SHALL automatically reflect the current month (Oct 2025 when October comes)
7. WHEN export functionality is implemented THEN the system SHALL be structured to export real dashboard statistics and request data
8. WHEN trend calculations are implemented THEN the system SHALL calculate real percentage increases from previous months (starting from Sep 2025 baseline)

### Requirement 8: Mobile Header and Navigation Enhancement

**User Story:** As a mobile user, I want a clean header with centered branding and edge-aligned controls, so that I can easily navigate and access functionality on mobile devices.

#### Acceptance Criteria

1. WHEN the mobile header is displayed THEN the system SHALL remove white backgrounds from hamburger menu and search icons
2. WHEN the mobile header is displayed THEN the system SHALL align hamburger menu icon to the left edge of content
3. WHEN the mobile header is displayed THEN the system SHALL align search icon to the right edge of content
4. WHEN the mobile header is displayed THEN the system SHALL show centered favicon/logo between the icons
5. WHEN the mobile header is displayed THEN the system SHALL hide page titles to make room for centered logo

### Requirement 9: Submit Request Page Mobile Optimization

**User Story:** As a mobile user, I want optimized padding and spacing on the Submit Request page, so that I can efficiently use screen space on mobile devices.

#### Acceptance Criteria

1. WHEN Submit Request cards are viewed on mobile THEN the system SHALL reduce horizontal padding from 32px to 16px
2. WHEN Submit Request cards are viewed on mobile THEN the system SHALL reduce vertical padding appropriately
3. WHEN the sticky submit bar is viewed on mobile THEN the system SHALL reduce horizontal padding to match card padding
4. WHEN Submit Request page is viewed on desktop THEN the system SHALL maintain original padding values

### Requirement 10: AI Preview Analysis Mobile Enhancement

**User Story:** As a mobile user, I want properly aligned content and optimized spacing in the AI Preview sheet, so that I can easily read and interact with the analysis on mobile devices.

#### Acceptance Criteria

1. WHEN AI Preview sheet header is displayed on mobile THEN the system SHALL align title and subtitle to the left edge of content
2. WHEN AI Preview analysis cards are displayed on mobile THEN the system SHALL reduce horizontal padding from 24px to 12px
3. WHEN AI Preview analysis cards are displayed on desktop THEN the system SHALL maintain 24px horizontal padding
4. WHEN AI Preview sheet is displayed THEN the system SHALL maintain responsive design across all card sections