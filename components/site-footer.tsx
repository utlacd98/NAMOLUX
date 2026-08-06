import Link from "next/link"
import { PrivacyChoicesButton } from "@/components/privacy-choices-button"
import { FOOTER_LINKS, LEGAL_CAVEATS } from "@/lib/site-content"
import styles from "./site-shell.module.css"

export function SiteFooter() {
  return (
    <footer className={styles.siteFooter}>
      <div className={styles.footerRail}>
        <div className={styles.footerTop}>
          <Link href="/" prefetch={false} className={styles.wordmark} aria-label="NamoLux home">
            Namo<span>Lux</span>
          </Link>

          <nav aria-label="Footer navigation">
            <ul className={styles.footerLinks}>
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} prefetch={false}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.footerBottom}>
          <div className={styles.footerMeta}>
            <span>&copy; {new Date().getFullYear()} NamoLux</span>
            <PrivacyChoicesButton className={styles.privacyButton} />
          </div>
          <div className={styles.footerCaveats}>
            <p>{LEGAL_CAVEATS.domainAvailability}</p>
            <p>{LEGAL_CAVEATS.founderSignal}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
