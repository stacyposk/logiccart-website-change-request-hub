'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  FilePlus2, 
  Palette,
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSidebar } from '@/contexts/SidebarContext'

export function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, setIsCollapsed } = useSidebar()

  // Helper function to determine if a navigation item is active
  const isActive = (href: string) => {
    // Normalize pathnames by removing trailing slashes for comparison
    const normalizedPathname = pathname.replace(/\/$/, '') || '/'
    const normalizedHref = href.replace(/\/$/, '') || '/'
    
    if (normalizedHref === '/dashboard') {
      return normalizedPathname === '/dashboard' || normalizedPathname === '/dashboard/'
    }
    if (normalizedHref === '/') {
      return normalizedPathname === '/'
    }
    return normalizedPathname === normalizedHref
  }

  // Helper function to get navigation item classes
  const getNavItemClasses = (href: string) => {
    const baseClasses = isCollapsed 
      ? "flex items-center justify-center rounded-sm p-2.5 text-base transition-colors font-plus-jakarta-sans"
      : "flex items-center gap-3 rounded-sm px-3 py-2.5 text-base transition-colors font-plus-jakarta-sans"
    
    if (isActive(href)) {
      return `${baseClasses} sidebar-nav-active`
    }
    
    return `${baseClasses} text-slate-700 hover:text-slate-900 hover:bg-primary/5`
  }

  // Debug logging (after function declarations)
  const normalizedPathname = pathname.replace(/\/$/, '') || '/'
  console.log('Current pathname:', pathname)
  console.log('Normalized pathname:', normalizedPathname)
  console.log('Dashboard active:', isActive('/dashboard'))
  console.log('Sidebar collapsed:', isCollapsed)



  return (
    <aside className={`fixed inset-y-0 left-0 z-40 ${isCollapsed ? 'w-20' : 'w-72'} -translate-x-full border-r border-slate-200 bg-white/90 backdrop-blur-md shadow-sm transition-all duration-300 ease-out peer-checked:translate-x-0 md:translate-x-0 flex flex-col`}>
      {/* Sidebar Header */}
      <div className={`flex items-center h-[56px] border-b border-slate-200 ${isCollapsed ? 'justify-center px-3' : 'gap-3 pl-7 pr-4'}`}>
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Expand sidebar"
          >
            <img 
              src="/favicon.png" 
              alt="LogicCart" 
              className="h-8 w-8"
            />
          </button>
        ) : (
          <img 
            src="/logo.png" 
            alt="LogicCart" 
            className="h-10 w-auto"
          />
        )}
        
        {/* Toggle Button */}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md hover:bg-slate-100 transition-colors ml-auto"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </button>
        )}
      </div>



      {/* Navigation Menu */}
      <nav className={`flex flex-col gap-1 pt-4 px-4 pb-4 flex-1 ${isCollapsed ? 'items-center' : ''}`}>
        {/* Dashboard */}
        <Link
          href="/dashboard/"
          className={`${getNavItemClasses('/dashboard')} ${isCollapsed ? 'sidebar-collapsed-item' : ''}`}
          title={isCollapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard 
            className={`h-4.5 w-4.5 ${isActive('/dashboard') ? 'text-primary' : 'text-slate-600'}`}
          />
          {!isCollapsed && 'Dashboard'}
        </Link>

        {/* Submit Request */}
        <Link
          href="/"
          className={`${getNavItemClasses('/')} ${isCollapsed ? 'sidebar-collapsed-item' : ''}`}
          title={isCollapsed ? 'Submit Request' : undefined}
        >
          <FilePlus2 
            className={`h-4.5 w-4.5 ${isActive('/') ? 'text-primary' : 'text-slate-600'}`}
          />
          {!isCollapsed && 'Submit Request'}
        </Link>

        {/* Brand Assets */}
        <a
          href="#"
          className={`${getNavItemClasses('#')} ${isCollapsed ? 'sidebar-collapsed-item' : ''}`}
          title={isCollapsed ? 'Brand Assets' : undefined}
        >
          <Palette 
            className={`h-4.5 w-4.5 ${isActive('#') ? 'text-primary' : 'text-slate-600'}`}
          />
          {!isCollapsed && 'Brand Assets'}
        </a>

        {/* Design System */}
        <a
          href="#"
          className={`${getNavItemClasses('#')} ${isCollapsed ? 'sidebar-collapsed-item' : ''}`}
          title={isCollapsed ? 'Design System' : undefined}
        >
          <BookOpen 
            className={`h-4.5 w-4.5 ${isActive('#') ? 'text-primary' : 'text-slate-600'}`}
          />
          {!isCollapsed && 'Design System'}
        </a>

        {/* Documentation */}
        <a
          href="#"
          className={`${getNavItemClasses('#')} ${isCollapsed ? 'sidebar-collapsed-item' : ''}`}
          title={isCollapsed ? 'Documentation' : undefined}
        >
          <FileText 
            className={`h-4.5 w-4.5 ${isActive('#') ? 'text-primary' : 'text-slate-600'}`}
          />
          {!isCollapsed && 'Documentation'}
        </a>

      </nav>

      {/* User Profile Section */}
      <div className="border-t border-slate-200 p-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5`}>
          {/* User Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src="/avatar.jpg" 
              alt="Marketing Team Avatar"
            />
            <AvatarFallback className="bg-[#5754FF] text-white font-medium">
              MT
            </AvatarFallback>
          </Avatar>
          
          {/* User Info - Hidden when collapsed */}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                Marketing
              </p>
              <p className="text-xs text-slate-500 truncate">
                marketing@logiccart.com
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}