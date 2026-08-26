import { SiteNav } from '@/components/site-nav'
import { Hero } from '@/components/hero'
import { CaseStudies } from '@/components/case-studies'
import { About } from '@/components/about'
import { Contact } from '@/components/contact'
import { SiteFooter } from '@/components/site-footer'

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <SiteNav />
      <Hero />
      <CaseStudies />
      <About />
      <Contact />
      <SiteFooter />
    </main>
  )
}
