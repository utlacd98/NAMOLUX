"use client"

import { useState } from "react"
import { Check, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { CREDIT_PACKAGES } from "@/lib/stripe"

export function PricingSection() {
  const { isSignedIn } = useUser()
  const router = useRouter()
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null)

  const handlePurchase = async (packageId: string, isFree: boolean = false) => {
    if (!isSignedIn) {
      router.push("/sign-up")
      return
    }

    // For free trial, just redirect to dashboard (user already gets 3 free credits on signup)
    if (isFree) {
      router.push("/")
      return
    }

    setLoadingPackage(packageId)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("No checkout URL returned")
        setLoadingPackage(null)
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      setLoadingPackage(null)
    }
  }

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pay once, use anytime. No subscriptions, no hidden fees.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={pkg.popular ? "relative border-primary shadow-lg" : ""}
            >
              {pkg.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                {pkg.description && (
                  <CardDescription className="text-sm">
                    {pkg.description}
                  </CardDescription>
                )}
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">
                    £{pkg.price}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">one-time</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">{pkg.credits} credits</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {pkg.features?.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(pkg.id, pkg.isFree)}
                  disabled={loadingPackage === pkg.id}
                >
                  {loadingPackage === pkg.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    pkg.buttonText || `Buy ${pkg.name}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-2xl text-center">
          <h3 className="text-xl font-semibold">How credits work</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-card p-6">
              <h4 className="font-semibold">Domain Generation</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                1 credit = 10 AI-generated domain names with availability checks
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h4 className="font-semibold">SEO Audit</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                1 credit = Full SEO analysis of any website
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

