import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Reveal, SectionHeader } from "@/components/landing/reveal"
import { PUBLIC_PRODUCT_COPY } from "@/lib/site-content"

const faqs = [
  {
    question: "What is NamoLux?",
    answer:
      "NamoLux is a name decision workspace for solo founders. Bring candidate names from any source, check them across six domain extensions, and use Founder Signal to compare the strongest options.",
  },
  {
    question: "What is Founder Signal?",
    answer:
      "Founder Signal v2 is our 0-100 comparison system. It weighs strategic fit, distinctiveness, memorability, pronunciation, spelling and character, brand collision risk, and domain strength so founders can compare eligible names with evidence.",
  },
  {
    question: "What do I get for free?",
    answer:
      "The free plan includes 3 Bulk Check runs per UTC calendar month. Each Bulk Check can include up to 50 candidate names across six domain extensions. Founder Signal is available with Pro.",
  },
  {
    question: "Is there a paid plan?",
    answer:
      `Yes. Pro is GBP 9.99 per month or GBP 69 per year and includes ${PUBLIC_PRODUCT_COPY.proPlanSummary.toLowerCase()} It also adds saved projects, CSV exports, shareable decision reports, and an ad-free workspace. There is no free trial.`,
  },
  {
    question: "How does NamoLux make money?",
    answer:
      "NamoLux is funded by paid subscriptions and may also earn a commission when users register domains through our Namecheap partner link.",
  },
  {
    question: "Do I have to come with my own names?",
    answer:
      "Yes. NamoLux is built to help you decide between candidate names you already have—from your team, an agency, a workshop, or another tool. Paste up to 50 names into Bulk Check to start.",
  },
  {
    question: "How do you check availability?",
    answer:
      "We use real-time DNS lookups and RDAP queries across .com, .io, .co, .ai, .app and .dev. Results are best-effort and may vary slightly by registrar, so confirm availability with the registrar before you purchase.",
  },
  {
    question: "Which TLDs do you support?",
    answer:
      ".com, .io, .co, .ai, .app and .dev. We prioritise .com because it remains the strongest trust signal, but every supported TLD is scored and checked in the same batch.",
  },
  {
    question: "Can I export my shortlist?",
    answer:
      "Pro includes saved projects, CSV exports, and shareable decision reports for registrar handoff and a clear record of the final choice.",
  },
]

export function FAQ() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <section id="faq" className="overflow-clip bg-muted/20 py-16 sm:py-24 lg:py-32" aria-labelledby="faq-heading">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="Questions"
          headingId="faq-heading"
          heading="Frequently asked questions"
          sub="Everything you need to know about NamoLux."
        />

        <Reveal delay={0.1} className="mt-12">
          <Accordion
            type="single"
            collapsible
            className="w-full rounded-2xl border border-border/60 bg-card/30 px-5 sm:px-7"
          >
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border/60 last:border-b-0">
                <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
