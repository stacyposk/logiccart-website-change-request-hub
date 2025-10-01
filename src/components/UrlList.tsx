'use client'

import React, { useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface UrlListProps {
  urls: string[]
  onUrlsChange: (urls: string[]) => void
  errors?: string[]
  className?: string
  label?: string
  placeholder?: string
  required?: boolean
}

// URL validation regex - only supports https protocol
const URL_REGEX = /^https:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/

// Validate URL format
const validateUrl = (url: string): string | null => {
  if (!url.trim()) {
    return 'URL is required'
  }

  if (!URL_REGEX.test(url.trim())) {
    return 'Please enter a valid URL (must start with https://)'
  }

  return null
}

export function UrlList({
  urls,
  onUrlsChange,
  errors = [],
  className,
  label = 'Page URLs',
  placeholder = 'https://example.com/page',
  required = true
}: UrlListProps) {

  // Add a new URL field
  const addUrl = useCallback(() => {
    onUrlsChange([...urls, ''])
  }, [urls, onUrlsChange])

  // Remove URL at specific index
  const removeUrl = useCallback((index: number) => {
    // Ensure at least one URL remains
    if (urls.length <= 1) {
      return
    }

    const newUrls = urls.filter((_, i) => i !== index)
    onUrlsChange(newUrls)
  }, [urls, onUrlsChange])

  // Update URL at specific index
  const updateUrl = useCallback((index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    onUrlsChange(newUrls)
  }, [urls, onUrlsChange])

  // Get validation error for specific URL
  const getUrlError = useCallback((index: number, url: string): string | null => {
    // Check if there's a specific error for this index
    if (errors[index]) {
      return errors[index]
    }

    // Only validate non-empty URLs for real-time feedback
    if (url.trim()) {
      return validateUrl(url)
    }

    return null
  }, [errors])

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {/* URL inputs */}
      <div className="space-y-3">
        {urls.map((url, index) => {
          const error = getUrlError(index, url)
          const hasError = !!error

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center space-x-2">
                {/* URL input */}
                <div className="flex-1">
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                      hasError && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    )}
                    aria-label={`URL ${index + 1}`}
                    aria-describedby={hasError ? `url-error-${index}` : undefined}
                  />
                </div>

                {/* Remove button - only show if more than one URL and not the first field */}
                {urls.length > 1 && index > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeUrl(index)}
                    className="h-11 w-11 p-0 text-red-600 hover:text-red-700 hover:border-red-300 rounded-sm"
                    aria-label={`Remove URL ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Error message */}
              {hasError && (
                <p
                  id={`url-error-${index}`}
                  className="text-sm text-red-600 flex items-center space-x-1"
                  role="alert"
                >
                  <span>{error}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Add URL button */}
      <Button
        type="button"
        variant="outline"
        onClick={addUrl}
        className="w-full h-11 border-dashed border-gray-300 hover:border-primary/20 text-gray-600 hover:text-primary hover:bg-primary/5 rounded-sm text-sm transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add another URL
      </Button>

      {/* Helper text */}
      <div className="text-xs text-gray-500 space-y-1">

      </div>
    </div>
  )
}

// Export validation function for use in forms
export { validateUrl }