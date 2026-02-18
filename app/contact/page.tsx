import type { Metadata } from "next"
import { Mail, MessageSquare, Clock } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Contact Us | NamoLux",
  description:
    "Contact the NamoLux team for support, feedback, and product questions. We usually reply within 24-48 hours on business days to help with domain workflows.",
  twitter: {
    card: "summary",
    title: "Contact Us | NamoLux",
    description:
      "Contact the NamoLux team for support, feedback, and product questions. We usually reply within 24-48 hours on business days to help with domain workflows.",
  },
}

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 px-4 pt-24 pb-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-4xl font-bold text-foreground">Contact Us</h1>
          <p className="mb-12 text-lg text-muted-foreground">
            Have questions or feedback? We&apos;d love to hear from you.
          </p>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Email */}
            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Email</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                For general inquiries and support
              </p>
              <a 
                href="mailto:support@namolux.com" 
                className="text-primary hover:underline"
              >
                support@namolux.com
              </a>
            </div>

            {/* Feedback */}
            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                <MessageSquare className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Feedback</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Help us improve NamoLux
              </p>
              <a 
                href="mailto:feedback@namolux.com" 
                className="text-secondary hover:underline"
              >
                feedback@namolux.com
              </a>
            </div>

            {/* Response Time */}
            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Response Time</h3>
              <p className="text-sm text-muted-foreground">
                We typically respond within 24-48 hours during business days.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="mb-8 text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="rounded-xl border border-border/50 bg-card/50 p-6">
                <h3 className="mb-2 font-semibold text-foreground">How do credits work?</h3>
                <p className="text-muted-foreground">
                  Each domain generation costs 1 credit. Credits never expire and can be used anytime.
                </p>
              </div>
              
              <div className="rounded-xl border border-border/50 bg-card/50 p-6">
                <h3 className="mb-2 font-semibold text-foreground">Are refunds available?</h3>
                <p className="text-muted-foreground">
                  Credits are non-refundable once purchased. Please start with a smaller package if you&apos;re unsure.
                </p>
              </div>
              
              <div className="rounded-xl border border-border/50 bg-card/50 p-6">
                <h3 className="mb-2 font-semibold text-foreground">How accurate is domain availability?</h3>
                <p className="text-muted-foreground">
                  We check availability in real-time, but domains can be registered by others at any moment. 
                  We recommend registering quickly if you find a name you love.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
