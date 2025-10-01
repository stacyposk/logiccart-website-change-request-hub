'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { useToast } from '@/components/ui/use-toast'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { createTicket } from '@/lib/api/client'
import { TicketPayload } from '@/lib/api/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { UrlList } from '@/components/UrlList'
import { DualImageDropzone, ImageUpload } from '@/components/DualImageDropzone'
import { AIPreviewSheet } from '@/components/AIPreviewSheet'
import { convertImagesToAssetMeta, areAllImagesUploaded, areAnyImagesUploading, getUploadStatus } from '@/lib/utils/image-utils'
// JWT Test Panel removed - no authentication required


interface FormData {
  requesterName: string
  requesterEmail: string
  department: string
  pageArea: string
  changeType: string
  pageUrls: string[]
  description: string
  copyEn: string
  copyZh: string
  targetLaunchDate: string
}

export default function CreateTicketPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    requesterName: '',
    requesterEmail: '',
    department: 'Marketing',
    pageArea: '',
    changeType: '',
    pageUrls: [''],
    description: '',
    copyEn: '',
    copyZh: '',
    targetLaunchDate: ''
  })

  const [activeTab, setActiveTab] = useState('en')

  const [desktopImages, setDesktopImages] = useState<ImageUpload[]>([])
  const [mobileImages, setMobileImages] = useState<ImageUpload[]>([])
  const images = [...desktopImages, ...mobileImages] // Combined for validation
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAIPreviewOpen, setIsAIPreviewOpen] = useState(false)
  const [aiPreviewData, setAIPreviewData] = useState<any>(null)

  // Fix hydration mismatch for dropdowns
  useEffect(() => {
    setIsClient(true)
  }, [])

  const updateFormData = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Conditional field display logic based on Request Type
  const getFieldRequirements = (requestType: string) => {
    switch (requestType) {
      case 'New Banner':
        return { copyRequired: true, imagesRequired: true }
      case 'Copy Update':
        return { copyRequired: true, imagesRequired: false }
      case 'SEO Update':
        return { copyRequired: true, imagesRequired: false }
      case 'Bug Fix':
      case 'New Feature':
        return { copyRequired: false, imagesRequired: false }
      default:
        return { copyRequired: false, imagesRequired: false }
    }
  }

  const fieldRequirements = getFieldRequirements(formData.changeType)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.requesterName.trim()) {
      newErrors.requesterName = 'Please fill in this field'
    }

    if (!formData.requesterEmail.trim()) {
      newErrors.requesterEmail = 'Please fill in this field'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.requesterEmail)) {
      newErrors.requesterEmail = 'Please enter a valid email address'
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Please fill in this field'
    }

    if (!formData.pageArea.trim()) {
      newErrors.pageArea = 'Please fill in this field'
    }

    if (!formData.changeType) {
      newErrors.changeType = 'Please fill in this field'
    }

    if (!formData.targetLaunchDate.trim()) {
      newErrors.targetLaunchDate = 'Please fill in this field'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please fill in this field'
    }

    // Conditional validation based on request type
    const requirements = getFieldRequirements(formData.changeType)

    if (requirements.copyRequired) {
      if (!formData.copyEn.trim() && !formData.copyZh.trim()) {
        newErrors.copy_content = 'Content copy is required for this request type'
      }
    }

    if (requirements.imagesRequired) {
      const allImages = [...desktopImages, ...mobileImages]
      if (allImages.length === 0) {
        newErrors.images = 'Images are required for this request type'
      } else {
        const uploadStatus = getUploadStatus(desktopImages, mobileImages)
        if (uploadStatus.anyUploading) {
          newErrors.images = 'Please wait for all images to finish uploading'
        } else if (uploadStatus.anyFailed) {
          newErrors.images = 'Some images failed to upload. Please retry or remove them'
        } else if (!uploadStatus.allUploaded && allImages.length > 0) {
          newErrors.images = 'Please ensure all images are uploaded successfully'
        }

        // Check for missing alt text on uploaded images
        const uploadedImages = allImages.filter(img => img.uploaded && img.s3Key)
        const missingAltText = uploadedImages.some(img => !img.alt_text || !img.alt_text.trim())
        if (missingAltText) {
          newErrors.images = 'Please provide alt text for all uploaded images'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload: TicketPayload = {
        requesterName: formData.requesterName,
        requesterEmail: formData.requesterEmail,
        department: formData.department,
        pageArea: formData.pageArea,
        changeType: formData.changeType as 'Content Update' | 'Layout' | 'Bug Fix' | 'New Feature',
        pageUrls: formData.pageUrls.filter(url => url.trim()),
        description: formData.description,

        copyEn: formData.copyEn || undefined,
        copyZh: formData.copyZh || undefined,
        targetLaunchDate: formData.targetLaunchDate || undefined,

        assets: convertImagesToAssetMeta([...desktopImages, ...mobileImages])
      }

      const response = await createTicket(payload)

      // Save to sessionStorage
      sessionStorage.setItem('ticketSubmission', JSON.stringify({
        ticket_id: response.ticketId,
        submitted_at: response.submittedAt || new Date().toISOString(),
        page_area: formData.pageArea,
        change_type: formData.changeType,
        first_page_url: formData.pageUrls[0],
        target_launch_date: formData.targetLaunchDate,
        requester_email: formData.requesterEmail,
        ai_summary: aiPreviewData?.summary || null
      }))

      toast({
        title: "Submitted",
        description: "Your change request has been submitted successfully."
      })

      router.push(`/success?ticket_id=${response.ticketId}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit the request. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      requesterName: '',
      requesterEmail: '',
      department: 'Marketing',
      pageArea: '',
      changeType: '',
      pageUrls: [''],
      description: '',
      copyEn: '',
      copyZh: '',
      targetLaunchDate: ''
    })
    setDesktopImages([])
    setMobileImages([])
    setErrors({})
    setActiveTab('en')
  }

  const handleRunAIPreview = () => {
    setIsAIPreviewOpen(true)
  }

  const handleAIDataGenerated = (data: any) => {
    setAIPreviewData(data)
  }

  return (
    <div className="mx-auto px-4 md:px-8 pb-24 pt-2" style={{ maxWidth: '1440px' }}>
      <form id="ticket-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Page Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Submit Request</h1>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <p className="text-base text-slate-500">Fill in the request form for a new website change.</p>

            {/* Reset Form Link */}
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-primary underline hover:text-primary/80 transition-colors cursor-pointer font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white self-start md:self-center"
            >
              Reset Form
            </button>
          </div>
        </div>

        {/* Request Details Section */}
        <Card className="transition-all duration-300 hover:shadow-lg hover:shadow-[#5754FF]/20 hover:-translate-y-0.5">
          <CardHeader className="px-4 sm:px-8 pt-6 sm:pt-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Request Details
              </CardTitle>
              {/* Department - positioned in header on desktop */}
              <div className="flex flex-col md:flex-row md:items-center md:gap-3 md:min-w-[280px]">
                <Label htmlFor="department" className="text-sm text-slate-700 md:whitespace-nowrap">
                  Department <span className="text-red-500">*</span>
                </Label>
                <div className="flex-1 space-y-1">
                  <Select value={formData.department} onValueChange={(value) => updateFormData('department', value)} required disabled={!isClient}>
                    <SelectTrigger>
                      <SelectValue placeholder={isClient ? "Select department" : "Loading..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="UX/UI">UX/UI</SelectItem>
                      <SelectItem value="Engineering/DevOps">Engineering/DevOps</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.department && (
                    <p className="text-sm text-red-600">{errors.department}</p>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-8 pt-0 pb-6 sm:pb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="requesterName" className="text-sm text-slate-700">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="requesterName"
                value={formData.requesterName || ''}
                onChange={(e) => updateFormData('requesterName', e.target.value)}
                placeholder="John Doe"
                required
              />
              {errors.requesterName && (
                <p className="text-sm text-red-600">{errors.requesterName}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-slate-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.requesterEmail || ''}
                onChange={(e) => updateFormData('requesterEmail', e.target.value)}
                placeholder="Enter your email address"
                required
              />
              {errors.requester_email && (
                <p className="text-sm text-red-600">{errors.requester_email}</p>
              )}
            </div>
            {/* Page Area */}
            <div className="space-y-2">
              <Label htmlFor="pageArea" className="text-sm text-slate-700">
                Impacted Page Area <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pageArea"
                value={formData.pageArea || ''}
                onChange={(e) => updateFormData('pageArea', e.target.value)}
                placeholder="Homepage - Hero Section"
                required
              />
              {errors.page_area && (
                <p className="text-sm text-red-600">{errors.page_area}</p>
              )}
            </div>

            {/* Request Type */}
            <div className="space-y-2">
              <Label htmlFor="requestType" className="text-sm text-slate-700">
                Request Type <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.changeType} onValueChange={(value) => updateFormData('changeType', value)} required disabled={!isClient}>
                <SelectTrigger>
                  <SelectValue placeholder={isClient ? "Select request type" : "Loading..."} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New Banner">New Banner</SelectItem>
                  <SelectItem value="Copy Update">Copy Update</SelectItem>
                  <SelectItem value="New Feature">New Feature</SelectItem>
                  <SelectItem value="Bug Fix">Bug Fix</SelectItem>
                  <SelectItem value="SEO Update">SEO Update</SelectItem>
                </SelectContent>
              </Select>
              {errors.change_type && (
                <p className="text-sm text-red-600">{errors.change_type}</p>
              )}
            </div>

            {/* Impacted Page URLs */}
            <div className="space-y-2">
              <UrlList
                urls={formData.pageUrls}
                onUrlsChange={(urls) => updateFormData('pageUrls', urls)}
                label="Impacted Page URL(s)"
              />
            </div>

            {/* Target Go-live Date */}
            <div className="space-y-2">
              <Label htmlFor="targetLaunchDate" className="text-sm text-slate-700">
                Target Go-live Date <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                value={formData.targetLaunchDate ? new Date(formData.targetLaunchDate + 'T12:00:00') : undefined}
                onChange={(date) => {
                  // Format date as YYYY-MM-DD using local timezone to prevent offset issues
                  if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    updateFormData('targetLaunchDate', `${year}-${month}-${day}`);
                  } else {
                    updateFormData('targetLaunchDate', '');
                  }
                }}
                placeholder="Select target date"
                disablePast={true}
              />
              <p className="text-xs text-slate-500">
                SLA: Target go-live date must be at least 5 business days from today
              </p>
              {errors.target_launch_date && (
                <p className="text-sm text-red-600">{errors.target_launch_date}</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description" className="text-sm text-slate-700">
                Description <span className="text-red-500 ml-1">*</span>
              </Label>

              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Describe the specific changes you need for the page(s)..."
                required
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Section */}
        <Card className="transition-all duration-300 hover:shadow-lg hover:shadow-[#5754FF]/20 hover:-translate-y-0.5">
          <CardHeader className="px-4 sm:px-8 pt-6 sm:pt-8 pb-4">
            <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
              Content Update
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-8 pt-0 pb-6 sm:pb-8 space-y-6">
            {/* Language Tabs - Show for all request types except when no request type is selected */}
            {formData.changeType !== '' && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="zh">中文</TabsTrigger>
                </TabsList>

                <TabsContent value="en" className="space-y-2">
                  <div className="space-y-2">
                    <Label htmlFor="copyEN" className="text-sm text-slate-700">
                      Content / Details {fieldRequirements.copyRequired ? <span className="text-red-500">*</span> : <span className="text-sm text-slate-500 ml-2">(Optional)</span>}
                    </Label>
                    <Textarea
                      id="copyEN"
                      value={formData.copyEn || ''}
                      onChange={(e) => updateFormData('copyEn', e.target.value)}
                      placeholder="Provide English copy or details..."
                      className="min-h-[120px] resize-y"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="zh" className="space-y-2">
                  <div className="space-y-2">
                    <Label htmlFor="copyZH" className="text-sm text-slate-700">
                      文案內容 / 詳情 {fieldRequirements.copyRequired ? <span className="text-red-500">*</span> : <span className="text-sm text-slate-500 ml-2">(Optional)</span>}
                    </Label>
                    <Textarea
                      id="copyZH"
                      value={formData.copyZh || ''}
                      onChange={(e) => updateFormData('copyZh', e.target.value)}
                      placeholder="提供中文文案內容或詳情..."
                      className="min-h-[120px] resize-y"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* Show validation error for copy content */}
            {errors.copy_content && (
              <p className="text-sm text-red-600">{errors.copy_content}</p>
            )}

            {/* Image Upload - Show for all request types except when no request type is selected */}
            {formData.changeType !== '' && (
              <div className="space-y-2">
                <Label className="text-sm text-slate-700">
                  Images {fieldRequirements.imagesRequired ? <span className="text-red-500">*</span> : <span className="text-sm text-slate-500 ml-2">(Optional)</span>}
                </Label>
                <DualImageDropzone
                  desktopImages={desktopImages}
                  mobileImages={mobileImages}
                  onDesktopImagesChange={setDesktopImages}
                  onMobileImagesChange={setMobileImages}
                />
                {errors.images && (
                  <p className="text-sm text-red-600 mt-2">{errors.images}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </form>

      {/* Sticky Submit Bar - Fixed Mobile Responsive */}
      <div className="sticky bottom-4 z-[5]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10 px-4 sm:px-8 py-3 sm:py-4">
            
            {/* Mobile/Tablet Layout: Stacked (up to lg breakpoint) */}
            <div className="flex flex-col gap-3 lg:hidden">
              {/* Mobile Disclaimer */}
              <p className="text-xs text-slate-500 text-center px-1">
                By submitting, you agree to internal review and SLA timelines.
              </p>
              
              {/* Mobile Buttons - Stacked with proper overflow handling */}
              <div className="flex flex-col gap-2 w-full">
                <Button
                  type="submit"
                  form="ticket-form"
                  disabled={isSubmitting || areAnyImagesUploading([...desktopImages, ...mobileImages])}
                  className="w-full flex items-center justify-center gap-2 text-sm text-white shadow-sm hover:opacity-90 transition focus:outline-none disabled:opacity-50 min-h-[44px] px-3"
                  style={{ backgroundColor: '#5754FF' }}
                >
                  <span className="truncate">
                    {isSubmitting ? 'Submitting...' :
                      areAnyImagesUploading([...desktopImages, ...mobileImages]) ? 'Uploading Images...' :
                        'Submit Request'}
                  </span>
                  {isSubmitting || areAnyImagesUploading([...desktopImages, ...mobileImages]) ? (
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  ) : (
                    <Send className="h-4 w-4 flex-shrink-0" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRunAIPreview}
                  className="w-full flex items-center justify-center gap-2 border text-sm shadow-sm hover:bg-slate-50 transition focus:outline-none min-h-[44px] px-3"
                  style={{
                    color: '#5754FF',
                    borderColor: '#5754FF'
                  }}
                >
                  <span className="truncate">Run AI Preview</span>
                  <Sparkles
                    className="h-4 w-4 flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #E5E3FF 0%, #D4D1FF 50%, #C4BFFF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  />
                </Button>
              </div>
            </div>

            {/* Desktop Layout: Horizontal (lg and up for better spacing) */}
            <div className="hidden lg:flex lg:items-center lg:justify-between gap-4">
              {/* Desktop Disclaimer */}
              <p className="text-xs text-slate-500 flex-shrink-0">
                By submitting, you agree to internal review and SLA timelines.
              </p>

              {/* Desktop Buttons - Horizontal */}
              <div className="flex gap-3 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRunAIPreview}
                  className="flex items-center justify-center gap-2 border text-sm shadow-sm hover:bg-slate-50 transition focus:outline-none px-6"
                  style={{
                    color: '#5754FF',
                    borderColor: '#5754FF'
                  }}
                >
                  Run AI Preview
                  <Sparkles
                    className="h-4 w-4"
                    style={{
                      background: 'linear-gradient(135deg, #E5E3FF 0%, #D4D1FF 50%, #C4BFFF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  />
                </Button>

                <Button
                  type="submit"
                  form="ticket-form"
                  disabled={isSubmitting || areAnyImagesUploading([...desktopImages, ...mobileImages])}
                  className="flex items-center justify-center gap-2 text-sm text-white shadow-sm hover:opacity-90 transition focus:outline-none disabled:opacity-50 px-6"
                  style={{ backgroundColor: '#5754FF' }}
                >
                  {isSubmitting ? 'Submitting...' :
                    areAnyImagesUploading([...desktopImages, ...mobileImages]) ? 'Uploading Images...' :
                      'Submit Request'}
                  {isSubmitting || areAnyImagesUploading([...desktopImages, ...mobileImages]) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
        </div>
      </div>

      {/* AI Preview Sheet */}
      <AIPreviewSheet
        isOpen={isAIPreviewOpen}
        onClose={() => setIsAIPreviewOpen(false)}
        formData={formData}
        images={images}
        onAIDataGenerated={handleAIDataGenerated}
      />
      
      {/* JWT Test Panel removed for production */}
    </div>
  )
}