"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Menu, X, ChevronDown, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

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
  const [isResourcesOpen, setIsResourcesOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <nav
      className="glass fixed top-0 left-0 right-0 z-50 w-full border-b border-border transition-all duration-300"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4 sm:h-16">
          {/* Logo - Text */}
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-foreground transition-colors hover:text-primary sm:text-2xl"
            aria-label="NamoLux"
          >
            Namo<span className="text-[#D4A843]">Lux</span>
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
                aria-expanded={isResourcesOpen}
                aria-haspopup="menu"
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
            {user ? (
              <>
                {/* Dashboard Button - More prominent */}
                <Button asChild variant="outline" className="hidden sm:inline-flex">
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-1.5" />
                    Dashboard
                  </Link>
                </Button>
                {/* Generate Names Button */}
                <Button asChild className="hidden sm:inline-flex">
                  <Link href="/generate">Generate Names</Link>
                </Button>
                {/* Sign Out Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    await supabase.auth.signOut()
                    window.location.href = "/"
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                {/* Sign In Button */}
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                {/* CTA Button */}
                <Button asChild className="hidden sm:inline-flex">
                  <Link href="/generate">Generate Names</Link>
                </Button>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              aria-expanded={isOpen}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 top-16 z-40 bg-background md:hidden"
            style={{ height: "calc(100vh - 4rem)" }}
          >
            <div className="h-full overflow-y-auto overscroll-contain p-4 pb-8">
              <div className="flex flex-col gap-3">
                {navLinks.map((link) =>
                  link.href.startsWith("/") ? (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="block py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="block py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
                {/* Mobile Auth Section */}
                <div className="border-t border-border pt-3 pb-6">
                  {user ? (
                    <>
                      {/* Dashboard Link */}
                      <Link
                        href="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 py-2 text-sm font-medium text-primary mb-3"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                      {/* Sign Out Button */}
                      <Button
                        variant="outline"
                        className="w-full mb-3"
                        onClick={async () => {
                          await supabase.auth.signOut()
                          setIsOpen(false)
                          window.location.href = "/"
                        }}
                      >
                        Sign Out
                      </Button>
                      {/* Generate Names Button */}
                      <Button asChild className="w-full">
                        <Link href="/generate" onClick={() => setIsOpen(false)}>Generate Names</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Sign In Button */}
                      <Button asChild variant="outline" className="w-full mb-3">
                        <Link href="/sign-in" onClick={() => setIsOpen(false)}>Sign In</Link>
                      </Button>
                      {/* Generate Names Button */}
                      <Button asChild className="w-full">
                        <Link href="/generate" onClick={() => setIsOpen(false)}>Generate Names</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
