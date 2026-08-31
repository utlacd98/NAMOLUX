/**
 * Internal product reservations. These are workflow rules, not statements
 * about trade marks, company ownership, or legal rights.
 */
export const SYSTEM_RESERVED_NAME_CODE = "system_reserved_name" as const
export const SYSTEM_RESERVED_NAME_MESSAGE = "NamoLux is a reserved platform name and can't be analysed as a candidate." as const

const SYSTEM_RESERVED_KEYS = new Set(["namolux"])
const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "me.uk",
  "ac.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
])

function compact(value: string): string {
  return value.replace(/[^a-z0-9]/g, "")
}

function candidateIdentityForms(value: unknown): string[] {
  if (typeof value !== "string") return []

  let input = value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")

  input = input.split(/[/?#]/, 1)[0] || ""
  input = input.replace(/^[^@]+@/, "").replace(/^www\./, "").replace(/:\d+$/, "").replace(/\.+$/, "")
  if (!input) return []

  const labels = input.split(".").filter(Boolean)
  const forms = new Set<string>([compact(input)])
  if (labels.length > 1) forms.add(compact(labels.slice(0, -1).join(".")))

  const finalTwoLabels = labels.slice(-2).join(".")
  if (labels.length > 2 && MULTI_LABEL_PUBLIC_SUFFIXES.has(finalTwoLabels)) {
    forms.add(compact(labels.slice(0, -2).join(".")))
  }

  return Array.from(forms).filter(Boolean)
}

/** Returns the canonical reserved key when the value is system-reserved. */
export function getSystemReservedNameKey(value: unknown): string | null {
  return candidateIdentityForms(value).find((form) => SYSTEM_RESERVED_KEYS.has(form)) || null
}

export function isSystemReservedName(value: unknown): boolean {
  return getSystemReservedNameKey(value) !== null
}

export function hasSystemReservedName(values: readonly unknown[]): boolean {
  return values.some(isSystemReservedName)
}

export function systemReservedNameError() {
  return {
    error: SYSTEM_RESERVED_NAME_CODE,
    message: SYSTEM_RESERVED_NAME_MESSAGE,
  }
}
