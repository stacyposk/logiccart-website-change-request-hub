'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Sparkles, CheckCircle2, ClipboardCheck, Layers2, Plus, Minus, Copy } from 'lucide-react'
import { ImageUpload } from '@/components/DualImageDropzone'
import { useToast } from '@/components/ui/use-toast'

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

interface AIPreviewError {
  type: 'timeout' | 'network' | 'general'
  message: string
  retryable: boolean
}

interface AIPreviewSheetProps {
  isOpen: boolean
  onClose: () => void
  formData: FormData
  images: ImageUpload[]
  onAIDataGenerated?: (data: AIPreviewData) => void
}



/**
 * AI Preview Sheet Component
 * 
 * A right-side slide-over sheet that provides AI-powered analysis of form data and images.
 * Displays summary, acceptance criteria, policy compliance, missing information, and risk/effort assessment.
 * 
 * Features:
 * - Mock AI analysis with realistic data generation
 * - Responsive design for mobile and desktop
 * - Proper accessibility attributes via shadcn/ui Sheet
 * - Loading states and error handling
 * - Close functionality with state cleanup
 * - Hardcoded reminder for New Feature requests
 */
export function AIPreviewSheet({ isOpen, onClose, formData, images, onAIDataGenerated }: AIPreviewSheetProps) {
  const [previewData, setPreviewData] = useState<AIPreviewData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AIPreviewError | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const { toast } = useToast()

  // Real AI preview generation using Bedrock API
  const generatePreview = async (formData: FormData, images: ImageUpload[]): Promise<AIPreviewData> => {
    // Import the API client
    const { getAIPreview } = await import('@/lib/api/client')

    // Simulate failures for testing error handling (controlled by environment or test setup)
    if (process.env.NODE_ENV === 'test' && (window as any).__FORCE_AI_FAILURE__) {
      throw new Error('AI analysis failed')
    }

    try {
      // Prepare assets metadata for API call
      const uploadedAssets = images.map(img => ({
        filename: img.file?.name || 'unknown',
        sizeKb: Math.round((img.file?.size || 0) / 1024),
        width: img.width || 0,
        height: img.height || 0,
        altText: img.alt_text || '',
        type: img.type,
        s3Key: img.s3Key || ''
      }))

      // Call the real AI Preview API
      const aiResponse = await getAIPreview({
        formData: {
          requesterName: formData.requesterName,
          requesterEmail: formData.requesterEmail,
          department: formData.department,
          pageArea: formData.pageArea,
          changeType: formData.changeType as any,
          pageUrls: formData.pageUrls,
          description: formData.description,
          copyEn: formData.copyEn,
          copyZh: formData.copyZh,
          targetLaunchDate: formData.targetLaunchDate
        },
        uploadedAssets
      })

      // Transform AI response to match existing interface
      const hasHighSeverityIssues = aiResponse.issues.some(issue => issue.severity === 'high')
      const hasMediumSeverityIssues = aiResponse.issues.some(issue => issue.severity === 'med')

      // Categorize issues by type for policy compliance display
      const policyHits = {
        accessibility: aiResponse.issues.filter(issue =>
          issue.field.includes('alt') || issue.field.includes('accessibility') || issue.field.includes('contrast')
        ).map(issue => issue.note),
        performance: aiResponse.issues.filter(issue =>
          issue.field.includes('image') || issue.field.includes('optimization') || issue.field.includes('size')
        ).map(issue => issue.note),
        brand: aiResponse.issues.filter(issue =>
          issue.field.includes('copy') || issue.field.includes('brand') || issue.field.includes('voice')
        ).map(issue => issue.note),
        designSystem: aiResponse.issues.filter(issue =>
          issue.field.includes('design') || issue.field.includes('component') || issue.field.includes('system')
        ).map(issue => issue.note)
      }

      // Create a user-friendly summary
      const issueCount = aiResponse.issues.length

      let summaryText = ''
      if (issueCount === 0) {
        summaryText = 'Your request looks good! No issues found with the provided information.'
      } else if (aiResponse.decision === 'approve') {
        summaryText = issueCount === 1
          ? 'Ready for approval with 1 minor note to consider.'
          : `Ready for approval with ${issueCount} minor notes to consider.`
      } else if (aiResponse.decision === 'needs_info') {
        summaryText = issueCount === 1
          ? 'Please provide 1 additional piece of information to complete your request.'
          : `Please provide ${issueCount} additional pieces of information to complete your request.`
      } else {
        summaryText = issueCount === 1
          ? 'There is 1 item that needs attention before approval.'
          : `There are ${issueCount} items that need attention before approval.`
      }

      return {
        summary: summaryText,
        acceptanceCriteria: aiResponse.acceptanceCriteria,
        policyHits,
        missingInfo: aiResponse.issues.map(issue => issue.note),
        hasMissingInfo: aiResponse.decision === 'needs_info' || aiResponse.issues.length > 0,
        riskEffort: {
          risk: hasHighSeverityIssues ? 'High' : hasMediumSeverityIssues ? 'Medium' : 'Low',
          effort: aiResponse.issues.length > 5 ? 'Large' : aiResponse.issues.length > 2 ? 'Medium' : 'Small'
        }
      }
    } catch (error) {
      console.error('AI Preview API call failed:', error)
      // Fallback to basic analysis if API fails
      const hasBasicInfo = formData.requesterName.trim() &&
        formData.requesterEmail.trim() &&
        formData.department.trim() &&
        formData.pageArea.trim() &&
        formData.changeType.trim() &&
        formData.description.trim()

      if (!hasBasicInfo) {
        return {
          summary: "Please complete the required form fields to enable AI preview analysis.",
          acceptanceCriteria: [
            "Complete all required form fields",
            "Provide detailed description of changes needed",
            "Specify target launch date",
            "Add relevant content or images based on request type"
          ],
          policyHits: {
            accessibility: [],
            performance: [],
            brand: [],
            designSystem: []
          },
          missingInfo: [
            !formData.requesterName.trim() ? 'Requester name required' : '',
            !formData.requesterEmail.trim() ? 'Email address required' : '',
            !formData.pageArea.trim() ? 'Page area required' : '',
            !formData.changeType.trim() ? 'Request type required' : '',
            !formData.description.trim() ? 'Description required' : '',
            !formData.targetLaunchDate ? 'Target launch date required' : ''
          ].filter(Boolean),
          hasMissingInfo: true,
          riskEffort: {
            risk: 'Low',
            effort: 'Small'
          }
        }
      }

      // Re-throw error to be handled by the error handling logic
      throw error
    }

  }

  const performAnalysis = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await generatePreview(formData, images)
      setPreviewData(data)
      setRetryCount(0) // Reset retry count on success

      // Call the callback to store AI data for later use
      if (onAIDataGenerated) {
        // Include New Feature reminder in the summary for Success Page display
        const summaryWithReminder = formData.changeType === 'New Feature'
          ? `${data.summary}\n\nNote: New feature requests typically require further technical information and internal review`
          : data.summary

        onAIDataGenerated({
          ...data,
          summary: summaryWithReminder
        })
      }
    } catch (err) {
      console.error('AI Preview analysis failed:', err)
      setError({
        type: 'general',
        message: 'Something went wrong. Retry or check later.',
        retryable: true
      })
      setRetryCount(prev => prev + 1)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && !previewData && !error) {
      performAnalysis()
    }
  }, [isOpen])

  const handleClose = () => {
    setPreviewData(null)
    setError(null)
    setRetryCount(0)
    onClose()
  }

  const handleRetry = () => {
    if (retryCount >= 3) {
      setError({
        type: 'general',
        message: 'Multiple attempts failed. Please check your connection and try again later.',
        retryable: false
      })
      return
    }
    performAnalysis()
  }

  const handleCopyAcceptanceCriteria = async () => {
    if (!previewData?.acceptanceCriteria) return

    try {
      // Format acceptance criteria for developer handoff
      const formattedCriteria = [
        '# Acceptance Criteria',
        '',
        ...previewData.acceptanceCriteria.map((criteria, index) => `${index + 1}. ${criteria}`),
        '',
        '---',
        `Generated from: ${formData.changeType} request for ${formData.pageArea}`,
        `Request ID: ${Date.now()}`, // Placeholder for actual ticket ID
        `Generated on: ${new Date().toLocaleDateString()}`
      ].join('\n')

      await navigator.clipboard.writeText(formattedCriteria)

      toast({
        title: "Copied to clipboard",
        description: "Acceptance criteria copied successfully for developer handoff",
      })
    } catch (error) {
      // Handle clipboard permission errors or unsupported browsers
      console.error('Failed to copy to clipboard:', error)

      // Fallback: Try using the older execCommand method
      try {
        const textArea = document.createElement('textarea')
        const formattedCriteria = [
          '# Acceptance Criteria',
          '',
          ...previewData.acceptanceCriteria.map((criteria, index) => `${index + 1}. ${criteria}`),
          '',
          '---',
          `Generated from: ${formData.changeType} request for ${formData.pageArea}`,
          `Request ID: ${Date.now()}`,
          `Generated on: ${new Date().toLocaleDateString()}`
        ].join('\n')

        textArea.value = formattedCriteria
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)

        toast({
          title: "Copied to clipboard",
          description: "Acceptance criteria copied successfully for developer handoff",
        })
      } catch (fallbackError) {
        toast({
          title: "Copy failed",
          description: "Unable to copy to clipboard. Please copy the text manually.",
          variant: "destructive",
        })
      }
    }
  }



  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto overflow-x-hidden">
        {/* Gradient background container */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-purple-50 to-orange-50">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
        </div>

        {/* Content container */}
        <div className="relative z-10 h-full max-w-full">
          <SheetHeader className="px-0">
            <SheetTitle className="text-xl text-left">
              AI Preview Analysis
            </SheetTitle>
            <SheetDescription className="text-base text-left">
              AI-powered analysis of your change request
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 max-w-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderBottomColor: '#5754FF' }}></div>
                  <p className="text-sm text-muted-foreground">
                    {retryCount > 0 ? 'Retrying analysis...' : 'Analyzing your request...'}
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Analysis Failed</h3>
                  <p className="text-sm text-slate-600 mb-6">{error.message}</p>
                  {error.retryable && (
                    <Button
                      onClick={handleRetry}
                      className="text-white px-6 py-2 hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#5754FF' }}
                      disabled={isLoading}
                    >
                      Try Again
                    </Button>
                  )}
                  {!error.retryable && (
                    <p className="text-xs text-slate-500 mt-4">
                      If the problem persists, please contact support or try submitting your request without AI preview.
                    </p>
                  )}
                </div>
              </div>
            ) : previewData ? (
              <>
                {/* Summary Section */}
                <Card className="overflow-hidden bg-white border border-white/50 shadow-sm">
                  <CardHeader className="px-3 sm:px-6 pt-4 pb-2">
                    <CardTitle className="text-lg flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5754FF 0%, #7C3AED 50%, #ff6f22 100%)' }}>
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pt-0 pb-6">
                    {previewData.hasMissingInfo ? (
                      <p className="text-sm text-slate-600">{previewData.summary}</p>
                    ) : (
                      <ul className="space-y-1">
                        {previewData.summary.split('. ').filter(Boolean).map((point, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Minus className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" />
                            <span>{point.endsWith('.') ? point : point + '.'}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* New Feature reminder note integrated into Summary Card */}
                    {formData.changeType === 'New Feature' && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm text-slate-900">
                          Note: New feature requests typically require further technical information and internal review
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>



                {/* Missing Info Section - Second position, only when missing info exists */}
                {previewData.missingInfo.length > 0 && (
                  <Card className="overflow-hidden bg-white border border-white/50 shadow-sm">
                    <CardHeader className="px-3 sm:px-6 pt-4 pb-2">
                      <CardTitle className="text-lg text-red-600 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                        Missing Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pt-0 pb-6">
                      <ul className="space-y-2">
                        {previewData.missingInfo.map((info, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-red-600">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <span>{info}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Policy Compliance Section - Second position when no missing information exists */}
                {!previewData.hasMissingInfo && (
                  <Card className="overflow-hidden bg-white border border-white/50 shadow-sm">
                    <CardHeader className="px-3 sm:px-6 pt-4 pb-2">
                      <CardTitle className="text-lg flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        </div>
                        Policy Compliance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pt-0 pb-6 space-y-3">
                      {Object.entries(previewData.policyHits).map(([category, hits]) => (
                        <div key={category}>
                          <h4 className="text-sm font-medium capitalize mb-2">
                            {category === 'designSystem' ? 'Design System' : category}
                          </h4>
                          {hits.length > 0 ? (
                            <ul className="space-y-1">
                              {hits.map((hit, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-red-600">
                                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                  <span>{hit}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-green-600 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              No issues detected
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Acceptance Criteria Section */}
                <Card className="overflow-hidden bg-white border border-white/50 shadow-sm">
                  <CardHeader className="px-3 sm:px-6 pt-4 pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Layers2 className="h-5 w-5 text-white" />
                        </div>
                        Acceptance Criteria
                      </div>
                      {/* Copy button positioned on the same row as header */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyAcceptanceCriteria}
                        className="h-8 w-8 p-0 hover:bg-slate-100 rounded-md flex-shrink-0"
                        title="Copy acceptance criteria for developer handoff"
                      >
                        <Copy className="h-4 w-4 text-slate-600" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pt-0 pb-6">
                    <ul className="space-y-2">
                      {previewData.acceptanceCriteria.map((criteria, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Minus className="h-4 w-4 text-slate-600 mt-0.5 flex-shrink-0" />
                          <span>{criteria}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>


              </>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}