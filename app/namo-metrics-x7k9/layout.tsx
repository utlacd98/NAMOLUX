import type { Metadata } from "next"
import type { ReactNode } from "react"
import { notFound, redirect } from "next/navigation"
import { getAdminAuthorization } from "@/lib/admin-auth"

export const metadata: Metadata = {
  title: "NamoLux Decision Metrics",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default async function MetricsLayout({ children }: { children: ReactNode }) {
  const authorization = await getAdminAuthorization()
  if (authorization.status === "anonymous") {
    redirect("/sign-in?next=/namo-metrics-x7k9")
  }
  if (authorization.status !== "authorized") notFound()
  return children
}
