export interface ResultCardInput {
  fullDomain: string
  whyItWorks?: string
  meaningBreakdown?: string
  meaningScore?: number
  brandableScore?: number
  pronounceable?: boolean
  available?: boolean
}

export interface ResultCardView {
  title: string
  whyItWorks: string
  meaningBreakdown: string
  badges: string[]
}

export function buildResultCardView(input: ResultCardInput): ResultCardView {
  const whyItWorks = input.whyItWorks || "Built from clear fragments with a strong brand signal."
  const meaningBreakdown = input.meaningBreakdown || "Meaning breakdown unavailable."

  const badges = [
    `Meaning ${Math.round(input.meaningScore || 0)}`,
    `Brandable ${Number(input.brandableScore || 0).toFixed(1)}/10`,
    input.pronounceable ? "Pronounceable" : "Review",
    input.available === false ? "Taken" : "Available",
  ]

  return {
    title: input.fullDomain,
    whyItWorks,
    meaningBreakdown,
    badges,
  }
}
