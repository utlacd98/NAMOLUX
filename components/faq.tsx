"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "Is NamoLux really free?",
    answer:
      "Yes! NamoLux is completely free to use. Generate unlimited AI-powered domain name suggestions and check availability without any cost or account required.",
  },
  {
    question: "How does the AI generate names?",
    answer:
      "Enter a keyword or describe your brand, select a vibe (Luxury, Futuristic, Playful, etc.), and our AI generates creative, brandable domain names tailored to your vision.",
  },
  {
    question: "How do you check availability?",
    answer:
      "We use real-time DNS lookups to verify domain availability. Results are best-effort and may vary slightly by registrar—we recommend confirming with your preferred registrar before purchasing.",
  },
  {
    question: "Can I export my shortlist?",
    answer:
      "Yes! Save your favorite domains to a shortlist and export them to CSV with a single click. Perfect for sharing with your team or tracking your options.",
  },
  {
    question: "Do you support other TLDs?",
    answer:
      "We currently support .com, .io, .co, .ai, and .net domains. We prioritize .com as it's the most valuable for brand recognition, but you can filter results by any supported TLD.",
  },
  {
    question: "What is Bulk Check mode?",
    answer:
      "Bulk Check lets you paste a list of domain names and check their availability all at once—perfect if you already have ideas in mind and want to quickly verify which are available.",
  },
]

export function FAQ() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="faq" className="overflow-clip bg-muted/30 py-16 sm:py-24" aria-labelledby="faq-heading">
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
