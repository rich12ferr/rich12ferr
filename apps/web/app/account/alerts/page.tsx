import { ManageAlerts } from "@/components/manage-alerts"
import { parentAlerts } from "@/lib/data/moderation"

export const metadata = { title: "Your alerts" }

export default function AccountAlertsPage() {
  return <ManageAlerts alerts={parentAlerts} />
}
