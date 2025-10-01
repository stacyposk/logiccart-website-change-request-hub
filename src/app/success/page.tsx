'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { getEmailConfirmationMessage } from '@/lib/utils'
import { AIRecap } from '@/components/AIRecap'


function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const [ticketId, setTicketId] = useState<string>('DEMO-1234')
  const [submissionDate, setSubmissionDate] = useState<string>('')
  const [confirmationMessage, setConfirmationMessage] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [aiSummary, setAISummary] = useState<string>('')
  const [isNavigating, setIsNavigating] = useState<boolean>(false)

  useEffect(() => {
    // Preload background image for faster loading
    const img = new Image()
    img.src = '/bg-gradient.jpg'
    
    // Focus the heading for accessibility
    if (headingRef.current) {
      headingRef.current.focus()
    }

    // Get submission data from sessionStorage (primary source)
    try {
      const submissionData = sessionStorage.getItem('ticketSubmission')
      if (submissionData) {
        const data = JSON.parse(submissionData)
        
        // Set ticket ID from sessionStorage
        if (data.ticket_id) {
          setTicketId(data.ticket_id)
        }
        
        if (data.submitted_at) {
          const date = new Date(data.submitted_at)
          setSubmissionDate(date.toLocaleDateString())
        }
        if (data.requester_email) {
          setUserEmail(data.requester_email)
        }
        if (data.ai_summary) {
          setAISummary(data.ai_summary)
        }
      }
    } catch (error) {
      console.error('Error reading submission data:', error)
    }

    // Fallback: Get ticket ID from query params if not in sessionStorage
    if (!ticketId || ticketId === 'DEMO-1234') {
      const queryTicketId = searchParams.get('ticket_id')
      if (queryTicketId) {
        setTicketId(queryTicketId)
      }
    }

    // Fallback to today's date if no submission date found
    if (!submissionDate) {
      setSubmissionDate(new Date().toLocaleDateString())
    }

    // Get personalized email confirmation message
    setConfirmationMessage(getEmailConfirmationMessage())
  }, [searchParams, submissionDate])

  const handleCreateAnother = () => {
    router.push('/')
  }

  const handleViewDashboard = () => {
    // Add loading state and force refresh parameter
    setIsNavigating(true)
    router.push(`/dashboard?ticketId=${ticketId}&scroll=true&forceRefresh=true`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 success-page-bg">
      {/* Glass Card Container - Glassmorphism effect with increased top margin */}
      <Card className="w-full max-w-xl bg-white shadow-lg hover-glow mt-8">
        <CardContent className="p-8 space-y-6">
          {/* Success Icon and Title */}
          <div className="mb-6 flex items-center gap-4">
            {/* Large check icon with gradient background */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5e60f1 20%, #eb8650 60%, #e5ae8d 90%)' }}>
              <Check className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-3xl font-bold outline-none text-left"
            >
              Request Submitted
            </h1>
          </div>

          <div className="space-y-1 text-left">
            <h2 className="text-lg font-semibold">
              Request ID: <span className="text-primary">{ticketId}</span>
            </h2>
            <div className="text-sm text-muted-foreground">
              Submitted on: {submissionDate}
            </div>
          </div>

          {/* AI Summary Section - positioned after submission details, before confirmation message */}
          {aiSummary && (
            <div className="pt-2">
              <AIRecap summary={aiSummary} />
            </div>
          )}

          <div className="space-y-2 text-left">
            <p className="text-base text-muted-foreground">
              Your change request was submitted successfully.
            </p>
            {confirmationMessage && (
              <p className="text-base text-muted-foreground">
                {confirmationMessage}
              </p>
            )}
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleCreateAnother}
              variant="outline"
              className="w-full sm:flex-1 text-sm border bg-white shadow-sm transition focus:outline-none hover:bg-[rgba(87,84,255,0.05)]"
              size="lg"
              style={{
                color: '#5754FF',
                borderColor: '#5754FF'
              }}
            >
              Create Another Request
            </Button>
            <Button
              onClick={handleViewDashboard}
              className="w-full sm:flex-1 text-sm"
              size="lg"
              disabled={isNavigating}
            >
              {isNavigating ? 'Loading Dashboard...' : 'View on Dashboard'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-lg text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4">
              <div className="success-icon-gradient">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="success-gradient-loading" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(241, 100%, 66%)" />
                      <stop offset="50%" stopColor="#7e72f7" />
                      <stop offset="100%" stopColor="#b290f7" />
                    </linearGradient>
                  </defs>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="url(#success-gradient-loading)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="m9 11 3 3L22 4" stroke="url(#success-gradient-loading)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Loading...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}