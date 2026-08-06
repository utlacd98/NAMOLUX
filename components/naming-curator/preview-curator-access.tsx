import { KeyRound, ShieldCheck } from "lucide-react"
import styles from "./naming-curator.module.css"

export function PreviewCuratorAccess({ invalid = false }: { invalid?: boolean }) {
  return (
    <main className={styles.accessShell}>
      <section className={styles.accessCard} aria-labelledby="preview-access-title">
        <div className={styles.monogram} aria-hidden="true">N</div>
        <p className={styles.eyebrow}>Protected non-production preview</p>
        <h1 id="preview-access-title" className={styles.accessTitle}>Founder Curation Lab access</h1>
        <p className={styles.accessCopy}>Enter the temporary preview code supplied with this deployment. This does not change your NamoLux password or admin account.</p>
        {invalid ? <p className={styles.error} role="alert">That preview access code was not accepted.</p> : null}
        <form className={styles.accessForm} action="/namo-curator-local/access" method="post">
          <label htmlFor="preview-access-code">Temporary access code</label>
          <div className={styles.accessInputRow}>
            <KeyRound size={17} aria-hidden="true" />
            <input id="preview-access-code" name="accessCode" type="password" autoComplete="one-time-code" required minLength={24} />
          </div>
          <button className={styles.buttonPrimary} type="submit"><ShieldCheck size={16} /> Open protected preview</button>
        </form>
        <p className={styles.accessFootnote}>The cookie is HttpOnly, Secure, SameSite=Strict and limited to this curator path.</p>
      </section>
    </main>
  )
}
