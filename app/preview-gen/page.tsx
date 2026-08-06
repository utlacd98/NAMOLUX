import { Suspense } from "react"
import { headers } from "next/headers"
import { permanentRedirect } from "next/navigation"
import { GenerateNames } from "@/components/generate-names-premium"
import { isGeneratorLabRequestAllowed } from "@/lib/generator-lab"

export const metadata = {
  title: "Name Generator — Test Environment",
  robots: { index: false, follow: false },
}

export default async function TestGeneratePage() {
  const requestHeaders = await headers()
  if (!isGeneratorLabRequestAllowed(requestHeaders.get("host"))) {
    permanentRedirect("/bulk-domain-check")
  }
  return (
    <div>
      <div className="py-2 text-center text-xs font-semibold tracking-widest" style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}>
        ⚠️ TEST ENVIRONMENT — not linked in production nav
      </div>
      <Suspense fallback={null}>
        <GenerateNames />
      </Suspense>
    </div>
  )
}
