# Implementation Plan

- [x] 1. Create dashboard header with month selector and export functionality
  - Create DashboardHeader component with "Dashboard" title on left and controls on right
  - Implement MonthSelector component using shadcn/ui Select component
  - Add auto-update logic to show current month (Sep 2025, then Oct 2025 when October comes)
  - Include previous months as selectable options back to Sep 2025 starting month
  - Create ExportButton component with primary button styling
  - Implement export popover with "Export as CSV" and "Export as PDF" options
  - Add pale purple hover background effect for popover options
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

- [x] 2. Implement CSV and PDF export functionality
  - Create export utility functions in src/lib/dashboard/export-utils.ts
  - Implement CSV export with dashboard statistics and request table data
  - Structure CSV with statistics section and requests section
  - Implement PDF export functionality (browser print or PDF library)
  - Add loading states during export process
  - Test export functionality with mock data
  - _Requirements: 1.9, 7.7_

- [x] 3. Fix sidebar navigation active state logic
  - Add usePathname hook to src/components/Sidebar.tsx to determine current route
  - Update active state logic to highlight Dashboard when on /dashboard page
  - Ensure Submit Request is not active when viewing dashboard
  - Remove hardcoded active state styling from Submit Request link
  - Test navigation active states across all pages
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Create enhanced statistics cards with gradient and trend indicators
  - Update StatisticCard interface to include variant, trend, and helperText fields
  - Implement gradient background for Total Requests card using specified colors (#525bf6, #b793f7, #eb8953, #e2bca4, #87cce8)
  - Change Total Requests card text to white for contrast against gradient
  - Update Total Requests value to 24 (mock data)
  - Add trend indicator to Approved Requests card with green-600 trending-up icon, "+5%" text, and "from last month" label
  - Update Approved Requests value to 18 with trend calculation logic
  - Add helper text to Pending Requests card: "pending further changes or information"
  - Update Pending Requests value to 6 (mock data for rejected requests)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 5. Fix table loading issues and implement data table with selection
  - Debug and fix Recent Requests table loading issues on page load
  - Replace current table with shadcn/ui Data Table component following official documentation
  - Add checkboxes on each row for individual selection
  - Add select all checkbox in table header
  - Implement row selection state management d
  - Maintain clickable Request IDs with primary purple color and underline
  - Keep sort function for each column with sort indicators
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 6. Update status badge system and table data
  - Update the style of the checkboxes in the data table from circle to square with rounded-sm in gray-100
  - Display "X row(s) selected" counter at bottom left edge of table
  - Add pagination at bottom right edge of table
  - Reduce status types to only 3: Approved, Pending, Completed
  - Set all status badges to 28px height
  - Update status colors: Approved (orange-100 background for AI auto-approved), Pending (red-100 background for rejected requiring changes), Completed (blue-100 background for executed requests)
  - Update mock data with September 2025 dates in reverse chronological order, remove all mock data of Aug 2025
  - Ensure Request IDs and submission dates follow reverse chronological pattern
  - Update RequestStatus interface to match new 3-status system
  - _Requirements: 4.9, 4.10, 4.11_

- [x] 7. Create individual system news accordion cards
  - Update section header from "News" to "System News"
  - Separate each news item into individual accordion cards instead of one card for all
  - Add megaphone Lucide icon before each date
  - Format dates in YYYY-MM-DD format
  - Display news headline on same row as date in accordion trigger
  - Use shadcn/ui accordion component for each individual card
  - Implement expand/collapse functionality for news details
  - Update mock news data structure for individual cards
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 8. Create date utility functions for month handling
  - Create src/lib/dashboard/date-utils.ts for month logic
  - Implement getCurrentMonth function to return current month string
  - Implement getAvailableMonths function to generate selectable months back to Sep 2025
  - Add logic for automatic month updates when time progresses
  - Create month formatting utilities for consistent display
  - Test month logic with different date scenarios
  - _Requirements: 1.4, 1.5, 7.6_

- [x] 9. Update dashboard page layout and integration
  - Update src/app/dashboard/page.tsx to use new DashboardHeader component
  - Integrate MonthSelector and ExportButton in header layout
  - Apply responsive layout that stacks on mobile devices
  - Maintain aurora gradient background and existing styling
  - Integrate all enhanced components (statistics, table, news)
  - Test overall page layout and component integration
  - _Requirements: 1.1, 1.6, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Update mock data structures for all components
  - Update statistics mock data to include gradient variant and trend information
  - Update requests mock data with September 2025 dates in reverse chronological order
  - Update news mock data for individual accordion cards with YYYY-MM-DD dates
  - Ensure all mock data structures match enhanced component interfaces
  - Add proper TypeScript interfaces for all data structures
  - _Requirements: 3.3, 3.6, 3.9, 4.11, 5.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 11. Implement accessibility features for enhanced components
  - Add ARIA labels for month selector and export button
  - Ensure keyboard navigation for data table with selection
  - Add proper focus management for accordion cards
  - Test screen reader compatibility for gradient statistics cards
  - Validate color contrast for all new status badge colors and gradient text
  - Add proper ARIA announcements for selection counter
  - _Requirements: 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Write comprehensive tests for all enhancements
  - Test dashboard header with month selector and export functionality
  - Test enhanced statistics cards with gradient and trend indicators
  - Test data table with selection, sorting, and pagination
  - Test individual news accordion cards functionality
  - Test export functionality with CSV and PDF generation
  - Test responsive behavior across all breakpoints
  - Test accessibility compliance for all enhanced components
  - _Requirements: All requirements - comprehensive testing coverage_