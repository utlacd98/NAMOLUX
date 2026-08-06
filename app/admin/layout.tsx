import type { Metadata } from "next"
import type { ReactNode } from "react"
import { notFound, redirect } from "next/navigation"
import { getAdminAuthorization } from "@/lib/admin-auth"

const ADMIN_ENTRY_PATH = "/admin/social-generator"

export const metadata: Metadata = {
  title: "NamoLux Admin",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authorization = await getAdminAuthorization()
  if (authorization.status === "anonymous") {
    redirect(`/sign-in?redirect=${encodeURIComponent(ADMIN_ENTRY_PATH)}`)
  }
  if (authorization.status !== "authorized") notFound()
  return children
}
