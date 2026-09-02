/**
 * Temporary private-preview boundary for Name Sprint.
 *
 * Keep this check server-side and base it only on the email returned by
 * Supabase Auth's verified `getUser()` response. Do not authorize from client
 * state or user-editable metadata.
 */
const NAME_SPRINT_PREVIEW_EMAILS = new Set([
  "utlacd98@gmail.com",
])

export function isNameSprintPreviewUser(user: { email?: string | null } | null | undefined) {
  const email = user?.email?.trim().toLowerCase()
  return Boolean(email && NAME_SPRINT_PREVIEW_EMAILS.has(email))
}

export const NAME_SPRINT_COMING_SOON_MESSAGE =
  "Name Sprint is in private quality testing. Public access is coming soon."
