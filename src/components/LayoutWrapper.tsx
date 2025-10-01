'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { MobileOverlay } from '@/components/MobileOverlay'
import { MainContent } from '@/components/MainContent'

interface LayoutWrapperProps {
  children: ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  
  // Check if current path is an auth page
  const isAuthPage = pathname?.startsWith('/auth')
  
  if (isAuthPage) {
    // For auth pages, return minimal layout without sidebar, header, navigation
    return <>{children}</>
  }
  
  // For all other pages, return full layout with sidebar and header
  return (
    <>
      {/* Mobile sidebar toggle checkbox */}
      <input id="nav-toggle" type="checkbox" className="peer hidden" />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Mobile overlay */}
      <MobileOverlay />
      
      {/* Top header */}
      <Header />
      
      {/* Main content with dynamic padding */}
      <MainContent>
        {children}
      </MainContent>
    </>
  )
}