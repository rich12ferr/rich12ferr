import { AdminNav } from "@/components/admin-nav"
import { AdminSignOutButton } from "@/components/admin-sign-out-button"
import { requireAdminPage } from "@/lib/require-admin"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Administration
            </p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin console</h1>
          </div>
          <AdminSignOutButton email={session.user.email} />
        </div>
      </header>
      <AdminNav />
      <div className="mt-8">{children}</div>
    </div>
  )
}
