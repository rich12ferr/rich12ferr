import { AccountNav } from "@/components/account-nav"

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Your account</h1>
        <p className="text-sm text-muted-foreground">Signed in as parent@example.com</p>
      </header>
      <AccountNav />
      <div className="mt-8">{children}</div>
    </div>
  )
}
