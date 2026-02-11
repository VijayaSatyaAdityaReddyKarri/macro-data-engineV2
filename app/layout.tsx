import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Macro Data Engine',
  description: 'Financial Analytics Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}