import { describe, expect, it } from "vitest"
import {
  evaluateCandidateFilters,
  hasBannedSuffix,
  hasProtectedBrandCollision,
  hasUnsafeBrandMeaning,
  hasVerifiedExactNameRisk,
  passesTasteGate,
} from "./filters"
import type { AutoFindControls } from "./types"

const VERIFIED_COLLISIONS = [
  "sunworks",
  "chargegrid",
  "privacywise",
  "invoiceflow",
  "carbonledger",
  "cyberwatch",
  "coldtrack",
  "pharmatrack",
  "motorworks",
  "pledgeit",
  "wellchild",
  "bitstream",
  "bellcore",
  "tradeindia",
  "teamflow",
  "chainguard",
  "mindpath",
  "hirebridge",
  "talentbridge",
  "carebridge",
  "guestjoy",
  "simplepay",
  "dripworks",
  "assurance",
  "defender",
  "tripwire",
  "wrench",
  "edelweiss",
  "arabica",
  "wilderness",
  "portico",
  "clockwise",
  "sentinel",
  "heartbeat",
  "openscholar",
  "keyring",
  "openrenter",
  "routine",
  "parkade",
  "goldsmith",
] as const

const VERIFIED_CRITICAL_SURFACES = [
  "tabloc",
  "roameat",
  "riglet",
  "coilwhisp",
  "civik",
  "publik",
  "aidsignal",
  "stillborn",
] as const

const FILTER_CONTROLS: AutoFindControls = {
  seed: "verified-exact-risk-test",
  mustIncludeKeyword: "none",
  keywordPosition: "anywhere",
  style: "brandable_blends",
  blocklist: [],
  allowlist: [],
  allowHyphen: false,
  allowNumbers: false,
  meaningFirst: true,
  preferTwoWordBrands: true,
  allowVibeSuffix: false,
  showAnyAvailable: false,
}

describe("mechanical AI suffixes", () => {
  it.each(["budgify", "soundify", "cargify", "ledgerly", "fundio"])(
    "rejects %s as a mechanical unreviewed suffix construction",
    (name) => {
    expect(hasBannedSuffix(name)).toBe(true)
    },
  )

  it("does not reject a normal word merely because it contains the same letters internally", () => {
    expect(hasBannedSuffix("giftable")).toBe(false)
  })

  it("rejects short distinctive protected-brand fragments", () => {
    expect(hasUnsafeBrandMeaning("homelyft")).toBe(true)
  })
})

describe("protected-brand confusion screen", () => {
  it.each([
    "tesla",
    "tessla",
    "tsela",
    "teslah",
    "teslaadvisor",
    "shopifypro",
  ])("rejects a close protected-brand surface: %s", (name) => {
    expect(hasProtectedBrandCollision(name)).toBe(true)
    expect(hasUnsafeBrandMeaning(name)).toBe(true)
  })

  it.each([
    "tessellate",
    "testable",
    "lift",
    "harbour",
  ])("does not broadly reject an unrelated ordinary surface: %s", (name) => {
    expect(hasProtectedBrandCollision(name)).toBe(false)
  })
})

describe("verified exact name risks", () => {
  it.each([...VERIFIED_COLLISIONS, ...VERIFIED_CRITICAL_SURFACES])(
    "rejects the verified exact surface %s through shared safety gates",
    (name) => {
      expect(hasVerifiedExactNameRisk(name)).toBe(true)
      expect(hasUnsafeBrandMeaning(name)).toBe(true)
      expect(passesTasteGate(name)).toBe(false)

      const decision = evaluateCandidateFilters(name, {
        maxLength: 32,
        controls: FILTER_CONTROLS,
        blocklist: [],
        allowlist: [],
      })

      expect(decision.accepted).toBe(false)
      expect(decision.reasons).toContain("unsafe_brand_meaning")
    },
  )

  it("normalises case, spaces and punctuation before exact matching", () => {
    expect(hasVerifiedExactNameRisk(" Sun-Works ")).toBe(true)
    expect(hasVerifiedExactNameRisk("CHARGE GRID")).toBe(true)
    expect(hasVerifiedExactNameRisk("Aid.Signal")).toBe(true)
  })

  it.each([
    "sunworkspro",
    "chargegrids",
    "privacywisely",
    "invoiceflower",
    "cyberwatchtower",
    "coldtracker",
    "publika",
    "civika",
    "aidsignalstudio",
    "tradeindialabs",
    "teamflowing",
    "chainguardian",
    "mindpathways",
    "hirebridges",
    "talentbridges",
    "carebridges",
    "guestjoyful",
  ])("does not substring-block the legitimate longer surface %s", (name) => {
    expect(hasVerifiedExactNameRisk(name)).toBe(false)
    expect(hasUnsafeBrandMeaning(name)).toBe(false)
  })
})

describe("low-fit tone boundaries", () => {
  it.each(["homeward", "forward", "rewarding", "stewardship"])(
    "does not mistake the ordinary word %s for a war reference",
    (name) => {
      expect(hasUnsafeBrandMeaning(name)).toBe(false)
    },
  )

  it.each(["war", "cyberwar", "warzone"])("keeps the hard safety rejection for %s", (name) => {
    expect(hasUnsafeBrandMeaning(name)).toBe(true)
  })
})
