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

// Validation rules based on task requirements
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
  const [dragStates, setDragStates] = useState({
    desktop: false,
    mobile: false
  })

  const desktopFileInputRef = useRef<HTMLInputElement>(null)
  const mobileFileInputRef = useRef<HTMLInputElement>(null)

  // Extract image metadata using createImageBitmap
  const extractImageMetadata = useCallback(async (file: File): Promise<{ width: number; height: number }> => {
    try {
      const bitmap = await createImageBitmap(file)
      const { width, height } = bitmap
      bitmap.close() // Clean up bitmap
      return { width, height }
    } catch (error) {
      // Fallback to Image() if createImageBitmap fails
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight })
          URL.revokeObjectURL(img.src)
        }
        img.onerror = () => {
          reject(new Error('Failed to load image'))
          URL.revokeObjectURL(img.src)
        }
        img.src = URL.createObjectURL(file)
      })
    }
  }, [])

  // Validate file type and size
  const validateFile = useCallback((file: File, type: 'desktop' | 'mobile'): string | null => {
    if (!DEFAULT_ACCEPTED_TYPES.includes(file.type)) {
      return `File type not supported. Please use ${DEFAULT_ACCEPTED_TYPES.join(', ')}`
    }

    const sizeMB = file.size / (1024 * 1024)
    const maxSizeMB = VALIDATION_RULES[type].maxSizeKB / 1024
    if (sizeMB > maxSizeMB) {
      return `File size too large. Maximum size is ${VALIDATION_RULES[type].maxSizeKB}KB`
    }

    return null
  }, [])

  // Upload to S3
  const uploadToS3 = useCallback(async (image: ImageUpload, index: number, type: 'desktop' | 'mobile') => {
    const getCurrentImages = () => type === 'desktop' ? desktopImages : mobileImages
    const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange

    try {
      // Set uploading state
      const currentImages = getCurrentImages()
      const uploadingImages = [...currentImages]
      console.log('Before upload - original image:', {
        hasFile: !!uploadingImages[index]?.file,
        hasPreview: !!uploadingImages[index]?.preview,
        fileName: uploadingImages[index]?.file?.name
      })
      uploadingImages[index] = { ...uploadingImages[index], uploading: true, error: undefined }
      onImagesChange(uploadingImages)

      if (!image.file) {
        throw new Error('File is missing from image upload')
      }

      // Get presigned URL from backend
      const sizeKb = Math.round(image.file.size / 1024)
      const { uploadUrl, s3Key } = await getUploadUrl(
        image.file.name,
        image.file.type,
        sizeKb
      )

      // Upload to S3
      await uploadFileToS3(uploadUrl, image.file)

      // Update with success - use original image as source of truth
      const latestImages = getCurrentImages()
      const successImages = [...latestImages]
      successImages[index] = {
        ...image, // Use original image data
        uploading: false,
        uploaded: true,
        s3Key,
        error: undefined
      }
      console.log('Upload success - preserved data:', {
        hasFile: !!successImages[index].file,
        hasPreview: !!successImages[index].preview,
        fileName: successImages[index].file?.name
      })
      onImagesChange(successImages)

    } catch (error) {
      console.error('Upload error:', error)
      const latestImages = getCurrentImages()
      const errorImages = [...latestImages]
      errorImages[index] = {
        ...errorImages[index],
        uploading: false,
        uploaded: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
      onImagesChange(errorImages)
    }
  }, [desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange])

  // Process files and add to images array
  const processFiles = useCallback(async (
    files: FileList,
    type: 'desktop' | 'mobile',
    currentImages: ImageUpload[],
    onImagesChange: (images: ImageUpload[]) => void
  ) => {
    const newImages: ImageUpload[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validationError = validateFile(file, type)

      if (validationError) {
        // Add image with error state
        newImages.push({
          file,
          preview: '',
          alt_text: '',
          type,
          error: validationError
        })
        continue
      }

      const preview = URL.createObjectURL(file)

      try {
        const { width, height } = await extractImageMetadata(file)
        newImages.push({
          file,
          preview,
          alt_text: '',
          width,
          height,
          type,
          uploading: false,
          uploaded: false
        })
      } catch (error) {
        newImages.push({
          file,
          preview,
          alt_text: '',
          type,
          error: 'Failed to process image metadata'
        })
      }
    }

    onImagesChange([...currentImages, ...newImages])

    // Auto-upload valid images to S3
    for (let i = 0; i < newImages.length; i++) {
      const image = newImages[i]
      if (!image.error) {
        const imageIndex = currentImages.length + i
        // Small delay to prevent overwhelming the API
        setTimeout(() => {
          uploadToS3(image, imageIndex, type)
        }, i * 200)
      }
    }
  }, [validateFile, extractImageMetadata, uploadToS3])

  // Create drag handlers for specific type
  const createDragHandlers = (type: 'desktop' | 'mobile') => ({
    handleDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setDragStates(prev => ({ ...prev, [type]: true }))
    },
    handleDragLeave: (e: React.DragEvent) => {
      e.preventDefault()
      setDragStates(prev => ({ ...prev, [type]: false }))
    },
    handleDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragStates(prev => ({ ...prev, [type]: false }))

      const files = e.dataTransfer.files
      if (files.length > 0) {
        const currentImages = type === 'desktop' ? desktopImages : mobileImages
        const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange
        processFiles(files, type, currentImages, onImagesChange)
      }
    }
  })

  const desktopHandlers = createDragHandlers('desktop')
  const mobileHandlers = createDragHandlers('mobile')

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    const files = e.target.files
    if (files && files.length > 0) {
      const currentImages = type === 'desktop' ? desktopImages : mobileImages
      const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange
      processFiles(files, type, currentImages, onImagesChange)
    }
    // Reset input value to allow selecting the same file again
    const inputRef = type === 'desktop' ? desktopFileInputRef : mobileFileInputRef
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [processFiles, desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange])

  // Update alt text for specific image
  const updateAltText = useCallback((index: number, altText: string, type: 'desktop' | 'mobile') => {
    const currentImages = type === 'desktop' ? desktopImages : mobileImages
    const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange

    const updatedImages = [...currentImages]
    updatedImages[index] = { ...updatedImages[index], alt_text: altText }
    onImagesChange(updatedImages)
  }, [desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange])

  // Replace image at specific index
  const replaceImage = useCallback((index: number, type: 'desktop' | 'mobile') => {
    const currentImages = type === 'desktop' ? desktopImages : mobileImages
    const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange

    // Clean up old preview URL
    if (currentImages[index].preview) {
      URL.revokeObjectURL(currentImages[index].preview)
    }

    // Trigger file input for replacement
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = DEFAULT_ACCEPTED_TYPES.join(',')
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const file = files[0]
        const validationError = validateFile(file, type)

        const updatedImages = [...currentImages]

        if (validationError) {
          updatedImages[index] = {
            ...updatedImages[index],
            file,
            preview: '',
            error: validationError
          }
        } else {
          const preview = URL.createObjectURL(file)
          try {
            const { width, height } = await extractImageMetadata(file)
            updatedImages[index] = {
              ...updatedImages[index],
              file,
              preview,
              width,
              height,
              error: undefined
            }
          } catch (error) {
            updatedImages[index] = {
              ...updatedImages[index],
              file,
              preview,
              error: 'Failed to process image metadata'
            }
          }
        }

        onImagesChange(updatedImages)
      }
    }
    input.click()
  }, [desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange, validateFile, extractImageMetadata])

  // Remove image at specific index
  const removeImage = useCallback((index: number, type: 'desktop' | 'mobile') => {
    const currentImages = type === 'desktop' ? desktopImages : mobileImages
    const onImagesChange = type === 'desktop' ? onDesktopImagesChange : onMobileImagesChange

    // Clean up preview URL to prevent memory leaks
    if (currentImages[index].preview) {
      URL.revokeObjectURL(currentImages[index].preview)
    }

    const updatedImages = currentImages.filter((_, i) => i !== index)
    onImagesChange(updatedImages)
  }, [desktopImages, mobileImages, onDesktopImagesChange, onMobileImagesChange])

  // Render upload area for specific type
  const renderUploadArea = (type: 'desktop' | 'mobile') => {
    const isDragOver = dragStates[type]
    const handlers = type === 'desktop' ? desktopHandlers : mobileHandlers
    const fileInputRef = type === 'desktop' ? desktopFileInputRef : mobileFileInputRef
    const images = type === 'desktop' ? desktopImages : mobileImages
    const rules = VALIDATION_RULES[type]

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-slate-700 capitalize">{type}:</Label>
          <p className="text-xs text-gray-500">{rules.helperText}</p>
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-md p-6 text-center transition-colors duration-200',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400'
          )}
          onDragOver={handlers.handleDragOver}
          onDragLeave={handlers.handleDragLeave}
          onDrop={handlers.handleDrop}
        >
          <div className="flex flex-col items-center space-y-3">
            <div className={cn(
              'p-3 rounded-full transition-colors duration-200',
              isDragOver ? 'bg-primary/10' : 'bg-gray-100'
            )}>
              <Upload className={cn(
                'h-6 w-6 transition-colors duration-200',
                isDragOver ? 'text-primary' : 'text-gray-400'
              )} />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragOver ? 'Drop images here' : `Drag and drop ${type} images`}
              </p>
              <p className="text-xs text-gray-500">
                or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:text-primary/80 font-medium underline"
                >
                  browse files
                </button>
              </p>
            </div>
          </div>

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
              {images.map((image, index) => (
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
                          alt={image.alt_text || 'Preview'}
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

                    {/* Image details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div>
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {image.file?.name || 'Unknown file'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {image.file ? (image.file.size / 1024).toFixed(1) : '0'} KB
                          {image.width && image.height && (
                            <span> • {image.width} × {image.height}</span>
                          )}
                        </p>
                      </div>

                      {/* Status messages */}
                      {image.error && (
                        <p className="text-xs text-red-600">{image.error}</p>
                      )}
                      {image.uploading && (
                        <p className="text-xs text-blue-600">Uploading to S3...</p>
                      )}
                      {image.uploaded && (
                        <p className="text-xs text-green-600">✓ Uploaded successfully</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex-shrink-0 flex space-x-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => replaceImage(index, type)}
                        className="h-7 w-7 p-0"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span className="sr-only">Replace image</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeImage(index, type)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove image</span>
                      </Button>
                    </div>
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
                        value={image.alt_text || ''}
                        onChange={(e) => updateAltText(index, e.target.value, type)}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {renderUploadArea('desktop')}
      {renderUploadArea('mobile')}
    </div>
  )
}