import { Suspense } from "react"
import { GenerateNames } from "@/components/generate-names"

export const metadata = {
  title: "Name Generator — Test Environment",
  robots: { index: false, follow: false },
}

export default function TestGeneratePage() {
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
