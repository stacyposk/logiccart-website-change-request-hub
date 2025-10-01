import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retrieves email from session storage and generates personalized confirmation message
 * @returns Personalized confirmation message with email or fallback message
 */
export function getEmailConfirmationMessage(): string {
  try {
    const submissionData = sessionStorage.getItem('ticketSubmission')
    if (submissionData) {
      const data = JSON.parse(submissionData)
      if (data.requester_email && typeof data.requester_email === 'string' && data.requester_email.trim()) {
        // Basic email validation to ensure it's not malformed
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (emailRegex.test(data.requester_email.trim())) {
          return `We've sent a confirmation email with results to ${data.requester_email.trim()}.`
        }
      }
    }
  } catch (error) {
    console.error('Error reading email from session storage:', error)
  }
  
  // Fallback to generic message
  return "You'll receive a confirmation email with the results"
}