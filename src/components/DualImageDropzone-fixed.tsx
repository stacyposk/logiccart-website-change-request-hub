'use client'

import React, { useCallback, useState, useRef } from 'react'
import { Upload, X, RefreshCw, Image as ImageIcon, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getUploadUrl, uploadFileToS3 } from '@/lib/api/client'

export interface ImageUpload {
  file: File
  preview: string
  alt_text: string
  width?: number
  height?: number
  type: 'desktop' | 'mobile'
  uploading?: boolean
  uploaded?: boolean
  s3Key?: string
  error?: string
}

interface DualImageDropzoneProps {
  desktopImages: ImageUpload[]
  mobileImages: ImageUpload[]
  onDesktopImagesChange: (images: ImageUpload[]) => void
  onMobileImagesChange: (images: ImageUpload[]) => void
  className?: string
}

const DEFAULT_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

// Validation rules
const VALIDATION_RULES = {
  desktop: {
    recommended: { width: 1920, height: 800 },
    maxSizeKB: 500,
    helperText: "Banner: 1920px*800px recommended. File Type:.jpg / .png / .webp, ≤500 KB. Use WebP where possible."
  },
  mobile: {
    recommended: { width: 1080, height: 1350 },
    maxSizeKB: 500,
    helperText: "Banner: 1080px*1350px recommended. File Type:.jpg / .png / .webp, ≤500 KB. Use WebP where possible."
  }
}

export function DualImageDropzone({
  desktopImages,
  mobileImages,
  onDesktopImagesChange,
  onMobileImagesChange,
  className
}: DualImageDropzoneProps) {
  const desktopFileInputRef = useRef<HTMLInputElement>(null)
  const mobileFileInputRef = useRef<HTMLInputElement>(null)

  // Fast image metadata extraction with timeout
  const extractImageMetadata = useCallback(async (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'))
      }, 3000) // 3 second timeout
      
      img.onload = () => {
        clearTimeout(timeout)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(img.src)
      }
      
      img.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('Failed to load'))
        URL.revokeObjectURL(img.src)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }, [])

  // File validation
  const validateFile = useCallback((file: File, type: 'desktop' | 'mobile'): string | null => {
    if (!DEFAULT_ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please use PNG, JPEG, or WebP.'
    }
    
    const maxSizeBytes = VALIDATION_RULES[type].maxSizeKB * 1024
    if (file.size > maxSizeBytes) {
      return `File too large. Maximum size is ${VALIDATION_RULES[type].maxSizeKB}KB.`
    }
    
    return null
  }, [])

  // Upload to S3
  const uploadToS3 = useCallback(async (image: ImageUpload, index: number, type: 'desktop' | 'mobile') => {
    const currentImages = type === 'desktop' ? desktopImages : mobileImages
    const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange
    
    try {
      // Set uploading state
      const updatedImages = [...currentImages]
      updatedImages[index] = { ...updatedImages[index], uploading: true, error: undefined }
      onImagesChange(updatedImages)

      if (!image.file) {
        throw new Error('File is missing')
      }
      
      // Get presigned URL
      const sizeKb = Math.round(image.file.size / 1024)
      const { uploadUrl, s3Key } = await getUploadUrl(
        image.file.name,
        image.file.type,
        sizeKb
      )

      // Upload to S3
      await uploadFileToS3(uploadUrl, image.file)

      // Update with success
      const finalImages = [...currentImages]
      finalImages[index] = {
        ...finalImages[index],
        uploading: false,
        uploaded: true,
        s3Key,
        error: undefined
      }
      onImagesChange(finalImages)

    } catch (error) {
      console.error('Upload error:', error)
      const errorImages = [...currentImages]
      errorImages[index] = {
        ...errorImages[index],
        uploading: false,
        uploaded: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
      onImagesChange(errorImages)
    }
  }, [desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange])

  // OPTIMIZED: Process files with immediate preview
  const processFiles = useCallback(async (
    files: FileList, 
    type: 'desktop' | 'mobile',
    currentImages: ImageUpload[],
    onImagesChange: (images: ImageUpload[]) => void
  ) => {
    console.log(`Processing ${files.length} files for ${type}`)
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (!file) continue
      
      const validationError = validateFile(file, type)
      const preview = URL.createObjectURL(file)
      
      // Create image object immediately with preview
      const newImage: ImageUpload = {
        file,
        preview,
        alt_text: '',
        type,
        uploading: false,
        uploaded: false,
        error: validationError || undefined
      }

      // Add to current images immediately
      const updatedImages = [...currentImages, newImage]
      onImagesChange(updatedImages)
      
      // If no validation error, extract metadata and upload in background
      if (!validationError) {
        const imageIndex = updatedImages.length - 1
        
        // Extract metadata in background (non-blocking)
        extractImageMetadata(file)
          .then(({ width, height }) => {
            // Update with metadata
            const currentState = type === 'desktop' ? desktopImages : mobileImages
            const updated = [...currentState]
            if (updated[imageIndex]) {
              updated[imageIndex] = { ...updated[imageIndex], width, height }
              const onUpdate = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange
              onUpdate(updated)
            }
          })
          .catch((error) => {
            console.warn('Metadata extraction failed:', error)
            // Continue without metadata
          })
        
        // Start upload immediately (don't wait for metadata)
        setTimeout(() => {
          uploadToS3(newImage, imageIndex, type)
        }, 100)
      }
    }
  }, [validateFile, extractImageMetadata, uploadToS3, desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange])

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    const files = e.target.files
    if (files && files.length > 0) {
      const currentImages = type === 'desktop' ? desktopImages : mobileImages
      const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange
      processFiles(files, type, currentImages, onImagesChange)
    }
    // Reset input
    e.target.value = ''
  }, [desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange, processFiles])

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent, type: 'desktop' | 'mobile') => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const currentImages = type === 'desktop' ? desktopImages : mobileImages
      const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange
      processFiles(files, type, currentImages, onImagesChange)
    }
  }, [desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange, processFiles])

  // Update alt text
  const updateAltText = useCallback((index: number, altText: string, type: 'desktop' | 'mobile') => {
    const currentImages = type === 'desktop' ? desktopImages : mobileImages
    const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange
    
    const updatedImages = [...currentImages]
    updatedImages[index] = { ...updatedImages[index], alt_text: altText }
    onImagesChange(updatedImages)
  }, [desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange])

  // Remove image
  const removeImage = useCallback((index: number, type: 'desktop' | 'mobile') => {
    const currentImages = type === 'desktop' ? desktopImages : mobileImages
    const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange
    
    // Clean up preview URL
    if (currentImages[index]?.preview) {
      URL.revokeObjectURL(currentImages[index].preview)
    }
    
    const updatedImages = currentImages.filter((_, i) => i !== index)
    onImagesChange(updatedImages)
  }, [desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange])

  // Render upload area for specific type
  const renderUploadArea = (type: 'desktop' | 'mobile') => {
    const images = type === 'desktop' ? desktopImages : mobileImages
    const fileInputRef = type === 'desktop' ? desktopFileInputRef : mobileFileInputRef
    const rules = VALIDATION_RULES[type]

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium capitalize">{type}:</Label>
          <p className="text-xs text-gray-500">{rules.helperText}</p>
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            "border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-gray-400 transition-colors",
            "cursor-pointer"
          )}
          onDrop={(e) => handleDrop(e, type)}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            Drag and drop {type} images
          </p>
          <p className="text-xs text-blue-600 hover:text-blue-700">
            or browse files
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={DEFAULT_ACCEPTED_TYPES.join(',')}
            onChange={(e) => handleFileSelect(e, type)}
            className="hidden"
          />
        </div>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Uploaded {type} Images
            </h4>
            <div className="space-y-3">
              {images.map((image, index) => {
                // Skip rendering if image doesn't have basic properties
                if (!image.file && !image.preview) return null
                
                return (
                  <div
                    key={`${type}-${image.file?.name || `image-${index}`}-${index}`}
                    className="border border-gray-200 rounded-md p-3 space-y-3"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Image preview */}
                      <div className="flex-shrink-0 relative">
                        {image.error ? (
                          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-md flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-red-400" />
                          </div>
                        ) : (
                          <img
                            src={image.preview}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded-md border border-gray-200"
                          />
                        )}
                        
                        {/* Upload status overlay */}
                        {image.uploading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-md flex items-center justify-center">
                            <Loader2 className="h-4 w-4 text-white animate-spin" />
                          </div>
                        )}
                        
                        {image.uploaded && (
                          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {image.file?.name || 'Unknown file'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {image.file ? (image.file.size / 1024).toFixed(1) : '0'} KB
                          {image.width && image.height && (
                            <span> • {image.width} × {image.height}</span>
                          )}
                        </p>
                        
                        {/* Status */}
                        {image.error && (
                          <p className="text-xs text-red-600 mt-1">{image.error}</p>
                        )}
                        {image.uploading && (
                          <p className="text-xs text-blue-600 mt-1">Uploading...</p>
                        )}
                        {image.uploaded && (
                          <p className="text-xs text-green-600 mt-1">✓ Uploaded successfully</p>
                        )}
                      </div>

                      {/* Remove button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(index, type)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove image</span>
                      </Button>
                    </div>
                    
                    {/* Alt text input - only show if no error */}
                    {!image.error && (
                      <div className="space-y-1">
                        <Label htmlFor={`alt-text-${type}-${index}`} className="text-xs font-medium">
                          Alt text (required for accessibility)
                        </Label>
                        <Input
                          id={`alt-text-${type}-${index}`}
                          type="text"
                          placeholder="Describe this image for screen readers"
                          value={image.alt_text}
                          onChange={(e) => updateAltText(index, e.target.value, type)}
                          className="text-xs"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-1">
        <Label className="text-sm font-medium text-gray-900">
          Images <span className="text-red-500">*</span>
        </Label>
      </div>
      
      {renderUploadArea('desktop')}
      {renderUploadArea('mobile')}
    </div>
  )
}