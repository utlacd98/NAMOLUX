import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Create Account | NamoLux",
  description: "Create a NamoLux account to save shortlist decisions and access the Pro decision workspace.",
  alternates: {
    canonical: "/sign-up",
  },
}

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children
}
