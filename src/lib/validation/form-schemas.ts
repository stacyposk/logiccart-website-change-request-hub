import { z } from 'zod'

// Security-focused validation schema with character limits and input sanitization
export const ticketFormSchema = z.object({
  requesterName: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),
  
  requesterEmail: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email must be 254 characters or less'),
  
  department: z
    .enum(['Marketing', 'UX/UI', 'Engineering/DevOps'], {
      errorMap: () => ({ message: 'Please select a valid department' })
    }),
  
  pageArea: z
    .string()
    .min(1, 'Page area is required')
    .max(200, 'Page area must be 200 characters or less')
    .regex(/^[a-zA-Z0-9\s\-_\/\.\,\(\)]+$/, 'Page area contains invalid characters'),
  
  changeType: z
    .enum(['New Banner', 'Copy Update', 'New Feature', 'Bug Fix', 'SEO Update'], {
      errorMap: () => ({ message: 'Please select a valid request type' })
    }),
  
  pageUrls: z
    .array(z.string().url('Please enter valid URLs'))
    .min(1, 'At least one URL is required')
    .max(10, 'Maximum 10 URLs allowed'),
  
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be 1,000 characters or less')
    .regex(/^[^<>{}]*$/, 'Description contains invalid characters'),
  
  copyEn: z
    .string()
    .max(2000, 'English copy must be 2,000 characters or less')
    .regex(/^[^<>{}]*$/, 'English copy contains invalid characters')
    .optional(),
  
  copyZh: z
    .string()
    .max(2000, 'Chinese copy must be 2,000 characters or less')
    .regex(/^[^<>{}]*$/, 'Chinese copy contains invalid characters')
    .optional(),
  
  targetLaunchDate: z
    .string()
    .min(1, 'Target launch date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
})

// File validation schema
export const fileValidationSchema = z.object({
  name: z.string().min(1, 'Filename is required'),
  size: z.number().max(2 * 1024 * 1024, 'File must be 2MB or smaller'),
  type: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Only JPG, PNG, and WebP images are allowed' })
  })
})

// Asset metadata validation
export const assetMetadataSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  sizeKb: z.number().positive('File size must be positive'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  altText: z
    .string()
    .min(1, 'Alt text is required for accessibility')
    .max(200, 'Alt text must be 200 characters or less')
    .regex(/^[^<>{}]*$/, 'Alt text contains invalid characters'),
  type: z.enum(['desktop', 'mobile']),
  s3Key: z.string().min(1, 'S3 key is required')
})

// Sanitization functions
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>{}]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim())
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }
    return parsed.toString()
  } catch {
    throw new Error('Invalid URL format')
  }
}

// Validation helper functions
export function validateFormData(data: any) {
  try {
    // Sanitize string inputs before validation
    const sanitizedData = {
      ...data,
      requesterName: sanitizeInput(data.requesterName || ''),
      pageArea: sanitizeInput(data.pageArea || ''),
      description: sanitizeInput(data.description || ''),
      copyEn: sanitizeInput(data.copyEn || ''),
      copyZh: sanitizeInput(data.copyZh || ''),
      pageUrls: (data.pageUrls || []).map((url: string) => sanitizeUrl(url))
    }
    
    return ticketFormSchema.parse(sanitizedData)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {}
      error.errors.forEach((err) => {
        const field = err.path.join('.')
        fieldErrors[field] = err.message
      })
      return { success: false, errors: fieldErrors }
    }
    throw error
  }
}

export function validateFile(file: File) {
  try {
    return fileValidationSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    throw error
  }
}

export function validateAssetMetadata(asset: any) {
  try {
    return assetMetadataSchema.parse(asset)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    throw error
  }
}