import type { Metadata } from 'next'
import { Jost, Montserrat } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-jost',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'slam.fit',
  description: 'Role-aware collaborative scheduling for broadcast teams.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jost.variable} ${montserrat.variable}`}>
      <body className="bg-dse-navy text-dse-beige antialiased">
        {children}
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  )
}
