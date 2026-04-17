import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "What is NamoLux?",
    answer:
      "NamoLux is a domain naming consultancy powered by Founder Signal™. You paste your candidate names — from any source — and we score each one on brand strength, memorability, phonetic punch, realness, and live availability across six TLDs. You get the analysis a brand consultant would run, delivered in seconds.",
  },
  {
    question: "What is Founder Signal™?",
    answer:
      "Founder Signal™ is our proprietary 0–100 brand scoring system. It weighs realness, memorability, brand risk, length, pronounceability, character quality, and TLD strength — plus context-agnostic originality penalties and elite-tier caps. A name scoring 95+ has earned it; most names sit between 70–85.",
  },
  {
    question: "What do I get with a free account?",
    answer:
      "Free accounts can check and score three shortlists. You get full Founder Signal™ analysis, live availability across six TLDs, and the full reasoning breakdown on every name. Perfect for validating a shortlist before you commit.",
  },
  {
    question: "What's included in NamoLux Pro?",
    answer:
      "Pro is a one-time payment of £15 — no subscription, no monthly fees. You get unlimited shortlist checks, bulk scoring up to 50 names at a time, the full brand consultant toolkit (stress tests, brand story, palette), and CSV export. Forever.",
  },
  {
    question: "Do I have to come with my own names?",
    answer:
      "The core product scores candidate names you already have — whether you wrote them yourself, got them from an AI tool, or paid a consultant. NamoLux is the independent judge. Many users combine it with AI name generators to filter for the ones actually worth pursuing.",
  },
  {
    question: "How do you check availability?",
    answer:
      "We use real-time DNS lookups and RDAP queries across .com, .io, .co, .ai, .app and .dev. Results are best-effort and may vary slightly by registrar — we recommend confirming at your preferred registrar before you purchase.",
  },
  {
    question: "Which TLDs do you support?",
    answer:
      ".com, .io, .co, .ai, .app and .dev. We prioritise .com since it remains the strongest trust signal, but every TLD is scored and verified in the same batch.",
  },
  {
    question: "Is this really a one-time payment?",
    answer:
      "Yes — £15 once, Pro access forever. No subscription, no auto-renewal, no hidden fees. Once you pay, your account is upgraded permanently.",
  },
  {
    question: "Can I export my shortlist?",
    answer:
      "Yes. Export the full scored shortlist as CSV in one click — with Founder Signal scores, availability for all six TLDs, and the reasoning for each name. Great for team sign-off.",
  },
]

export function FAQ() {
  return (
    <section id="faq" className="overflow-clip bg-muted/30 py-10 sm:py-16 lg:py-24" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 id="faq-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Everything you need to know about NamoLux.</p>
        </div>

        <div
          className={cn("mt-12 animate-fade-up")}
          style={{ animationFillMode: "forwards" }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
