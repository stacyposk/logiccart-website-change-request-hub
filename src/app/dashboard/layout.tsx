import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | LogicCart Website Change Request Hub',
  description: 'View request statistics, recent requests, and system updates',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}