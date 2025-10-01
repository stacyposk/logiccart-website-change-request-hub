import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// Configure Plus Jakarta Sans font for headings and UI elements
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
})
import { Toaster } from '@/components/ui/toaster'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { LayoutWrapper } from '@/components/LayoutWrapper'
import { APIErrorBoundary } from '@/components/APIErrorBoundary'

// Geist font is imported directly and doesn't need configuration

export const metadata: Metadata = {
  title: 'LogicCart Website Change Request Hub | Powered by Smart AI Agent',
  description: 'Submit change requests for e-commerce website updates',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="preload" href="/bg-gradient.jpg" as="image" />
      </head>
      <body className={`${GeistSans.className} ${plusJakartaSans.variable} min-h-screen page-background text-slate-800 antialiased`}>
        <APIErrorBoundary>
          <SidebarProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
            
            <Toaster />
          </SidebarProvider>
        </APIErrorBoundary>
      </body>
    </html>
  )
}