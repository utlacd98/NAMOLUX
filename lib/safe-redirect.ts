const DEFAULT_REDIRECT_PATH = "/dashboard"
const MAX_DECODE_PASSES = 8
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i

function pathPortion(value: string): string {
  const queryIndex = value.indexOf("?")
  const hashIndex = value.indexOf("#")
  const indices = [queryIndex, hashIndex].filter((index) => index >= 0)
  const end = indices.length > 0 ? Math.min(...indices) : value.length

  return value.slice(0, end)
}

function isSafeRepresentation(value: string): boolean {
  if (
    value.length === 0
    || value !== value.trim()
    || CONTROL_CHARACTER_PATTERN.test(value)
    || value.includes("\\")
    || !value.startsWith("/")
    || value.startsWith("//")
  ) {
    return false
  }

  const pathname = pathPortion(value)
  return !SCHEME_PATTERN.test(pathname.slice(1))
}

/**
 * Accepts only clean, root-relative paths that stay on the current origin.
 * Every encoded representation is checked so a later decode cannot turn a
 * value into a protocol-relative URL, scheme URL, backslash URL, or control
 * character payload.
 */
export function isSafeRedirectPath(value: unknown): value is string {
  if (typeof value !== "string" || !isSafeRepresentation(value)) return false

  let representation = value

  for (let pass = 0; pass < MAX_DECODE_PASSES; pass += 1) {
    let decoded: string

    try {
      decoded = decodeURIComponent(representation)
    } catch {
      // A malformed original value is unsafe. A literal percent sign reached
      // after a successful decode cannot change URL authority on another pass.
      return pass > 0
    }

    if (decoded === representation) return true
    if (!isSafeRepresentation(decoded)) return false
    representation = decoded
  }

  // Reject unusually deep encodings instead of trusting a partially decoded
  // value that another layer could continue to interpret.
  try {
    return decodeURIComponent(representation) === representation
  } catch {
    return true
  }
}

export function sanitizeRedirectPath(
  value: unknown,
  fallback: unknown = DEFAULT_REDIRECT_PATH,
): string {
  const safeFallback = isSafeRedirectPath(fallback) ? fallback : DEFAULT_REDIRECT_PATH
  return isSafeRedirectPath(value) ? value : safeFallback
}
