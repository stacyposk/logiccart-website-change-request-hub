import { z } from 'zod'

/**
 * Email validation schema with proper format checking
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')

/**
 * URL validation schema for page URLs
 * Validates proper HTTP/HTTPS format
 */
export const urlSchema = z
  .string()
  .min(1, 'URL is required')
  .url('Please enter a valid URL (must start with http:// or https://)')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must start with http:// or https://'
  )

/**
 * Date validation schema for target launch date
 * Validates YYYY-MM-DD format and ensures date is today or in the future
 */
export const dateSchema = z
  .string()
  .optional()
  .refine(
    (date) => {
      if (!date) return true // Optional field
      
      // Check YYYY-MM-DD format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(date)) return false
      
      // Check if it's a valid date
      const parsedDate = new Date(date)
      if (isNaN(parsedDate.getTime())) return false
      
      // Check if date is today or in the future
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset time to start of day
      parsedDate.setHours(0, 0, 0, 0)
      
      return parsedDate >= today
    },
    'Target launch date must be today or in the future (YYYY-MM-DD format)'
  )

/**
 * Image file validation schema
 * Validates file type, size, and basic properties
 */
export const imageSchema = z
  .instanceof(File)
  .refine(
    (file): file is File => {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      return allowedTypes.includes(file.type)
    },
    'File must be a PNG, JPEG, or WebP image'
  )
  .refine(
    (file): file is File => {
      const maxSizeMB = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || '5')
      const maxSizeBytes = maxSizeMB * 1024 * 1024
      return file.size <= maxSizeBytes
    },
    {
      message: 'File size must be less than 5MB'
    }
  )

/**
 * Image upload validation schema for form state
 * Includes file validation plus required alt text
 */
export const imageUploadSchema = z.object({
  file: imageSchema,
  alt_text: z
    .string()
    .min(1, 'Alt text is required for accessibility')
    .max(200, 'Alt text must be less than 200 characters'),
  preview: z.string().url('Invalid preview URL'),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  uploading: z.boolean().optional(),
  error: z.string().optional()
})

/**
 * Language enum schema
 */
export const languageSchema = z.enum(['en', 'zh'])

/**
 * Urgency enum schema
 */
export const urgencySchema = z.enum(['normal', 'high'])

/**
 * Change type enum schema
 */
export const changeTypeSchema = z.enum([
  'Content Update',
  'Layout', 
  'Bug Fix',
  'New Feature'
])

/**
 * Main ticket validation schema with conditional copy validation
 * Implements complex business logic for language-specific copy requirements
 */
export const ticketSchema = z
  .object({
    // Required fields
    requester_name: z
      .string()
      .min(1, 'Requester name is required')
      .max(100, 'Requester name must be less than 100 characters'),
    
    requester_email: emailSchema,
    
    department: z
      .string()
      .min(1, 'Department is required')
      .max(100, 'Department must be less than 100 characters'),
    
    page_area: z
      .string()
      .min(1, 'Page area is required')
      .max(100, 'Page area must be less than 100 characters'),
    
    change_type: changeTypeSchema,
    
    page_urls: z
      .array(urlSchema)
      .min(1, 'At least one URL is required')
      .max(10, 'Maximum 10 URLs allowed'),
    
    description: z
      .string()
      .min(1, 'Description is required')
      .max(500, 'Description must be less than 500 characters'),
    
    language: languageSchema,
    
    urgency: urgencySchema,
    
    // Conditional copy fields
    copy_en: z
      .string()
      .max(2000, 'English copy must be less than 2000 characters')
      .optional(),
    
    copy_zh: z
      .string()
      .max(2000, 'Chinese copy must be less than 2000 characters')
      .optional(),
    
    affects_both_languages: z.boolean().optional(),
    
    // Optional fields
    notes: z
      .string()
      .max(1000, 'Notes must be less than 1000 characters')
      .optional(),
    
    target_launch_date: dateSchema,
    
    // UI-only fields for form state
    images: z.array(imageUploadSchema).optional()
  })
  .refine(
    (data) => {
      // Conditional copy validation logic
      
      // If language is 'en', copy_en is required
      if (data.language === 'en' && !data.copy_en?.trim()) {
        return false
      }
      
      // If language is 'zh', copy_zh is required  
      if (data.language === 'zh' && !data.copy_zh?.trim()) {
        return false
      }
      
      // If affects_both_languages is true, both copy_en and copy_zh are required
      if (data.affects_both_languages) {
        if (!data.copy_en?.trim() || !data.copy_zh?.trim()) {
          return false
        }
      }
      
      return true
    },
    {
      message: 'Required copy fields are missing for the selected language(s)',
      path: ['copy_validation'] // Custom path for this validation error
    }
  )

/**
 * Asset metadata schema for uploaded files
 */
export const assetMetaSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  size_kb: z.number().positive('File size must be positive'),
  width: z.number().positive('Image width must be positive'),
  height: z.number().positive('Image height must be positive'),
  alt_text: z
    .string()
    .min(1, 'Alt text is required')
    .max(200, 'Alt text must be less than 200 characters'),
  s3_key: z.string().min(1, 'S3 key is required')
})

/**
 * Complete ticket payload schema for API submission
 * This is the final schema used when submitting to the backend
 */
export const ticketPayloadSchema = z.object({
  requester_name: z.string().min(1),
  requester_email: z.string().email(),
  department: z.string().min(1),
  page_area: z.string().min(1),
  change_type: changeTypeSchema,
  page_urls: z.array(z.string().url()).min(1),
  description: z.string().min(1),
  language: languageSchema,
  copy_en: z.string().optional(),
  copy_zh: z.string().optional(),
  affects_both_languages: z.boolean().optional(),
  notes: z.string().optional(),
  target_launch_date: z.string().optional(),
  urgency: urgencySchema,
  assets: z.array(assetMetaSchema).optional()
})

/**
 * Upload URL response schema for API validation
 */
export const uploadUrlResponseSchema = z.object({
  upload_url: z.string().url('Invalid upload URL'),
  s3_key: z.string().min(1, 'S3 key is required')
})

/**
 * Create ticket response schema for API validation
 */
export const createTicketResponseSchema = z.object({
  ticket_id: z.string().min(1, 'Ticket ID is required'),
  submitted_at: z.string().optional()
})

/**
 * API error response schema for consistent error handling
 */
export const apiErrorResponseSchema = z.object({
  message: z.string().min(1, 'Error message is required'),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional()
})

// Type exports for use in components
export type TicketFormData = z.infer<typeof ticketSchema>
export type ImageUploadData = z.infer<typeof imageUploadSchema>
export type AssetMetaData = z.infer<typeof assetMetaSchema>
export type TicketPayloadData = z.infer<typeof ticketPayloadSchema>
export type UploadUrlResponseData = z.infer<typeof uploadUrlResponseSchema>
export type CreateTicketResponseData = z.infer<typeof createTicketResponseSchema>
export type ApiErrorResponseData = z.infer<typeof apiErrorResponseSchema>

/**
 * Helper function to get detailed validation errors
 * Transforms Zod errors into user-friendly messages
 */
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  
  return errors
}

/**
 * Helper function to validate a single field
 * Useful for real-time validation in forms
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { success: boolean; error?: string } {
  try {
    schema.parse(value)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message }
    }
    return { success: false, error: 'Validation failed' }
  }
}