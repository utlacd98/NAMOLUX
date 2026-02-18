import Link from "next/link"
import { Heart } from "lucide-react"
import { KofiButton } from "@/components/kofi-button"

// Social media icons as inline SVGs for better control
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

const socialLinks = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61587014966281",
    icon: FacebookIcon,
  },
  {
    name: "X",
    href: "https://x.com/NamoLux",
    icon: XIcon,
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/namoluxapp/",
    icon: InstagramIcon,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/andrew-barrett-587a21390/",
    icon: LinkedInIcon,
  },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="overflow-clip border-t border-border bg-muted/30 py-8 sm:py-12" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Mobile: stacked, centered. Desktop: 3-column grid for perfect centering */}
        <div className="flex flex-col items-center gap-4 sm:gap-6 md:grid md:grid-cols-3 md:items-center">
          {/* Left: Logo */}
          <div className="flex items-center justify-center md:justify-start">
            <Link
              href="/"
              aria-label="NamoLux"
              className="text-xl font-bold tracking-tight text-foreground transition-colors hover:text-primary"
            >
              Namo<span className="text-[#D4A843]">Lux</span>
            </Link>
          </div>

          {/* Center: Navigation */}
          <nav aria-label="Footer navigation" className="flex justify-center">
            <ul className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
              <li>
                <a href="/about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  About Us
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Privacy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Terms
                </a>
              </li>
              <li>
                <a href="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Contact
                </a>
              </li>
            </ul>
          </nav>

          {/* Right: Ko-fi Support Button */}
          <div className="flex justify-center md:justify-end">
            <KofiButton />
          </div>
        </div>

        {/* Social Links Section */}
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-border/50 pt-6 sm:mt-8 sm:pt-8">
          <p className="text-center text-sm text-muted-foreground">
            Follow us for updates, tips & domain inspiration
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                aria-label={`Follow us on ${social.name}`}
              >
                <social.icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:gap-4">
          <p className="max-w-2xl px-2 text-center text-xs text-muted-foreground sm:max-w-none sm:px-0">
            <Link href="/" className="transition-colors hover:text-foreground">
              NamoLux
            </Link>{" "}
            is the official site for the NamoLux domain name finder and Founder Signal scoring tool.
          </p>

          <p className="text-sm text-muted-foreground">&copy; {currentYear} NamoLux</p>

          <p className="max-w-md px-2 text-center text-xs text-muted-foreground sm:max-w-none sm:px-0">
            Availability checks are best-effort and may vary by registrar. Always verify with your preferred registrar
            before purchase.
          </p>

          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            Made with <Heart className="h-2.5 w-2.5 text-red-400 sm:h-3 sm:w-3" /> for domain hunters
          </p>
        </div>
      </div>
    </footer>
  )
}
