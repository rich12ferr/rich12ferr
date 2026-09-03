import { ContactForm } from "@/components/contact-form"

export const metadata = {
  title: "Contact us",
  description: "Questions, corrections, or feedback about OpenPlay? Send us a message.",
}

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Contact us</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Questions about a listing, a correction to make, or feedback on the directory itself &mdash;
          we read every message. You do not need an account to reach us.
        </p>
      </header>

      <ContactForm />
    </div>
  )
}
