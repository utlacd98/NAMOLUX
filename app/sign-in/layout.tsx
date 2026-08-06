import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Sign In | NamoLux",
  description: "Sign in to your NamoLux account to save shortlist decisions and access your Pro workspace.",
  alternates: {
    canonical: "/sign-in",
  },
}

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children
}
