import { headers } from "next/headers"
import { permanentRedirect, redirect } from "next/navigation"
import { parseContentSlug, parseGeneratorSource } from "@/lib/generator-attribution"
import { isGeneratorLabRequestAllowed } from "@/lib/generator-lab"

type GenerateAdvancedPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

// Keep legacy Advanced links working without losing their safe journey context.
export default async function GenerateAdvancedPage({ searchParams }: GenerateAdvancedPageProps) {
  const requestHeaders = await headers()
  if (!isGeneratorLabRequestAllowed(requestHeaders.get("host"))) {
    permanentRedirect("/bulk-domain-check")
  }
  const params = await searchParams
  const rawBrief = params?.q
  const brief = (Array.isArray(rawBrief) ? rawBrief[0] : rawBrief || "").trim().slice(0, 1000)
  const source = parseGeneratorSource(params?.source)
  const content = parseContentSlug(params?.content)
  const destination = new URLSearchParams({ mode: "advanced" })
  if (brief) destination.set("q", brief)
  if (source) destination.set("source", source)
  if (content) destination.set("content", content)
  redirect(`/generate?${destination.toString()}`)
}
