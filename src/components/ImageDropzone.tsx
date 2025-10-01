'use client'

import React, { useCallback, useState, useRef } from 'react'
import { Upload, X, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface ImageUpload {
  file: File
  preview: string
  alt_text: string
  width?: number
  height?: number
  type: 'desktop' | 'mobile'
  uploading?: boolean
  error?: string
}

interface ImageDropzoneProps {
  images: ImageUpload[]
  onImagesChange: (images: ImageUpload[]) => void
  type: 'desktop' | 'mobile'
  maxSizeMB?: number
  acceptedTypes?: string[]
  className?: string
}

const DEFAULT_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const DEFAULT_MAX_SIZE_MB = 5

export function ImageDropzone({
  images,
  onImagesChange,
  type,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  className
}: ImageDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = URL.createObjectURL(file)
      })
    }
  }, [])

  // Validate file type and size
  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type not supported. Please use ${acceptedTypes.join(', ')}`
    }
    
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      return `File size too large. Maximum size is ${maxSizeMB}MB`
    }
    
    return null
  }, [acceptedTypes, maxSizeMB])

  // Process files and add to images array
  const processFiles = useCallback(async (files: FileList) => {
    const newImages: ImageUpload[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validationError = validateFile(file)
      
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
          type,
          width,
          height
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
    
    onImagesChange([...images, ...newImages])
  }, [images, onImagesChange, validateFile, extractImageMetadata])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFiles(files)
    }
  }, [processFiles])

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFiles(files)
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [processFiles])

  // Update alt text for specific image
  const updateAltText = useCallback((index: number, altText: string) => {
    const updatedImages = [...images]
    updatedImages[index] = { ...updatedImages[index], alt_text: altText }
    onImagesChange(updatedImages)
  }, [images, onImagesChange])

  // Replace image at specific index
  const replaceImage = useCallback((index: number) => {
    // Clean up old preview URL
    if (images[index].preview) {
      URL.revokeObjectURL(images[index].preview)
    }
    
    // Trigger file input for replacement
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = acceptedTypes.join(',')
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const file = files[0]
        const validationError = validateFile(file)
        
        const updatedImages = [...images]
        
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
  }, [images, onImagesChange, acceptedTypes, validateFile, extractImageMetadata])

  // Remove image at specific index
  const removeImage = useCallback((index: number) => {
    // Clean up preview URL to prevent memory leaks
    if (images[index].preview) {
      URL.revokeObjectURL(images[index].preview)
    }
    
    const updatedImages = images.filter((_, i) => i !== index)
    onImagesChange(updatedImages)
  }, [images, onImagesChange])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-md p-8 text-center transition-colors duration-200',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className={cn(
            'p-4 rounded-full transition-colors duration-200',
            isDragOver ? 'bg-primary/10' : 'bg-gray-100'
          )}>
            <Upload className={cn(
              'h-8 w-8 transition-colors duration-200',
              isDragOver ? 'text-primary' : 'text-gray-400'
            )} />
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragOver ? 'Drop images here' : 'Drag and drop images'}
            </p>
            <p className="text-sm text-gray-500">
              or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:text-primary/80 font-medium underline"
              >
                browse files
              </button>
            </p>
            <p className="text-xs text-gray-400">
              Supports {acceptedTypes.join(', ')} up to {maxSizeMB}MB
            </p>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Uploaded Images</h3>
          <div className="space-y-4">
            {images.map((image, index) => (
              <div
                key={`${image.file.name}-${index}`}
                className="border border-gray-200 rounded-md p-4 space-y-4"
              >
                <div className="flex items-start space-x-4">
                  {/* Image preview */}
                  <div className="flex-shrink-0">
                    {image.error ? (
                      <div className="w-20 h-20 bg-red-50 border border-red-200 rounded-md flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-red-400" />
                      </div>
                    ) : (
                      <img
                        src={image.preview}
                        alt={image.alt_text || 'Preview'}
                        className="w-20 h-20 object-cover rounded-md border border-gray-200"
                      />
                    )}
                  </div>
                  
                  {/* Image details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {image.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(image.file.size / 1024).toFixed(1)} KB
                        {image.width && image.height && (
                          <span> • {image.width} × {image.height}</span>
                        )}
                      </p>
                    </div>
                    
                    {/* Error message */}
                    {image.error && (
                      <p className="text-sm text-red-600">{image.error}</p>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex-shrink-0 flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => replaceImage(index)}
                      className="h-8 w-8 p-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="sr-only">Replace image</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeImage(index)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  </div>
                </div>
                
                {/* Alt text input - only show if no error */}
                {!image.error && (
                  <div className="space-y-2">
                    <Label htmlFor={`alt-text-${index}`} className="text-sm font-medium">
                      Alt text (required for accessibility)
                    </Label>
                    <Input
                      id={`alt-text-${index}`}
                      type="text"
                      placeholder="Describe this image for screen readers"
                      value={image.alt_text}
                      onChange={(e) => updateAltText(index, e.target.value)}
                      className="text-sm"
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