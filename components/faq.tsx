import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "What do I get with a free account?",
    answer:
      "Free accounts get 2 domain generations per day, with full access to AI-powered name suggestions, real-time availability checking, and Founder Signal™ scoring. Perfect for exploring ideas before committing.",
  },
  {
    question: "What's included in NamoLux Pro?",
    answer:
      "Pro members get unlimited domain generations, priority support, and full access to all features for just £9.99/month. No limits, no restrictions—generate as many names as you need.",
  },
  {
    question: "How does the AI generate names?",
    answer:
      "Enter a keyword or describe your brand, select a vibe (Luxury, Futuristic, Playful, etc.), and our AI generates creative, brandable domain names tailored to your vision.",
  },
  {
    question: "What is Founder Signal™?",
    answer:
      "Founder Signal™ scores each domain from 0-100 based on brand strength, memorability, and scalability. It helps you quickly identify which names have the strongest potential for building a lasting brand.",
  },
  {
    question: "How do you check availability?",
    answer:
      "We use real-time DNS lookups to verify domain availability. Results are best-effort and may vary slightly by registrar—we recommend confirming with your preferred registrar before purchasing.",
  },
  {
    question: "Which TLDs do you support?",
    answer:
      "We support .com, .io, .co, .ai, and .net domains. We prioritize .com as it's the most valuable for brand recognition, but you can filter results by any supported TLD.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, absolutely. You can cancel your Pro subscription at any time from your dashboard. You'll keep Pro access until the end of your billing period with no hidden fees.",
  },
  {
    question: "Can I export my shortlist?",
    answer:
      "Yes! Save your favorite domains to a shortlist and export them to CSV with a single click. Perfect for sharing with your team or tracking your options.",
  },
]

export function FAQ() {
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
