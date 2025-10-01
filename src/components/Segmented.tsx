'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SegmentedOption {
  value: string
  label: string
}

interface SegmentedProps {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  name: string
  className?: string
  disabled?: boolean
}

const Segmented = React.forwardRef<HTMLDivElement, SegmentedProps>(
  ({ options, value, onChange, name, className, disabled = false }, ref) => {
    const [focusedIndex, setFocusedIndex] = React.useState<number>(-1)
    const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([])

    // Find the index of the currently selected value
    const selectedIndex = options.findIndex(option => option.value === value)

    const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault()
          const prevIndex = index > 0 ? index - 1 : options.length - 1
          setFocusedIndex(prevIndex)
          buttonRefs.current[prevIndex]?.focus()
          break
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault()
          const nextIndex = index < options.length - 1 ? index + 1 : 0
          setFocusedIndex(nextIndex)
          buttonRefs.current[nextIndex]?.focus()
          break
        case 'Home':
          event.preventDefault()
          setFocusedIndex(0)
          buttonRefs.current[0]?.focus()
          break
        case 'End':
          event.preventDefault()
          const lastIndex = options.length - 1
          setFocusedIndex(lastIndex)
          buttonRefs.current[lastIndex]?.focus()
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          if (!disabled) {
            onChange(options[index].value)
          }
          break
      }
    }

    const handleClick = (optionValue: string) => {
      if (!disabled) {
        onChange(optionValue)
      }
    }

    const handleFocus = (index: number) => {
      setFocusedIndex(index)
    }

    const handleBlur = () => {
      setFocusedIndex(-1)
    }

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label="Segmented control"
        className={cn(
          "inline-flex items-center rounded-md p-1",
          "bg-slate-100 border border-slate-200",
          "transition-all duration-200",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value
          const isFocused = focusedIndex === index
          const isFirst = index === 0
          const isLast = index === options.length - 1
          
          return (
            <button
              key={option.value}
              ref={el => { buttonRefs.current[index] = el }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              tabIndex={isSelected ? 0 : -1}
              disabled={disabled}
              onClick={() => handleClick(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => handleFocus(index)}
              onBlur={handleBlur}
              className={cn(
                // Base styles
                "relative px-4 py-2 min-h-[36px] flex-1",
                "text-sm font-medium transition-all duration-200",
                "focus:outline-none focus:z-10",
                
                // Rounded corners based on position
                isFirst && "rounded-l-md",
                isLast && "rounded-r-md",
                !isFirst && !isLast && "rounded-none",
                
                // Border between segments
                !isLast && "border-r border-slate-300",
                
                // Default state
                "text-slate-600 bg-transparent",
                "hover:text-slate-800 hover:bg-slate-50",
                
                // Selected state
                isSelected && [
                  "text-[#5754FF] bg-[#5754FF]/10 font-semibold",
                  "hover:text-[#5754FF] hover:bg-[#5754FF]/15",
                  "border-[#5754FF]/20",
                ],
                
                // Focus state
                isFocused && [
                  "ring-2 ring-[#5754FF]/50 ring-offset-1",
                ],
                
                // Disabled state
                disabled && [
                  "cursor-not-allowed opacity-50",
                  "hover:bg-transparent hover:text-slate-600",
                ]
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }
)

Segmented.displayName = 'Segmented'

export { Segmented }
export type { SegmentedProps, SegmentedOption }