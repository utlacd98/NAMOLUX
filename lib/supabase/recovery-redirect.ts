export const implicitRecoveryRedirectScript = String.raw`
(() => {
  const { hash, pathname } = window.location

  if (!hash || pathname === "/reset-password" || pathname === "/reset-password/") return

  const params = new URLSearchParams(hash.slice(1))
  if (params.get("type") !== "recovery") return

  window.location.replace("/reset-password?recovery=1" + hash)
})()
`
