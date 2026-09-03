import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Outfit } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "OpenPlay — Find youth sports near you",
    template: "%s | OpenPlay",
  },
  description:
    "OpenPlay is a free, open directory of youth sports programs, registration dates, and deadlines for families in central Vermont.",
  generator: "v0.app",
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  keywords: [
    "youth sports",
    "youth sports registration",
    "Montpelier VT youth sports",
    "youth soccer registration",
    "middle school sports",
  ],
  openGraph: {
    title: "OpenPlay — Find something to play",
    description:
      "Search youth sports programs, registration windows, and deadlines across your community in one place.",
    type: "website",
    images: [{ url: "/og-openplay.png", width: 1200, height: 630, alt: "OpenPlay" }],
  },
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/openplay-icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#151824" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${inter.variable} ${outfit.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
        <Toaster position="top-center" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
