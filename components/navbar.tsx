"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, ChevronDown, LayoutDashboard, Sparkles } from "lucide-react"
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
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500"
      style={{
        background: scrolled
          ? "rgba(4,4,4,0.96)"
          : "rgba(4,4,4,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: scrolled
          ? "1px solid rgba(212,175,55,0.2)"
          : "1px solid rgba(255,255,255,0.06)",
        boxShadow: scrolled ? "0 4px 40px rgba(0,0,0,0.6)" : "none",
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Gold top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(to right, transparent 0%, rgba(212,175,55,0.5) 30%, rgba(246,226,122,0.7) 50%, rgba(212,175,55,0.5) 70%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-2 shrink-0"
            aria-label="NamoLux home"
          >
            <span
              className="text-xl font-black tracking-tight sm:text-2xl"
              style={{ color: "#ffffff", letterSpacing: "-0.02em" }}
            >
              Namo
              <span
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #F6E27A 50%, #D4AF37 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Lux
              </span>
            </span>
          </Link>

          {/* Desktop Nav — centered */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const inner = (
                <span className="relative px-3 py-2 text-sm font-medium text-white/50 transition-colors duration-200 hover:text-white group-hover:text-white">
                  {link.label}
                  {/* gold underline on hover */}
                  <span
                    className="absolute bottom-0 left-3 right-3 h-px scale-x-0 transition-transform duration-200 group-hover:scale-x-100"
                    style={{ background: "linear-gradient(to right, #D4AF37, #F6E27A)" }}
                  />
                </span>
              )
              return link.href.startsWith("/") ? (
                <Link key={link.href} href={link.href} className="group">
                  {inner}
                </Link>
              ) : (
                <a key={link.href} href={link.href} className="group">
                  {inner}
                </a>
              )
            })}

            {/* Resources Dropdown */}
            <div
              className="group relative"
              onMouseEnter={() => setIsResourcesOpen(true)}
              onMouseLeave={() => setIsResourcesOpen(false)}
            >
              <button
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white/50 transition-colors hover:text-white"
                onClick={() => setIsResourcesOpen(!isResourcesOpen)}
                aria-expanded={isResourcesOpen}
                aria-haspopup="menu"
              >
                Resources
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", isResourcesOpen && "rotate-180")} />
              </button>

              {isResourcesOpen && (
                <div className="absolute top-full left-1/2 z-50 -translate-x-1/2 pt-3 w-56">
                  <div
                    className="rounded-xl p-1.5 shadow-2xl"
                    style={{
                      background: "rgba(8,8,8,0.97)",
                      border: "1px solid rgba(212,175,55,0.18)",
                      backdropFilter: "blur(20px)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.05)",
                    }}
                  >
                    {resourceLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block rounded-lg px-3 py-2 text-sm text-white/50 transition-all duration-150 hover:bg-white/05 hover:text-white"
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
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-all hover:text-white"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Link>

                <Link
                  href="/generate"
                  className="hidden sm:flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-black transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg, #D4AF37 0%, #F6E27A 50%, #D4AF37 100%)",
                    boxShadow: "0 4px 20px rgba(212,175,55,0.35), 0 1px 0 rgba(255,255,255,0.1) inset",
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Names
                </Link>

                <button
                  className="hidden sm:block text-sm text-white/30 transition-colors hover:text-white/60 px-2 py-1"
                  onClick={async () => {
                    await supabase.auth.signOut()
                    window.location.href = "/"
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden sm:block px-3 py-2 text-sm font-medium text-white/50 transition-colors hover:text-white"
                >
                  Sign In
                </Link>

                <Link
                  href="/generate"
                  className="hidden sm:flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-black transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg, #D4AF37 0%, #F6E27A 50%, #D4AF37 100%)",
                    boxShadow: "0 4px 20px rgba(212,175,55,0.35), 0 1px 0 rgba(255,255,255,0.1) inset",
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Names
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2.5 text-white/50 transition-colors hover:text-white md:hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              aria-expanded={isOpen}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 top-16 z-40 md:hidden overflow-y-auto overscroll-contain"
            style={{ background: "rgba(4,4,4,0.98)", backdropFilter: "blur(20px)" }}
          >
            <div className="p-5 pb-10 flex flex-col gap-1">
              {navLinks.map((link) =>
                link.href.startsWith("/") ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-lg px-4 py-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/05 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-lg px-4 py-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/05 hover:text-white"
                  >
                    {link.label}
                  </a>
                ),
              )}

              <div
                className="my-4 h-px"
                style={{ background: "rgba(212,175,55,0.12)" }}
              />

              <div className="px-1">
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/25">Resources</p>
                {resourceLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-lg px-4 py-2.5 text-sm text-white/50 transition-colors hover:bg-white/05 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div
                className="my-4 h-px"
                style={{ background: "rgba(212,175,55,0.12)" }}
              />

              <div className="flex flex-col gap-3 px-1">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white/60"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/generate"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-black"
                      style={{
                        background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                        boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Names
                    </Link>
                    <button
                      className="rounded-lg py-3 text-sm text-white/30 transition-colors hover:text-white/60"
                      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                      onClick={async () => {
                        await supabase.auth.signOut()
                        setIsOpen(false)
                        window.location.href = "/"
                      }}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/sign-in"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center rounded-xl py-3.5 text-sm font-medium text-white/70"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/generate"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-black"
                      style={{
                        background: "linear-gradient(135deg, #D4AF37, #F6E27A, #D4AF37)",
                        boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Names Free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
