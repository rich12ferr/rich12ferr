import type { ReportCategory } from "@/lib/types"

/**
 * Shared by the parent-facing report dialog and the admin report queue so a
 * category never reads one way when filed and another way when reviewed.
 */
export const reportCategories: { value: ReportCategory; label: string }[] = [
  { value: "registration_link_broken", label: "Registration link is broken" },
  { value: "registration_closed", label: "Registration is already closed" },
  { value: "wrong_date", label: "Dates are wrong" },
  { value: "wrong_age", label: "Age range is wrong" },
  { value: "wrong_grade", label: "Grade range is wrong" },
  { value: "wrong_cost", label: "Cost is wrong" },
  { value: "program_no_longer_exists", label: "This program no longer exists" },
  { value: "duplicate_activity", label: "This is a duplicate listing" },
  { value: "other", label: "Something else" },
  { value: "general_inquiry", label: "General question" },
]

export const reportCategoryLabels = Object.fromEntries(
  reportCategories.map((c) => [c.value, c.label]),
) as Record<ReportCategory, string>
