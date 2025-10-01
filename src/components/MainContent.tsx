'use client'

import { useSidebar } from '@/contexts/SidebarContext'

interface MainContentProps {
  children: React.ReactNode
}

export function MainContent({ children }: MainContentProps) {
  const { isCollapsed } = useSidebar()

  return (
    <main className={`pt-[72px] transition-all duration-300 ease-out ${
      isCollapsed ? 'md:pl-20' : 'md:pl-72'
    }`}>
      {children}
    </main>
  )
}