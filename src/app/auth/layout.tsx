import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  // This layout ensures auth pages have NO sidebar, header, or navigation
  // It provides a minimal full-screen layout for authentication flows
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  )
}