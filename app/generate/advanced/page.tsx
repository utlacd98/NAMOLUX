import { redirect } from "next/navigation"

// The "advanced" generator is now the default. Redirect to /generate.
export default function GenerateAdvancedPage() {
  redirect("/generate")
}
