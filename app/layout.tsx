import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Rich S. Ferrera — Senior Product Leader | Platforms, Identity & AI',
  description:
    'Senior product leader with 15+ years building connected platforms across identity, data, consent, interoperability, and developer capabilities in healthcare, financial services, and SaaS.',
  generator: 'v0.app',
  openGraph: {
    title: 'Rich S. Ferrera — Senior Product Leader',
    description:
      'Building connected platforms that turn fragmented identity, data, consent, and developer capabilities into reusable enterprise ecosystems.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#2b2f36',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
