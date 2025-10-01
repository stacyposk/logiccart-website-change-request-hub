/**
 * Date utility functions for dashboard month handling
 * Provides month logic for automatic updates and month selection
 */

/**
 * Get the current month in "MMM YYYY" format (e.g., "Sep 2025")
 * @returns Current month string
 */
export const getCurrentMonth = (): string => {
  const now = new Date()
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  return `${monthNames[now.getMonth()]} ${now.getFullYear()}`
}

/**
 * Get available months for selection (current month and previous months back to Sep 2025)
 * @returns Array of month strings in "MMM YYYY" format
 */
export const getAvailableMonths = (): string[] => {
  const current = new Date()
  const months: string[] = []
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  // Starting month: September 2025
  const startDate = new Date(2025, 8) // Month is 0-indexed, so 8 = September
  
  // Add current month first
  months.push(getCurrentMonth())
  
  // Add previous months back to Sep 2025
  let iterDate = new Date(current)
  
  while (iterDate > startDate) {
    iterDate.setMonth(iterDate.getMonth() - 1)
    if (iterDate >= startDate) {
      const monthStr = `${monthNames[iterDate.getMonth()]} ${iterDate.getFullYear()}`
      // Avoid duplicates (in case current month is already added)
      if (!months.includes(monthStr)) {
        months.push(monthStr)
      }
    }
  }
  
  return months
}

/**
 * Format a date object to "MMM YYYY" format
 * @param date - Date object to format
 * @returns Formatted month string
 */
export const formatMonth = (date: Date): string => {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
}

/**
 * Parse a month string ("MMM YYYY") back to a Date object
 * @param monthStr - Month string in "MMM YYYY" format
 * @returns Date object set to the first day of the month
 */
export const parseMonth = (monthStr: string): Date => {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  const [monthName, yearStr] = monthStr.split(' ')
  const monthIndex = monthNames.indexOf(monthName)
  const year = parseInt(yearStr, 10)
  
  if (monthIndex === -1 || isNaN(year)) {
    throw new Error(`Invalid month string: ${monthStr}`)
  }
  
  // Create date in UTC to avoid timezone issues
  const date = new Date(year, monthIndex, 1)
  return date
}

/**
 * Check if automatic month update is needed
 * Compares current month with a given month string
 * @param currentSelection - Currently selected month string
 * @returns True if update is needed (current month has changed)
 */
export const shouldUpdateMonth = (currentSelection: string): boolean => {
  const actualCurrentMonth = getCurrentMonth()
  return actualCurrentMonth !== currentSelection
}

/**
 * Get the starting month for the application (Sep 2025)
 * @returns Starting month string
 */
export const getStartingMonth = (): string => {
  return 'Sep 2025'
}

/**
 * Check if a month is the starting month
 * @param monthStr - Month string to check
 * @returns True if it's the starting month
 */
export const isStartingMonth = (monthStr: string): boolean => {
  return monthStr === getStartingMonth()
}

/**
 * Get months between two month strings (inclusive)
 * @param startMonth - Start month in "MMM YYYY" format
 * @param endMonth - End month in "MMM YYYY" format
 * @returns Array of month strings between start and end
 */
export const getMonthsBetween = (startMonth: string, endMonth: string): string[] => {
  const start = parseMonth(startMonth)
  const end = parseMonth(endMonth)
  const months: string[] = []
  
  const current = new Date(start.getTime())
  while (current <= end) {
    months.push(formatMonth(current))
    current.setMonth(current.getMonth() + 1)
  }
  
  return months
}