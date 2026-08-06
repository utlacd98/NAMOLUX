"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { PRODUCT_OFFER } from "@/lib/product-offer"
import { PUBLIC_PRODUCT_COPY } from "@/lib/site-content"
import styles from "./premium-home.module.css"

export const premiumFaqs = [
  {
    question: "What is NamoLux?",
    answer:
      "NamoLux is a shortlist decision toolkit for founders. It checks candidate names across six domain extensions and can evaluate each option with Founder Signal so you can choose with confidence.",
  },
  {
    question: "Can I bring my own shortlist?",
    answer:
      "Yes. Paste names from your team, an agency, a workshop, or any other source. You can review up to 50 names in one batch.",
  },
  {
    question: "Which domain extensions can I check?",
    answer: ".com, .io, .co, .ai, .app, and .dev are checked through live DNS and RDAP lookups.",
  },
  {
    question: "Is availability guaranteed?",
    answer:
      "No. Availability checks are best effort and can change quickly. Always confirm the result with your preferred registrar before purchase.",
  },
  {
    question: "Can NamoLux check social profiles and trade marks?",
    answer:
      "For candidates with an available domain, NamoLux provides direct social-profile, company and official UK IPO, US PTO and EUIPO search links. These links help you verify a name, but do not confirm a social handle, company name or trade mark is available or legally clear.",
  },
  {
    question: "What is included in the free and paid plans?",
    answer: `The free plan includes ${PRODUCT_OFFER.freeUsageLabel}. ${PRODUCT_OFFER.paidPlanName} is ${PRODUCT_OFFER.paidPriceLabel} and includes ${PUBLIC_PRODUCT_COPY.proPlanSummary.toLowerCase()} It also adds saved decisions, CSV exports, shareable reports, and an ad-free workspace. ${PUBLIC_PRODUCT_COPY.renewalNote} ${PRODUCT_OFFER.cancellationLabel}`,
  },
  {
    question: "Is Founder Signal legal or trademark advice?",
    answer:
      "No. Founder Signal is a decision support framework. It surfaces potential brand conflict signals and is not legal or trademark advice.",
  },
]

export function PremiumFaq() {
  const [open, setOpen] = useState(0)
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: premiumFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className={styles.faqList}>
        {premiumFaqs.map((faq, index) => {
          const isOpen = open === index
          return (
            <div key={faq.question} className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ""}`}>
              <button
                type="button"
                className={styles.faqTrigger}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : index)}
              >
                <span>{faq.question}</span>
                <ChevronDown size={18} strokeWidth={1.5} className={isOpen ? styles.chevronOpen : ""} />
              </button>
              {isOpen && <p className={styles.faqAnswer}>{faq.answer}</p>}
            </div>
          )
        })}
      </div>
    </>
  )
}
