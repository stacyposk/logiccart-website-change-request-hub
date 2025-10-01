# Design Document

## Overview

This design document outlines the comprehensive UI/UX enhancement for the e-commerce change request application. The enhancement transforms the current interface with improved branding, navigation structure, form organization, conditional content display, enhanced image upload functionality, and introduces an AI preview feature. The design maintains the existing Next.js 15 + TypeScript + Tailwind CSS architecture while introducing new components and interactions.

## Architecture

### Component Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── tabs.tsx (new - shadcn/ui tabs component)
│   │   ├── sheet.tsx (new - shadcn/ui sheet component)
│   │   └── avatar.tsx (new - shadcn/ui avatar component)
│   ├── Sidebar.tsx (enhanced)
│   ├── Header.tsx (enhanced)
│   ├── ImageDropzone.tsx (enhanced - dual upload areas)
│   └── AIPreviewSheet.tsx (new)
├── app/
│   ├── layout.tsx (favicon integration)
│   └── page.tsx (major form restructuring)
└── lib/
    └── ai-preview.ts (new - AI preview logic)
```

### State Management
- **Form State**: React Hook Form with enhanced validation
- **UI State**: useState for tabs, sheet visibility, conditional field display
- **Image State**: Enhanced ImageUpload interface with desktop/mobile categorization
- **AI Preview State**: Separate state management for preview data

## Components and Interfaces

### 1. Enhanced Sidebar Component

**Design Changes:**
- Replace text branding with LogicCart logo image
- Update navigation items (add Brand Assets, Design System, Documentation; remove Settings)
- Replace user profile with Marketing persona and avatar image
- Maintain existing hover states and active state styling

**Interface:**
```typescript
interface SidebarProps {
  // No props needed - self-contained component
}

interface NavigationItem {
  icon: LucideIcon
  label: string
  href: string
  active?: boolean
}
```

### 2. Enhanced Header Component

**Design Changes:**
- Add Settings icon next to Help icon in top-right
- Maintain existing mobile menu functionality
- Keep current responsive behavior

**Interface:**
```typescript
interface HeaderProps {
  // No props needed - self-contained component
}
```

### 3. Enhanced Form Structure

**Design Changes:**
- Convert Department field from Input to Select with auto-selection
- Rename field labels (Page Area → Affected Page Area, Page URLs → Affected Page URL(s))
- Make Target Launch Date required
- Replace language pills with shadcn/ui Tabs component
- Implement conditional field display based on Request Type

**Interface:**
```typescript
interface FormData {
  requester_name: string
  requester_email: string
  department: 'Marketing' | 'UX/UI' | 'Engineering/DevOps'
  page_area: string
  change_type: 'New Banner' | 'Copy Update' | 'SEO Update' | 'Bug Fix' | 'New Feature'
  page_urls: string[]
  description: string
  language: 'en' | 'zh'
  copy_en: string
  copy_zh: string
  notes: string
  target_launch_date: string // Required
  urgency: string
}

interface ConditionalFieldConfig {
  requestType: string
  copyRequired: boolean
  imagesRequired: boolean
}
```

### 4. Enhanced Image Upload Component

**Design Changes:**
- Split into two separate upload areas (Desktop and Mobile)
- Add specific dimension and size guidance
- Maintain existing alt text functionality
- Add validation for recommended dimensions

**Interface:**
```typescript
interface ImageUpload {
  file: File
  preview: string
  alt_text: string
  width?: number
  height?: number
  type: 'desktop' | 'mobile'
  uploading?: boolean
  error?: string
}

interface DualImageDropzoneProps {
  desktopImages: ImageUpload[]
  mobileImages: ImageUpload[]
  onDesktopImagesChange: (images: ImageUpload[]) => void
  onMobileImagesChange: (images: ImageUpload[]) => void
  className?: string
}
```

### 5. New AI Preview Sheet Component

**Design:**
- Right-side slide-over sheet using shadcn/ui Sheet component
- Header with Sparkles icon in primary purple color
- Sections displayed conditionally based on form completeness
- Section cards with pale purple header backgrounds and rounded corners
- Mock data structure for preview content
- Responsive design for mobile devices

**Visual Design Updates:**
- Header: Sparkles icon (Lucide React) in primary purple instead of lightning
- Section cards: Pale purple background for headers above border, all corners rounded
- Missing Information: Red-600 text color, positioned as second item after Summary
- Policy Compliance: Reduced line spacing, "Design System" instead of "DesignSystem"
- Risk & Effort: Remove estimated hours display
- Check marks: Green-600 circle-check Lucide icons throughout

**Conditional Display Logic:**
- Missing Information card: Show only when form has missing required fields
- Policy Compliance card: Show only when no missing information exists
- Risk & Effort Assessment card: Show only when no missing information exists

**Interface:**
```typescript
interface AIPreviewData {
  summary: string
  acceptanceCriteria: string[]
  policyHits: {
    accessibility: string[]
    performance: string[]
    brand: string[]
    designSystem: string[]
  }
  missingInfo: string[]
  riskEffort: {
    risk: 'Low' | 'Medium' | 'High'
    effort: 'Small' | 'Medium' | 'Large'
  }
  hasMissingInfo: boolean
}

interface AIPreviewSheetProps {
  isOpen: boolean
  onClose: () => void
  formData: FormData
  images: ImageUpload[]
}
```

### 6. New Tabs Component Integration

**Design:**
- Replace Segmented component with shadcn/ui Tabs
- English tab with "Content Copy" textarea
- Chinese tab with "中文文案" textarea
- Maintain content preservation between tab switches

**Interface:**
```typescript
interface ContentTabsProps {
  englishContent: string
  chineseContent: string
  onEnglishChange: (content: string) => void
  onChineseChange: (content: string) => void
}
```

## Data Models

### Enhanced Form Validation Schema
```typescript
const formValidationSchema = {
  requester_name: { required: true, minLength: 2 },
  requester_email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  department: { required: true, enum: ['Marketing', 'UX/UI', 'Engineering/DevOps'] },
  page_area: { required: true, minLength: 3 },
  change_type: { required: true },
  page_urls: { required: true, minItems: 1 },
  description: { required: true, minLength: 10 },
  target_launch_date: { required: true }, // New requirement
  copy_en: { conditionalRequired: true }, // Based on request type
  copy_zh: { optional: true },
  desktopImages: { conditionalRequired: true }, // Based on request type
  mobileImages: { conditionalRequired: true } // Based on request type
}
```

### Image Validation Rules
```typescript
const imageValidationRules = {
  desktop: {
    recommended: { width: 1440, height: 560 },
    minimum: { width: 1200, height: 480 },
    maxSizeKB: 500
  },
  mobile: {
    recommended: { width: 750, height: 560 },
    minimum: { width: 720, height: 320 },
    maxSizeKB: 500
  }
}
```

## Error Handling

### Form Validation Errors
- Enhanced validation messages for required fields
- Conditional validation based on request type
- Image dimension and size validation
- Real-time validation feedback

### Image Upload Errors
- File type validation
- Size limit validation
- Dimension recommendation warnings
- Alt text requirement validation

### AI Preview Errors
- Graceful fallback for AI service unavailability
- Loading states during preview generation
- Error messages for incomplete form data

## Testing Strategy

### Unit Tests
- Component rendering tests for all enhanced components
- Form validation logic tests
- Conditional field display logic tests
- Image upload validation tests
- AI preview data processing tests

### Integration Tests
- Form submission flow with new required fields
- Tab switching with content preservation
- Image upload flow for both desktop and mobile
- AI preview sheet interaction flow

### Accessibility Tests
- Focus management for new tab component
- Screen reader compatibility for enhanced navigation
- Keyboard navigation for AI preview sheet
- Alt text validation for uploaded images

### Visual Regression Tests
- Logo and branding display
- Navigation layout changes
- Form layout with new field arrangements
- Responsive behavior for new components

### Cross-browser Tests
- Sheet component compatibility
- Tabs component functionality
- Image upload drag-and-drop behavior
- Focus ring styling consistency

## Implementation Phases

### Phase 1: Core UI Components
1. Install and configure shadcn/ui tabs and sheet components
2. Create enhanced Sidebar with logo and navigation changes
3. Update Header with Settings icon
4. Implement Department select field with auto-selection

### Phase 2: Form Structure Enhancement
1. Update field labels and validation rules
2. Replace Segmented component with Tabs
3. Implement conditional field display logic
4. Make Target Launch Date required

### Phase 3: Image Upload Enhancement
1. Create dual image upload areas
2. Add dimension validation and guidance
3. Implement desktop/mobile categorization
4. Update alt text handling

### Phase 4: AI Preview Feature
1. Create AIPreviewSheet component
2. Implement mock AI preview logic
3. Add Run AI Preview button with styling
4. Integrate sheet with form data

### Phase 5: Polish and Accessibility
1. Implement focus ring styling
2. Add proper spacing using shadcn Card patterns
3. Test keyboard navigation
4. Validate screen reader compatibility

## Technical Considerations

### Performance
- Lazy load AI preview sheet component
- Optimize image preview generation
- Implement proper cleanup for URL.createObjectURL
- Use React.memo for expensive re-renders

### Accessibility
- Proper ARIA labels for new components
- Focus management for sheet component
- High contrast mode support for focus rings
- Screen reader announcements for conditional fields

### Browser Compatibility
- Ensure sheet component works across browsers
- Test drag-and-drop functionality
- Validate CSS custom properties support
- Check focus-visible support

### Mobile Responsiveness
- Sheet component mobile behavior
- Tabs component touch interactions
- Image upload areas on small screens
- Button layout in footer section