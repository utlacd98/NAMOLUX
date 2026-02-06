"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "/founder-signal", label: "Founder Signal™" },
  { href: "/blog", label: "Blog" },
  { href: "#faq", label: "FAQ" },
]

const resourceLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/how-to-name-a-startup", label: "How to Name a Startup" },
  { href: "/name-mistakes", label: "7 Naming Mistakes" },
  { href: "/brand-longevity", label: "Brand Longevity" },
  { href: "/domain-vs-brand", label: "Domain vs Brand" },
  { href: "/bulk-domain-check", label: "Bulk Domain Check" },
  { href: "/seo-domain-check", label: "SEO Domain Guide" },
  { href: "/seo-audit", label: "SEO Audit Tool" },
  { href: "/why-namolux", label: "Why NamoLux" },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isResourcesOpen, setIsResourcesOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300",
        isScrolled ? "glass border-b border-border" : "bg-transparent",
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4 sm:h-16">
          {/* Logo - wrapped in Link */}
          <Link
            href="/"
            className="flex shrink-0 items-center text-foreground transition-colors hover:text-primary"
            aria-label="NamoLux"
          >
            <Image
              src="/logo.png"
              alt="NamoLux"
              width={120}
              height={32}
              className="h-8 w-auto sm:h-10"
              priority
            />
            <span className="sr-only">NamoLux</span>
          </Link>

          {/* Desktop Nav - Centered */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:text-foreground"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:text-foreground"
                >
                  {link.label}
                </a>
              ),
            )}
            {/* Resources Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsResourcesOpen(true)}
              onMouseLeave={() => setIsResourcesOpen(false)}
            >
              <button
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:text-foreground"
                onClick={() => setIsResourcesOpen(!isResourcesOpen)}
              >
                Resources
                <ChevronDown className={cn("h-4 w-4 transition-transform", isResourcesOpen && "rotate-180")} />
              </button>
              {isResourcesOpen && (
                <div className="absolute top-full left-0 z-50 pt-2 w-56">
                  <div className="rounded-lg border border-border bg-card p-2 shadow-xl">
                    {resourceLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => setIsResourcesOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* CTA Button */}
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/generate">Generate Names</Link>
            </Button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              aria-expanded={isOpen}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav - Updated for Link support */}
        {isOpen && (
          <div className="mt-2 rounded-lg border border-border bg-background p-4 md:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ),
              )}
              {/* Mobile Resources Section */}
              <div className="border-t border-border pt-3">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Resources
                </span>
                {resourceLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              {/* Mobile CTA */}
              <div className="border-t border-border pt-3">
                <Button asChild className="w-full">
                  <Link href="/generate" onClick={() => setIsOpen(false)}>Generate Names</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
