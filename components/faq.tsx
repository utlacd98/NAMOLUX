"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "What is a credit?",
    answer:
      "A credit is used each time we check if a domain name is available. When AI suggests names, we automatically verify .com availability—each check costs 1 credit.",
  },
  {
    question: "Do credits expire?",
    answer:
      "No, your credits never expire. Buy once and use them whenever you need, whether that's tomorrow or next year.",
  },
  {
    question: "Do I spend credits when I chat?",
    answer:
      "No, chatting and brainstorming with AI is free. You only spend credits when we verify domain availability for the suggested names.",
  },
  {
    question: "How do you check availability?",
    answer:
      "We use real-time WHOIS lookups and registrar APIs to verify domain availability. Results are best-effort and may vary slightly by registrar—we recommend confirming with your preferred registrar before purchasing.",
  },
  {
    question: "Can I export my shortlist?",
    answer:
      "Yes! All paid packs include export functionality. Starter includes CSV export, while Pro and Agency packs support Notion, Airtable, and additional formats.",
  },
  {
    question: "Do you support other TLDs?",
    answer:
      "Currently we focus on .com domains as they're the most valuable for brand recognition. We're working on adding .io, .co, and .ai support soon.",
  },
]

export function FAQ() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="faq" className="bg-muted/30 py-24" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 id="faq-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Everything you need to know about NamoLux.</p>
        </div>

        <div
          ref={ref}
          className={cn("mt-12 opacity-0", isVisible && "animate-fade-up")}
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
