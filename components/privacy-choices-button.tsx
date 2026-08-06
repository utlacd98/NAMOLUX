"use client"

declare global {
  interface Window {
    googlefc?: {
      callbackQueue: Array<() => void>
      showRevocationMessage: () => void
    }
  }
}

export function PrivacyChoicesButton({ className = "" }: { className?: string }) {
  const openPrivacySettings = () => {
    const googlefc = window.googlefc
    if (googlefc?.showRevocationMessage) {
      googlefc.callbackQueue = googlefc.callbackQueue || []
      googlefc.callbackQueue.push(googlefc.showRevocationMessage)
      return
    }
    window.location.assign("/cookies#manage-ads")
  }

  return (
    <button type="button" onClick={openPrivacySettings} className={className}>
      Privacy &amp; cookie settings
    </button>
  )
}
