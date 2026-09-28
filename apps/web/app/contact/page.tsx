import { ContactForm } from "@/components/contact-form"
import { InstagramLink } from "@/components/instagram-link"

export const metadata = {
  title: "Contact us",
  description: "Questions, corrections, or feedback about Sign Up Vermont? Send us a message.",
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

      <section
        aria-labelledby="follow-us-heading"
        className="mt-10 flex flex-col gap-2 border-t border-border pt-6"
      >
        <h2 id="follow-us-heading" className="font-display text-lg font-bold tracking-tight">
          Follow along
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Registration reminders and new activities, posted on Instagram.
        </p>
        <InstagramLink className="text-base" />
      </section>
    </div>
  )
}
