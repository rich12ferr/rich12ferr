import { AdminNav } from "@/components/admin-nav"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Administration
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin console</h1>
      </header>
      <AdminNav />
      <div className="mt-8">{children}</div>
    </div>
  )
}
