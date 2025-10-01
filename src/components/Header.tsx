'use client'

import { usePathname } from 'next/navigation'
import { Menu, HelpCircle, Settings, Search, X, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'

export function Header() {
  const pathname = usePathname()
  const { isCollapsed } = useSidebar()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  
  // Set title based on pathname
  let title = ''
  
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    title = 'Dashboard'
  } else if (pathname === '/') {
    title = '' // Remove title for Submit Request page
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement search functionality
    console.log('Search query:', searchQuery)
    setIsMobileSearchOpen(false) // Close mobile search after submit
  }

  const handleMobileSearchToggle = () => {
    setIsMobileSearchOpen(!isMobileSearchOpen)
  }

  // Close mobile search on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileSearchOpen(false)
      }
    }

    if (isMobileSearchOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isMobileSearchOpen])

  return (
    <header className={`fixed top-0 left-0 right-0 z-30 h-[56px] border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm transition-all duration-300 ease-out ${
      isCollapsed ? 'md:pl-20' : 'md:pl-72'
    }`}>
      <div className="relative h-full py-1">
        {/* Main header content */}
        <div className="flex h-full items-center justify-between px-4 md:pr-8 md:pl-8">
          {/* Left side - Mobile menu button + Desktop title */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Mobile menu button */}
            <label
              htmlFor="nav-toggle"
              className="flex h-10 w-10 cursor-pointer items-center justify-center hover:bg-slate-50 transition-colors md:hidden -ml-2"
            >
              <Menu className="h-5 w-5 text-slate-600" />
            </label>

            {/* Page title - hidden on mobile, visible on desktop */}
            <h1 key={pathname} className="hidden md:block text-lg md:text-xl font-semibold text-slate-900 truncate">
              {title}
            </h1>
          </div>

          {/* Center - Mobile favicon */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 md:hidden">
            <img 
              src="/favicon.png" 
              alt="LogicCart" 
              className="h-8 w-8"
            />
          </div>

          {/* Right side - Search button (mobile) + Auth status + Notification, Help and Settings buttons */}
          <div className="flex items-center gap-3">
            {/* Mobile search button */}
            <button 
              onClick={handleMobileSearchToggle}
              className="flex sm:hidden h-10 w-10 items-center justify-center hover:bg-slate-50 transition-colors -mr-2"
            >
              <Search className="h-5 w-5 text-slate-600" />
            </button>
            

            
            {/* Desktop icon group with reduced spacing */}
            <div className="hidden md:flex items-center gap-1">
              {/* Notification bell button */}
              <button className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-slate-50 transition-colors">
                <Bell className="h-5 w-5 text-slate-600" />
              </button>
              
              {/* Help button */}
              <button className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-slate-50 transition-colors">
                <HelpCircle className="h-5 w-5 text-slate-600" />
              </button>
              
              {/* Settings button */}
              <button className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-slate-50 transition-colors">
                <Settings className="h-5 w-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Search bar positioned to align with header spacing (hidden on mobile) */}
        <div className="hidden sm:block absolute top-1/2 transform -translate-y-1/2 left-0 right-0">
          <div className="px-4 md:px-8">
            <form onSubmit={handleSearch} className="relative max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-600" />
                <input
                  type="text"
                  placeholder="Search requests or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-10 px-8 text-sm bg-white border border-slate-200 rounded-full focus:outline-none placeholder:text-slate-400 transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(87,84,255,0.1),0_0_0_1px_rgba(87,84,255,0.2)]"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm sm:hidden">
          <div className="bg-white border-b border-slate-200 p-4">
            <form onSubmit={handleSearch} className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-600" />
                <input
                  type="text"
                  placeholder="Search requests or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 px-8 text-base bg-white border border-slate-200 rounded-full focus:outline-none placeholder:text-slate-400 transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(87,84,255,0.1),0_0_0_1px_rgba(87,84,255,0.2)]"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleMobileSearchToggle}
                className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}