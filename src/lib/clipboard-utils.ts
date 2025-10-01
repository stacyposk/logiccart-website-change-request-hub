/**
 * Cross-browser clipboard utility with HTTP fallback
 * Works on both HTTPS (localhost, CloudFront) and HTTP (S3 website)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern Clipboard API (requires HTTPS or localhost)
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (error) {
    console.warn('Clipboard API failed, trying fallback:', error)
  }

  // Fallback for HTTP contexts (S3 website)
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    textArea.style.opacity = '0'
    
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    return success
  } catch (error) {
    console.error('Fallback copy failed:', error)
    return false
  }
}

/**
 * Format acceptance criteria for developer handoff
 */
export function formatAcceptanceCriteria(
  criteria: string[],
  metadata: {
    changeType: string
    pageArea: string
    ticketId?: string
  }
): string {
  return [
    '# Acceptance Criteria',
    '',
    ...criteria.map((criterion, index) => `${index + 1}. ${criterion}`),
    '',
    '---',
    `Generated from: ${metadata.changeType} request for ${metadata.pageArea}`,
    `Request ID: ${metadata.ticketId || Date.now()}`,
    `Generated on: ${new Date().toLocaleDateString()}`
  ].join('\n')
}