"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { SITE_ACTIONS, SITE_NAVIGATION } from "@/lib/site-content"
import styles from "./site-shell.module.css"

const MOBILE_BREAKPOINT = "(min-width: 901px)"
const HOME_NAVIGATION = [
  { href: "/generate", label: "Name Sprint" },
  { href: "/bulk-domain-check", label: "Bulk Check" },
  { href: "#process", label: "How it works" },
  { href: "/brand-launch", label: "Launch Kit" },
  { href: "#pricing", label: "Pricing" },
] as const

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function isCurrentPage(pathname: string, href: string) {
  if (href.includes("#")) return false
  if (href === "/blog") return pathname === href || pathname.startsWith(`${href}/`)
  if (href === "/generate") return pathname === href || pathname.startsWith(`${href}/`)
  if (href === "/bulk-domain-check") return pathname === href || pathname.startsWith(`${href}/`)
  if (href === "/brand-launch") return pathname === href || pathname.startsWith(`${href}/`)
  return pathname === href
}

export function SiteHeader() {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const isJournal = pathname === "/blog"
  const visibleNavigation = isHome ? HOME_NAVIGATION : SITE_NAVIGATION
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  // Navigation must stay safe while the browser-side status check is pending.
  // In the unknown state, /dashboard lets the server make the authoritative
  // decision: signed-in users continue, anonymous users are sent to sign-in.
  const [authState, setAuthState] = useState<"unknown" | "authenticated" | "anonymous">("unknown")

  useEffect(() => {
    const controller = new AbortController()
    const loadStatus = () => {
      void fetch("/api/auth/status", {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      })
        .then((response) => response.ok ? response.json() as Promise<{ authenticated?: boolean }> : null)
        .then((status) => {
          setAuthState(status?.authenticated === true ? "authenticated" : "anonymous")
        })
        .catch(() => {
          // Keep the server-authoritative fallback instead of incorrectly
          // presenting a valid session as signed out.
          setAuthState("unknown")
        })
    }
    const hasIdleCallback = typeof window.requestIdleCallback === "function"
    const idleId = hasIdleCallback ? window.requestIdleCallback(loadStatus, { timeout: 1_500 }) : null
    const timeoutId = hasIdleCallback ? null : window.setTimeout(loadStatus, 0)

    return () => {
      if (idleId !== null) window.cancelIdleCallback(idleId)
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    const desktopQuery = window.matchMedia(MOBILE_BREAKPOINT)
    const focusFrame = window.requestAnimationFrame(() => firstMobileLinkRef.current?.focus())

    document.body.style.overflow = "hidden"

    const closeForDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false)
    }
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }

    desktopQuery.addEventListener("change", closeForDesktop)
    document.addEventListener("keydown", closeWithEscape)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      desktopQuery.removeEventListener("change", closeForDesktop)
      document.removeEventListener("keydown", closeWithEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  const accountAction = authState === "authenticated" ? SITE_ACTIONS.dashboard : authState === "anonymous" ? SITE_ACTIONS.signIn : SITE_ACTIONS.dashboard
  const accountLabel = authState === "unknown" ? "Account" : accountAction.label
  // The landing hero owns its primary action. Keeping the mobile sticky action
  // there covers the shortlist preview and duplicates the visible CTA.
  const hideStickyAction = pathname === "/"
    || pathname.startsWith("/generate")
    || pathname.startsWith("/bulk-domain-check/workspace")
    || pathname.startsWith("/sign-in")
    || pathname.startsWith("/sign-up")
    || pathname.startsWith("/dashboard")
    || pathname.startsWith("/brand-launch")
    || pathname === "/about"
    || pathname === "/blog"

  return (
    <header className={styles.siteHeader} data-journal-header={isJournal ? "true" : undefined}>
      <a href="#main-content" className={styles.skipLink}>Skip to main content</a>
      <nav className={styles.headerRail} aria-label="Main navigation">
        <Link href="/" prefetch={false} className={styles.wordmark} aria-label="NamoLux home">
          Namo<span>Lux</span>
        </Link>

        <ul className={styles.desktopNavigation}>
          {visibleNavigation.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch={false}
                className={styles.navigationLink}
                aria-current={isCurrentPage(pathname, link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.headerActions}>
          {!isHome ? (
            <>
            <Link
              href={accountAction.href}
              prefetch={false}
              className={styles.signInLink}
              aria-current={isCurrentPage(pathname, accountAction.href) ? "page" : undefined}
            >
              {accountLabel}
            </Link>
            <Link href={SITE_ACTIONS.startNaming.href} prefetch={false} className={styles.headerCta}>
              {SITE_ACTIONS.startNaming.label}
            </Link>
            </>
          ) : null}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          onClick={() => setMenuOpen((open) => !open)}
          aria-controls="site-mobile-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </nav>

      {menuOpen ? (
        <nav id="site-mobile-navigation" className={styles.mobileNavigation} aria-label="Mobile navigation">
          <div className={styles.mobileNavigationInner}>
            {visibleNavigation.map((link, index) => (
              <Link
                ref={index === 0 ? firstMobileLinkRef : undefined}
                key={link.href}
                href={link.href}
                prefetch={false}
                className={styles.mobileLink}
                aria-current={isCurrentPage(pathname, link.href) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <div className={styles.mobileDivider} aria-hidden="true" />

            <Link
              href={accountAction.href}
              prefetch={false}
              className={styles.mobileLink}
              aria-current={isCurrentPage(pathname, accountAction.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {accountLabel}
            </Link>
            <Link
              href={SITE_ACTIONS.startNaming.href}
              prefetch={false}
              className={styles.mobileCta}
              onClick={() => setMenuOpen(false)}
            >
              {SITE_ACTIONS.startNaming.label}
            </Link>
          </div>
        </nav>
      ) : null}

      {!menuOpen && !hideStickyAction ? (
        <Link href={SITE_ACTIONS.startNaming.href} prefetch={false} className={styles.mobileStickyCta}>
          {SITE_ACTIONS.startNaming.label}
        </Link>
      ) : null}
    </header>
  )
}
