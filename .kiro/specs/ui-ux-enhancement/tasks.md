# Implementation Plan

- [x] 1. Set up required shadcn/ui components
  - Install and configure shadcn/ui tabs component for language selection
  - Install and configure shadcn/ui sheet component for AI preview slide-over
  - Install and configure shadcn/ui avatar component for user profile
  - Create component files in src/components/ui/ directory
  - _Requirements: 4.1, 4.2, 7.4_

- [x] 2. Update application branding and favicon
  - Add favicon link to src/app/layout.tsx using /images/favicon.png
  - Update Sidebar component to display LogicCart logo from /images/logo.png instead of "EC" text
  - Replace "Internal Portal" text with logo image display
  - _Requirements: 1.1, 1.2_

- [x] 3. Implement enhanced user profile section
  - Update Sidebar component to show "Marketing" as profile name instead of "Stacy Po"
  - Integrate avatar image from /images/avatar.jpg using shadcn/ui Avatar component
  - Add fallback initials "MT" with white text on primary purple background
  - Handle image loading errors gracefully
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 4. Restructure sidebar navigation items
  - Add "Brand Assets", "Design System", and "Documentation" navigation items after "Request History"
  - Remove "Settings" item from sidebar navigation
  - Ensure all items link to placeholder (#) URLs except for "Submit Request"
  - Make the active "Submit Request" item semi-bold 
  - Maintain existing hover states and active state styling
  - Verify total of 6 navigation items
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Add Settings icon to header and update header section
  - Update Header component to include Settings icon next to existing Help icon
  - Use Lucide React Settings icon with consistent styling
  - Maintain responsive behavior and existing layout
  - Update the page name from "E-commerce Change Request" to "logicCart Website Management Hub | Powered by Smart AI Agent"
  - Make the header bar section background semi-transparent and background blur for a Glassmorphism effect
  - _Requirements: 2.5_

- [x] 6. Convert Department field to select with auto-selection
  - Replace Department Input field with Select component in main form
  - Add options: Marketing, UX/UI, Engineering/DevOps
  - Set "Marketing" as default selected value
  - Update form validation to handle select field
  - _Requirements: 3.1, 3.2_

- [x] 7. Update form field labels and validation
  - Change "Page Area" label to "Affected Page Area" in Request Details section
  - Change "Page URLs" label to "Affected Page URL(s)" in Request Details section
  - Make "Target Launch Date" field required in form validation
  - Update error messages and validation logic accordingly
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 8. Replace language pills with tabs component
  - Remove existing Segmented component from Content Update section
  - Implement shadcn/ui Tabs with "English" and "中文" tab labels
  - Create separate textarea for each tab: "Content Copy/ Details" and "文案內容/ 細節"
  - Ensure content preservation when switching between tabs
  - Make textareas expandable (auto-resize)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Implement conditional field display logic
  - Create conditional rendering logic based on Request Type selection
  - New Banner: Copy Required, Images Required
  - Copy Update: Copy Required, Images Optional  
  - SEO Update: Copy Required, Images Optional
  - Bug Fix/New Feature: Copy Optional, Images Optional
  - Update field labels and validation accordingly
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Create dual image upload areas
  - Enhance ImageDropzone component to support separate Desktop and Mobile upload areas
  - Add helper text for Desktop: "Banner: 1920px*800px recommended, Image Size: ≤500 KB"
  - Add helper text for Mobile: "Banner: 1080px*1350px recommended, Image Size: ≤500 KB"
  - Implement separate state management for desktop and mobile images
  - Maintain existing alt text functionality for each uploaded image
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Create AI Preview Sheet component
  - Build AIPreviewSheet component using shadcn/ui Sheet as right-side slide-over
  - Create sections for: Summary, Acceptance Criteria, Policy Hits, Missing Info, Risk/Effort
  - Implement mock data structure and display logic
  - Add close functionality and proper accessibility attributes
  - Ensure responsive behavior on mobile devices
  - _Requirements: 7.4, 7.5_

- [x] 12. Add Run AI Preview button with styling
  - Add "Run AI Preview" button to footer section between Cancel and Submit Request
  - Style button with pale purple gradient and Sparkles icon from Lucide React
  - Update button ordering: Cancel (Ghost), Run AI Preview (Secondary), Submit Request (Primary)
  - Connect button click to open AI Preview sheet
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 13. Implement AI preview data processing
  - Create mock AI preview logic that analyzes form data and images
  - Generate Summary, Acceptance Criteria, Policy Hits, Missing Info, and Risk/Effort data
  - Handle cases where form data is incomplete
  - Display appropriate loading states during preview generation
  - _Requirements: 7.5_

- [x] 13.1 Apply AI Preview Analysis visual and functional adjustments
  - Change AI Preview Analysis header icon from lightning to Sparkles icon in primary purple color
  - Add pale purple background to each section card header above border while keeping all corners rounded
  - Move Missing Information card to second position after Summary and display only when missing information exists
  - Update all Missing Information text to red-600 color and change Target launch date from recommended to required
  - Show Policy Compliance card only when no missing information exists, reduce line spacing, and update "DesignSystem" to "Design System"
  - Show Risk & Effort Assessment card only when no missing information exists and remove estimated hour information
  - Replace all check marks with green-600 circle-check Lucide icons
  - _Requirements: 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_

- [x] 14. Apply UI polish and accessibility improvements
  - For all the alerts of the required fields, change to English alert "Please fill in this field" instead of Chinese.
  - Apply a page background from /public/page-bg.jpg. Keep the sticky left side-bar remains white background.
  - Implement shadcn Card spacing patterns throughout form sections
  - Set 8px gap between labels and fields consistently
  - Set 24px gaps between form sections
  - Add soft pale-purple gradient focus ring outside borders for all interactive elements
  - Add inner solid ring for high contrast mode users
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
