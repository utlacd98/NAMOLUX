import { createHmac, timingSafeEqual } from "node:crypto"

const MAX_TTL_SECONDS = 7 * 24 * 60 * 60
const VIDEO_PATHNAME = "deliveries/namolux-social-ad-final.mp4"

function secret() { return process.env.VIDEO_DOWNLOAD_SIGNING_SECRET?.trim() || "" }
function signature(expires: number) { return createHmac("sha256", secret()).update(`${VIDEO_PATHNAME}.${expires}`).digest("base64url") }

export function getPrivateVideoPathname() { return process.env.VIDEO_DOWNLOAD_BLOB_PATHNAME?.trim() || VIDEO_PATHNAME }
export function signPrivateVideoDownload(origin: string, now = Date.now()) {
  if (!secret()) return null
  const expires = Math.floor(now / 1000) + MAX_TTL_SECONDS
  return `${origin.replace(/\/$/, "")}/api/private-download/video?expires=${expires}&signature=${signature(expires)}`
}
export function verifiesPrivateVideoDownload(expiresRaw: string | null, supplied: string | null, now = Date.now()) {
  if (!secret() || !expiresRaw || !supplied) return false
  const expires = Number(expiresRaw); const current = Math.floor(now / 1000)
  if (!Number.isSafeInteger(expires) || expires < current || expires > current + MAX_TTL_SECONDS) return false
  const expected = Buffer.from(signature(expires)); const actual = Buffer.from(supplied)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
