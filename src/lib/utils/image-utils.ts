import { ImageUpload } from '@/components/DualImageDropzone'
import { AssetMeta } from '@/lib/api/types'

/**
 * Convert ImageUpload objects to AssetMeta format for API submission
 * Only includes successfully uploaded images with S3 keys
 */
export function convertImagesToAssetMeta(images: ImageUpload[]): AssetMeta[] {
  return images
    .filter(image => image.uploaded && image.s3Key && !image.error && image.alt_text.trim())
    .map(image => ({
      filename: image.file.name,
      sizeKb: Math.round(image.file.size / 1024),
      width: image.width || 0,
      height: image.height || 0,
      altText: image.alt_text.trim(),
      type: image.type,
      s3Key: image.s3Key!
    }))
}

/**
 * Check if all images are successfully uploaded
 */
export function areAllImagesUploaded(images: ImageUpload[]): boolean {
  if (images.length === 0) return true
  return images.every(image => image.uploaded && image.s3Key && !image.error)
}

/**
 * Check if any images are currently uploading
 */
export function areAnyImagesUploading(images: ImageUpload[]): boolean {
  return images.some(image => image.uploading)
}

/**
 * Get upload status summary
 */
export function getUploadStatus(desktopImages: ImageUpload[], mobileImages: ImageUpload[]) {
  const allImages = [...desktopImages, ...mobileImages]
  const totalImages = allImages.length
  const uploadedImages = allImages.filter(img => img.uploaded).length
  const failedImages = allImages.filter(img => img.error && !img.uploading).length
  const uploadingImages = allImages.filter(img => img.uploading).length
  
  // Debug logging (can be removed in production)
  console.log('Upload Status Debug:', {
    totalImages,
    uploadedImages,
    failedImages,
    uploadingImages,
    imageDetails: allImages.map(img => ({
      filename: img.file?.name,
      uploaded: img.uploaded,
      uploading: img.uploading,
      error: img.error,
      s3Key: img.s3Key,
      hasAltText: !!img.alt_text?.trim()
    }))
  })
  
  return {
    total: totalImages,
    uploaded: uploadedImages,
    failed: failedImages,
    uploading: uploadingImages,
    allUploaded: totalImages > 0 && uploadedImages === totalImages,
    anyUploading: uploadingImages > 0,
    anyFailed: failedImages > 0
  }
}