import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { getUserEntitlements, type EntitlementResponse } from "@/lib/entitlements"
import type { Database, Json } from "@/lib/supabase/database.types"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const SUPPORTED_TLDS = ["com", "io", "co", "ai", "app", "dev"] as const
const SUPPORTED_TIERS = ["top", "consider", "reject"] as const
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/
const SHARE_TOKEN_BYTES = 32
const MAX_WINNER_RETRIES = 2

type NamingTables = Database["public"]["Tables"]
type BrandProjectRow = NamingTables["brand_projects"]["Row"]
type NamingShortlistRow = NamingTables["naming_shortlists"]["Row"]
type NamingShortlistEntryRow = NamingTables["naming_shortlist_entries"]["Row"]
type NamingDecisionReportRow = NamingTables["naming_decision_reports"]["Row"]
type NamingReportShareTokenRow = NamingTables["naming_report_share_tokens"]["Row"]
type ServiceClient = ReturnType<typeof createServiceClient>

export type NamingWorkspaceTld = (typeof SUPPORTED_TLDS)[number]
export type NamingShortlistTier = (typeof SUPPORTED_TIERS)[number]
export type NamingWorkspaceJsonObject = Record<string, Json | undefined>

export type NamingWorkspacePrincipal = {
  userId: string
  email: string | null
  entitlements: EntitlementResponse
}

export type NamingProject = {
  id: string
  name: string
  selectedBrandName: string | null
  businessDescription: string | null
  category: string | null
  locale: string | null
  createdAt: string
  updatedAt: string
}

export type NamingShortlist = {
  id: string
  projectId: string
  title: string
  primaryTld: NamingWorkspaceTld
  createdAt: string
  updatedAt: string
}

export type NamingShortlistEntry = {
  id: string
  shortlistId: string
  candidateName: string
  primaryDomain: string
  availabilitySnapshot: NamingWorkspaceJsonObject
  founderSignalSnapshot: NamingWorkspaceJsonObject | null
  tier: NamingShortlistTier | null
  notes: string | null
  position: number
  isWinner: boolean
  createdAt: string
  updatedAt: string
}

export type NamingDecisionReportSnapshot = {
  schemaVersion: 1
  generatedAt: string
  project: {
    id: string
    name: string
    selectedBrandName: string | null
    businessDescription: string | null
    category: string | null
    locale: string | null
  }
  shortlist: {
    id: string
    title: string
    primaryTld: NamingWorkspaceTld
    createdAt: string
    updatedAt: string
  }
  entries: Array<{
    id: string
    candidateName: string
    primaryDomain: string
    availabilitySnapshot: NamingWorkspaceJsonObject
    founderSignalSnapshot: NamingWorkspaceJsonObject | null
    tier: NamingShortlistTier | null
    notes: string | null
    position: number
    isWinner: boolean
    createdAt: string
    updatedAt: string
  }>
}

export type NamingDecisionReport = {
  id: string
  shortlistId: string
  title: string
  snapshot: NamingDecisionReportSnapshot
  createdAt: string
}

export type NamingReportShare = {
  id: string
  reportId: string
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

export type NamingWorkspaceDashboard = {
  principal: {
    email: string | null
    isPro: boolean
    accessState: EntitlementResponse["accessState"]
  }
  projects: NamingProject[]
  shortlists: NamingShortlist[]
  entries: NamingShortlistEntry[]
  reports: NamingDecisionReport[]
  reportShares: NamingReportShare[]
}

export type CreateNamingProjectInput = {
  name: string
  selectedBrandName?: string | null
  businessDescription?: string | null
  category?: string | null
  locale?: string | null
}

export type UpdateNamingProjectInput = {
  projectId: string
  name?: string
  selectedBrandName?: string | null
  businessDescription?: string | null
  category?: string | null
  locale?: string | null
}

export type CreateNamingShortlistInput = {
  projectId: string
  title: string
  primaryTld?: NamingWorkspaceTld
}

export type UpdateNamingShortlistInput = {
  shortlistId: string
  title?: string
  primaryTld?: NamingWorkspaceTld
}

export type CreateNamingShortlistEntryInput = {
  shortlistId: string
  candidateName: string
  availabilitySnapshot?: NamingWorkspaceJsonObject
  founderSignalSnapshot?: NamingWorkspaceJsonObject | null
  tier?: NamingShortlistTier | null
  notes?: string | null
  position?: number
}

export type UpdateNamingShortlistEntryInput = {
  shortlistId: string
  entryId: string
  availabilitySnapshot?: NamingWorkspaceJsonObject
  founderSignalSnapshot?: NamingWorkspaceJsonObject | null
  tier?: NamingShortlistTier | null
  notes?: string | null
  position?: number
}

export type CreateNamingDecisionReportInput = {
  shortlistId: string
  title?: string
}

export type CreateNamingReportShareInput = {
  reportId: string
  expiresAt?: string | null
}

export type CreatedNamingReportShare = NamingReportShare & {
  /** Returned once only. Store it in the share URL; it is never persisted. */
  token: string
}

export type SharedNamingDecisionReport = {
  id: string
  title: string
  snapshot: NamingDecisionReportSnapshot
  createdAt: string
}

export class NamingWorkspaceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message)
    this.name = "NamingWorkspaceError"
  }
}

function isSupportedTld(value: string): value is NamingWorkspaceTld {
  return (SUPPORTED_TLDS as readonly string[]).includes(value)
}

function isSupportedTier(value: string): value is NamingShortlistTier {
  return (SUPPORTED_TIERS as readonly string[]).includes(value)
}

function isJsonObject(value: unknown): value is NamingWorkspaceJsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function cloneJsonObject(value: unknown, field: string): NamingWorkspaceJsonObject {
  if (!isJsonObject(value)) {
    throw new NamingWorkspaceError("invalid_request", field + " must be an object.")
  }

  try {
    const clone = JSON.parse(JSON.stringify(value)) as unknown
    if (!isJsonObject(clone)) throw new Error("not an object")
    return clone
  } catch {
    throw new NamingWorkspaceError("invalid_request", field + " must be JSON-serializable.")
  }
}

function jsonObjectOrEmpty(value: Json | null): NamingWorkspaceJsonObject {
  return isJsonObject(value) ? cloneJsonObject(value, "Stored snapshot") : {}
}

function jsonObjectOrNull(value: Json | null): NamingWorkspaceJsonObject | null {
  return value === null ? null : jsonObjectOrEmpty(value)
}

function requireUuid(value: string, field: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new NamingWorkspaceError("invalid_request", field + " must be a valid identifier.")
  }
  return value
}

function requireText(value: string, field: string, min: number, max: number): string {
  const normalized = typeof value === "string" ? value.trim() : ""
  if (normalized.length < min || normalized.length > max) {
    throw new NamingWorkspaceError(
      "invalid_request",
      field + " must be between " + min + " and " + max + " characters.",
    )
  }
  return normalized
}

function optionalText(value: string | null | undefined, field: string, max: number): string | null {
  if (value === null || value === undefined) return null
  return requireText(value, field, 1, max)
}

function normalizeTld(value: NamingWorkspaceTld | string | undefined): NamingWorkspaceTld {
  const normalized = (value || "com").trim().toLowerCase().replace(/^\./, "")
  if (!isSupportedTld(normalized)) {
    throw new NamingWorkspaceError("invalid_request", "Choose a supported primary domain extension.")
  }
  return normalized
}

function normalizeCandidateName(value: string): string {
  const normalized = requireText(value, "Candidate name", 1, 63).toLowerCase()
  if (!DOMAIN_LABEL_PATTERN.test(normalized)) {
    throw new NamingWorkspaceError(
      "invalid_request",
      "Candidate names can only use letters, numbers, and internal hyphens.",
    )
  }
  return normalized
}

function normalizeTier(value: NamingShortlistTier | string | null | undefined): NamingShortlistTier | null {
  if (value === null || value === undefined) return null
  if (!isSupportedTier(value)) {
    throw new NamingWorkspaceError("invalid_request", "Choose a supported shortlist tier.")
  }
  return value
}

function normalizePosition(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isInteger(value) || value < 0 || value > 10000) {
    throw new NamingWorkspaceError("invalid_request", "Position must be a whole number between 0 and 10000.")
  }
  return value
}

function normalizeExpiration(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || parsed <= Date.now()) {
    throw new NamingWorkspaceError("invalid_request", "A report-share expiry must be in the future.")
  }
  return new Date(parsed).toISOString()
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505"
}

function mapProject(project: BrandProjectRow): NamingProject {
  return {
    id: project.id,
    name: project.name,
    selectedBrandName: project.selected_brand_name,
    businessDescription: project.business_description,
    category: project.category,
    locale: project.locale,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }
}

function mapShortlist(shortlist: NamingShortlistRow): NamingShortlist {
  return {
    id: shortlist.id,
    projectId: shortlist.project_id,
    title: shortlist.title,
    primaryTld: normalizeTld(shortlist.primary_tld),
    createdAt: shortlist.created_at,
    updatedAt: shortlist.updated_at,
  }
}

function mapEntry(entry: NamingShortlistEntryRow): NamingShortlistEntry {
  return {
    id: entry.id,
    shortlistId: entry.shortlist_id,
    candidateName: entry.candidate_name,
    primaryDomain: entry.primary_domain,
    availabilitySnapshot: jsonObjectOrEmpty(entry.availability_snapshot),
    founderSignalSnapshot: jsonObjectOrNull(entry.founder_signal_snapshot),
    tier: normalizeTier(entry.tier),
    notes: entry.notes,
    position: entry.position,
    isWinner: entry.is_winner,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  }
}

function mapReport(report: NamingDecisionReportRow): NamingDecisionReport {
  return {
    id: report.id,
    shortlistId: report.shortlist_id,
    title: report.title,
    snapshot: cloneJsonObject(report.snapshot, "Stored report") as NamingDecisionReportSnapshot,
    createdAt: report.created_at,
  }
}

function mapReportShare(share: NamingReportShareTokenRow): NamingReportShare {
  return {
    id: share.id,
    reportId: share.report_id,
    expiresAt: share.expires_at,
    revokedAt: share.revoked_at,
    createdAt: share.created_at,
  }
}

async function getOwnedProject(service: ServiceClient, userId: string, projectId: string) {
  const { data, error } = await service
    .from("brand_projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new NamingWorkspaceError("project_not_found", "This project could not be found.", 404)
  return data
}

async function getOwnedShortlist(service: ServiceClient, userId: string, shortlistId: string) {
  const { data, error } = await service
    .from("naming_shortlists")
    .select("*")
    .eq("id", shortlistId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new NamingWorkspaceError("shortlist_not_found", "This shortlist could not be found.", 404)
  return data
}

async function getOwnedReport(service: ServiceClient, userId: string, reportId: string) {
  const { data, error } = await service
    .from("naming_decision_reports")
    .select("*")
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new NamingWorkspaceError("report_not_found", "This decision report could not be found.", 404)
  return data
}

async function requireAuthenticatedPrincipal(): Promise<NamingWorkspacePrincipal> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new NamingWorkspaceError("authentication_required", "Sign in to access saved naming work.", 401)
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    entitlements: await getUserEntitlements(data.user.id),
  }
}

async function requireProPrincipal(): Promise<NamingWorkspacePrincipal> {
  const principal = await requireAuthenticatedPrincipal()
  if (!principal.entitlements.isPro) {
    throw new NamingWorkspaceError(
      "upgrade_required",
      "Saved decision workspaces are included with NamoLux Pro.",
      403,
    )
  }
  return principal
}

/**
 * Returns the authenticated account and current server-derived entitlement.
 * This intentionally does not initialise the service client itself.
 */
export async function getNamingWorkspacePrincipal(): Promise<NamingWorkspacePrincipal> {
  return requireAuthenticatedPrincipal()
}

/**
 * Read a founder's saved decision work. Read access deliberately remains
 * available after a subscription lapses so founders can export or delete work.
 */
export async function getNamingWorkspaceDashboard(): Promise<NamingWorkspaceDashboard> {
  const principal = await requireAuthenticatedPrincipal()
  const service = createServiceClient()

  const [projectsResult, shortlistsResult, reportsResult] = await Promise.all([
    service
      .from("brand_projects")
      .select("*")
      .eq("user_id", principal.userId)
      .order("updated_at", { ascending: false })
      .limit(100),
    service
      .from("naming_shortlists")
      .select("*")
      .eq("user_id", principal.userId)
      .order("updated_at", { ascending: false })
      .limit(300),
    service
      .from("naming_decision_reports")
      .select("*")
      .eq("user_id", principal.userId)
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  if (projectsResult.error) throw projectsResult.error
  if (shortlistsResult.error) throw shortlistsResult.error
  if (reportsResult.error) throw reportsResult.error

  const shortlists = shortlistsResult.data || []
  const reports = reportsResult.data || []
  const shortlistIds = shortlists.map((shortlist) => shortlist.id)
  const reportIds = reports.map((report) => report.id)

  const [entriesResult, sharesResult] = await Promise.all([
    shortlistIds.length > 0
      ? service
        .from("naming_shortlist_entries")
        .select("*")
        .eq("user_id", principal.userId)
        .in("shortlist_id", shortlistIds)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(5000)
      : Promise.resolve({ data: [] as NamingShortlistEntryRow[], error: null }),
    reportIds.length > 0
      ? service
        .from("naming_report_share_tokens")
        .select("*")
        .eq("user_id", principal.userId)
        .in("report_id", reportIds)
        .order("created_at", { ascending: false })
        .limit(1000)
      : Promise.resolve({ data: [] as NamingReportShareTokenRow[], error: null }),
  ])

  if (entriesResult.error) throw entriesResult.error
  if (sharesResult.error) throw sharesResult.error

  return {
    principal: {
      email: principal.email,
      isPro: principal.entitlements.isPro,
      accessState: principal.entitlements.accessState,
    },
    projects: (projectsResult.data || []).map(mapProject),
    shortlists: shortlists.map(mapShortlist),
    entries: (entriesResult.data || []).map(mapEntry),
    reports: reports.map(mapReport),
    reportShares: (sharesResult.data || []).map(mapReportShare),
  }
}

/**
 * Create a reusable brand-project container for saved name decisions.
 */
export async function createNamingProject(input: CreateNamingProjectInput): Promise<NamingProject> {
  const principal = await requireProPrincipal()
  const service = createServiceClient()

  const { data, error } = await service
    .from("brand_projects")
    .insert({
      user_id: principal.userId,
      name: requireText(input.name, "Project name", 1, 120),
      selected_brand_name: optionalText(input.selectedBrandName, "Selected brand name", 120),
      business_description: optionalText(input.businessDescription, "Business description", 8000),
      category: optionalText(input.category, "Category", 120),
      locale: optionalText(input.locale, "Locale", 64),
    })
    .select("*")
    .single()

  if (error) throw error
  return mapProject(data)
}

export async function updateNamingProject(input: UpdateNamingProjectInput): Promise<NamingProject> {
  const principal = await requireProPrincipal()
  const service = createServiceClient()
  const projectId = requireUuid(input.projectId, "Project")

  await getOwnedProject(service, principal.userId, projectId)

  const update: NamingTables["brand_projects"]["Update"] = {
    updated_at: new Date().toISOString(),
  }
  let hasUpdate = false
  if ("name" in input) {
    update.name = requireText(input.name ?? "", "Project name", 1, 120)
    hasUpdate = true
  }
  if ("selectedBrandName" in input) {
    update.selected_brand_name = optionalText(input.selectedBrandName, "Selected brand name", 120)
    hasUpdate = true
  }
  if ("businessDescription" in input) {
    update.business_description = optionalText(input.businessDescription, "Business description", 8000)
    hasUpdate = true
  }
  if ("category" in input) {
    update.category = optionalText(input.category, "Category", 120)
    hasUpdate = true
  }
  if ("locale" in input) {
    update.locale = optionalText(input.locale, "Locale", 64)
    hasUpdate = true
  }
  if (!hasUpdate) {
    throw new NamingWorkspaceError("invalid_request", "Provide at least one project update.")
  }

  const { data, error } = await service
    .from("brand_projects")
    .update(update)
    .eq("id", projectId)
    .eq("user_id", principal.userId)
    .select("*")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new NamingWorkspaceError("project_not_found", "This project could not be found.", 404)
  return mapProject(data)
}

/**
 * Delete only a naming-only project. brand_projects is shared with the legacy
 * monitoring feature, so a project connected to a monitored site must be
 * removed through that feature rather than silently cascading SEO history.
 */
export async function deleteNamingProject(projectId: string): Promise<void> {
  const principal = await requireAuthenticatedPrincipal()
  const service = createServiceClient()
  const normalizedProjectId = requireUuid(projectId, "Project")

  await getOwnedProject(service, principal.userId, normalizedProjectId)
  const { data: linkedSite, error: linkedSiteError } = await service
    .from("seo_sites")
    .select("id")
    .eq("project_id", normalizedProjectId)
    .eq("user_id", principal.userId)
    .limit(1)
    .maybeSingle()
  if (linkedSiteError) throw linkedSiteError
  if (linkedSite) {
    throw new NamingWorkspaceError(
      "project_in_use",
      "This project is connected to SEO monitoring and cannot be deleted from the naming workspace.",
      409,
    )
  }

  const { data, error } = await service
    .from("brand_projects")
    .delete()
    .eq("id", normalizedProjectId)
    .eq("user_id", principal.userId)
    .select("id")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new NamingWorkspaceError("project_not_found", "This project could not be found.", 404)
}

export async function createNamingShortlist(input: CreateNamingShortlistInput): Promise<NamingShortlist> {
  const principal = await requireProPrincipal()
  const service = createServiceClient()
  const projectId = requireUuid(input.projectId, "Project")

  await getOwnedProject(service, principal.userId, projectId)

  const { data, error } = await service
    .from("naming_shortlists")
    .insert({
      user_id: principal.userId,
      project_id: projectId,
      title: requireText(input.title, "Shortlist title", 1, 120),
      primary_tld: normalizeTld(input.primaryTld),
    })
    .select("*")
    .single()

  if (error) throw error
  return mapShortlist(data)
}

/**
 * The primary extension is chosen before candidates enter a shortlist. Once
 * entries exist it is locked so a report cannot silently compare mixed TLDs.
 */
export async function updateNamingShortlist(input: UpdateNamingShortlistInput): Promise<NamingShortlist> {
  const principal = await requireProPrincipal()
  const service = createServiceClient()
  const shortlistId = requireUuid(input.shortlistId, "Shortlist")
  const current = await getOwnedShortlist(service, principal.userId, shortlistId)

  const update: NamingTables["naming_shortlists"]["Update"] = {
    updated_at: new Date().toISOString(),
  }
  let hasUpdate = false
  if ("title" in input) {
    update.title = requireText(input.title ?? "", "Shortlist title", 1, 120)
    hasUpdate = true
  }
  if ("primaryTld" in input) {
    const primaryTld = normalizeTld(input.primaryTld)
    if (primaryTld !== current.primary_tld) {
      const { data: firstEntry, error: entriesError } = await service
        .from("naming_shortlist_entries")
        .select("id")
        .eq("shortlist_id", shortlistId)
        .eq("user_id", principal.userId)
        .limit(1)
        .maybeSingle()
      if (entriesError) throw entriesError
      if (firstEntry) {
        throw new NamingWorkspaceError(
          "primary_tld_locked",
          "Create a new shortlist to choose a different primary extension after candidates are saved.",
          409,
        )
      }
    }
    update.primary_tld = primaryTld
    hasUpdate = true
  }
  if (!hasUpdate) {
    throw new NamingWorkspaceError("invalid_request", "Provide at least one shortlist update.")
  }

  const { data, error } = await service
    .from("naming_shortlists")
    .update(update)
    .eq("id", shortlistId)
    .eq("user_id", principal.userId)
    .select("*")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new NamingWorkspaceError("shortlist_not_found", "This shortlist could not be found.", 404)
  return mapShortlist(data)
}

export async function createNamingShortlistEntry(
  input: CreateNamingShortlistEntryInput,
): Promise<NamingShortlistEntry> {
  const principal = await requireProPrincipal()
  const service = createServiceClient()
  const shortlistId = requireUuid(input.shortlistId, "Shortlist")
  const shortlist = await getOwnedShortlist(service, principal.userId, shortlistId)
  const candidateName = normalizeCandidateName(input.candidateName)
  const position = normalizePosition(input.position)
  const availabilitySnapshot = input.availabilitySnapshot
    ? cloneJsonObject(input.availabilitySnapshot, "Availability snapshot")
    : {}
  const founderSignalSnapshot = input.founderSignalSnapshot === null
    ? null
    : input.founderSignalSnapshot
      ? cloneJsonObject(input.founderSignalSnapshot, "Founder Signal snapshot")
      : null

  let resolvedPosition = position
  if (resolvedPosition === undefined) {
    const { data: latestEntry, error: latestEntryError } = await service
      .from("naming_shortlist_entries")
      .select("position")
      .eq("shortlist_id", shortlistId)
      .eq("user_id", principal.userId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestEntryError) throw latestEntryError
    resolvedPosition = latestEntry ? Math.min(10000, latestEntry.position + 1) : 0
  }

  const { data, error } = await service
    .from("naming_shortlist_entries")
    .insert({
      user_id: principal.userId,
      shortlist_id: shortlistId,
      candidate_name: candidateName,
      primary_domain: candidateName + "." + normalizeTld(shortlist.primary_tld),
      availability_snapshot: availabilitySnapshot,
      founder_signal_snapshot: founderSignalSnapshot,
      tier: normalizeTier(input.tier),
      notes: optionalText(input.notes, "Notes", 4000),
      position: resolvedPosition,
    })
    .select("*")
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      throw new NamingWorkspaceError(
        "candidate_exists",
        "That candidate is already in this shortlist for the selected domain extension.",
        409,
      )
    }
    throw error
  }
  return mapEntry(data)
}

export async function updateNamingShortlistEntry(
  input: UpdateNamingShortlistEntryInput,
): Promise<NamingShortlistEntry> {
  const principal = await requireProPrincipal()
  const service = createServiceClient()
  const shortlistId = requireUuid(input.shortlistId, "Shortlist")
  const entryId = requireUuid(input.entryId, "Shortlist entry")

  await getOwnedShortlist(service, principal.userId, shortlistId)

  const update: NamingTables["naming_shortlist_entries"]["Update"] = {
    updated_at: new Date().toISOString(),
  }
  let hasUpdate = false

  if ("availabilitySnapshot" in input) {
    update.availability_snapshot = cloneJsonObject(input.availabilitySnapshot, "Availability snapshot")
    hasUpdate = true
  }
  if ("founderSignalSnapshot" in input) {
    update.founder_signal_snapshot = input.founderSignalSnapshot === null
      ? null
      : cloneJsonObject(input.founderSignalSnapshot, "Founder Signal snapshot")
    hasUpdate = true
  }
  if ("tier" in input) {
    update.tier = normalizeTier(input.tier)
    hasUpdate = true
  }
  if ("notes" in input) {
    update.notes = optionalText(input.notes, "Notes", 4000)
    hasUpdate = true
  }
  if ("position" in input) {
    update.position = normalizePosition(input.position)
    hasUpdate = true
  }

  if (!hasUpdate) {
    throw new NamingWorkspaceError("invalid_request", "Provide at least one shortlist-entry update.")
  }

  const { data, error } = await service
    .from("naming_shortlist_entries")
    .update(update)
    .eq("id", entryId)
    .eq("shortlist_id", shortlistId)
    .eq("user_id", principal.userId)
    .select("*")
    .maybeSingle()

  if (error) throw error
  if (!data) throw new NamingWorkspaceError("entry_not_found", "This shortlist entry could not be found.", 404)
  return mapEntry(data)
}

export async function deleteNamingShortlistEntry(input: {
  shortlistId: string
  entryId: string
}): Promise<void> {
  const principal = await requireAuthenticatedPrincipal()
  const service = createServiceClient()
  const shortlistId = requireUuid(input.shortlistId, "Shortlist")
  const entryId = requireUuid(input.entryId, "Shortlist entry")

  await getOwnedShortlist(service, principal.userId, shortlistId)
  const { data, error } = await service
    .from("naming_shortlist_entries")
    .delete()
    .eq("id", entryId)
    .eq("shortlist_id", shortlistId)
    .eq("user_id", principal.userId)
    .select("id")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new NamingWorkspaceError("entry_not_found", "This shortlist entry could not be found.", 404)
}

/**
 * A shortlist may have at most one winner. The partial unique index in the
 * migration is the final guard; a bounded retry handles two simultaneous
 * server requests that choose different winners.
 */
export async function setNamingShortlistWinner(input: {
  shortlistId: string
  entryId: string
}): Promise<NamingShortlistEntry> {
  const principal = await requireProPrincipal()
  const service = createServiceClient()
  const shortlistId = requireUuid(input.shortlistId, "Shortlist")
  const entryId = requireUuid(input.entryId, "Shortlist entry")

  await getOwnedShortlist(service, principal.userId, shortlistId)
  const { data: existing, error: existingError } = await service
    .from("naming_shortlist_entries")
    .select("id")
    .eq("id", entryId)
    .eq("shortlist_id", shortlistId)
    .eq("user_id", principal.userId)
    .maybeSingle()
  if (existingError) throw existingError
  if (!existing) throw new NamingWorkspaceError("entry_not_found", "This shortlist entry could not be found.", 404)

  let lastUniqueViolation: unknown = null
  for (let attempt = 0; attempt <= MAX_WINNER_RETRIES; attempt += 1) {
    const updatedAt = new Date().toISOString()
    const { error: clearError } = await service
      .from("naming_shortlist_entries")
      .update({ is_winner: false, updated_at: updatedAt })
      .eq("shortlist_id", shortlistId)
      .eq("user_id", principal.userId)
      .eq("is_winner", true)
    if (clearError) throw clearError

    const { data, error } = await service
      .from("naming_shortlist_entries")
      .update({ is_winner: true, updated_at: updatedAt })
      .eq("id", entryId)
      .eq("shortlist_id", shortlistId)
      .eq("user_id", principal.userId)
      .select("*")
      .maybeSingle()

    if (!error && data) return mapEntry(data)
    if (!isUniqueViolation(error)) {
      if (error) throw error
      throw new NamingWorkspaceError("entry_not_found", "This shortlist entry could not be found.", 404)
    }
    lastUniqueViolation = error
  }

  throw lastUniqueViolation
}

export function buildNamingDecisionReportSnapshot(input: {
  project: NamingProject
  shortlist: NamingShortlist
  entries: NamingShortlistEntry[]
  generatedAt?: string
}): NamingDecisionReportSnapshot {
  const generatedAt = input.generatedAt || new Date().toISOString()
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new NamingWorkspaceError("invalid_request", "A valid report timestamp is required.")
  }

  return JSON.parse(JSON.stringify({
    schemaVersion: 1,
    generatedAt,
    project: {
      id: input.project.id,
      name: input.project.name,
      selectedBrandName: input.project.selectedBrandName,
      businessDescription: input.project.businessDescription,
      category: input.project.category,
      locale: input.project.locale,
    },
    shortlist: {
      id: input.shortlist.id,
      title: input.shortlist.title,
      primaryTld: input.shortlist.primaryTld,
      createdAt: input.shortlist.createdAt,
      updatedAt: input.shortlist.updatedAt,
    },
    entries: input.entries.map((entry) => ({
      id: entry.id,
      candidateName: entry.candidateName,
      primaryDomain: entry.primaryDomain,
      availabilitySnapshot: entry.availabilitySnapshot,
      founderSignalSnapshot: entry.founderSignalSnapshot,
      tier: entry.tier,
      notes: entry.notes,
      position: entry.position,
      isWinner: entry.isWinner,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
  })) as NamingDecisionReportSnapshot
}

export async function createNamingDecisionReport(
  input: CreateNamingDecisionReportInput,
): Promise<NamingDecisionReport> {
  const principal = await requireProPrincipal()
  const service = createServiceClient()
  const shortlistId = requireUuid(input.shortlistId, "Shortlist")
  const shortlistRow = await getOwnedShortlist(service, principal.userId, shortlistId)
  const projectRow = await getOwnedProject(service, principal.userId, shortlistRow.project_id)

  const { data: entryRows, error: entriesError } = await service
    .from("naming_shortlist_entries")
    .select("*")
    .eq("shortlist_id", shortlistId)
    .eq("user_id", principal.userId)
    .order("is_winner", { ascending: false })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(50)
  if (entriesError) throw entriesError

  const shortlist = mapShortlist(shortlistRow)
  const snapshot = buildNamingDecisionReportSnapshot({
    project: mapProject(projectRow),
    shortlist,
    entries: (entryRows || []).map(mapEntry),
  })
  const title = input.title === undefined
    ? shortlist.title + " decision report"
    : requireText(input.title, "Report title", 1, 160)

  const { data, error } = await service
    .from("naming_decision_reports")
    .insert({
      user_id: principal.userId,
      shortlist_id: shortlistId,
      title,
      snapshot: snapshot as unknown as Json,
    })
    .select("*")
    .single()

  if (error) throw error
  return mapReport(data)
}

/**
 * Hashes the opaque share capability before it ever reaches Supabase. Tokens
 * are 256 bits of entropy when generated by createNamingDecisionReportShare.
 */
export function hashNamingWorkspaceShareToken(token: string): string {
  if (!SHARE_TOKEN_PATTERN.test(token)) {
    throw new NamingWorkspaceError("invalid_share_token", "This report link is not valid.", 404)
  }
  return createHash("sha256").update(token).digest("hex")
}

export async function createNamingDecisionReportShare(
  input: CreateNamingReportShareInput,
): Promise<CreatedNamingReportShare> {
  const principal = await requireProPrincipal()
  const service = createServiceClient()
  const reportId = requireUuid(input.reportId, "Decision report")
  const expiresAt = normalizeExpiration(input.expiresAt)

  await getOwnedReport(service, principal.userId, reportId)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomBytes(SHARE_TOKEN_BYTES).toString("base64url")
    const tokenHash = hashNamingWorkspaceShareToken(token)
    const { data, error } = await service
      .from("naming_report_share_tokens")
      .insert({
        user_id: principal.userId,
        report_id: reportId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select("*")
      .single()

    if (!error) {
      return {
        ...mapReportShare(data),
        token,
      }
    }
    if (!isUniqueViolation(error) || attempt === 2) throw error
  }

  throw new NamingWorkspaceError("share_creation_failed", "A secure report link could not be created.", 500)
}

/**
 * A revocation remains available to signed-in lapsed users, alongside read and
 * delete operations, so access to prior decision work can always be removed.
 */
export async function revokeNamingDecisionReportShare(shareId: string): Promise<NamingReportShare> {
  const principal = await requireAuthenticatedPrincipal()
  const service = createServiceClient()
  const normalizedShareId = requireUuid(shareId, "Report share")
  const { data: existing, error: existingError } = await service
    .from("naming_report_share_tokens")
    .select("*")
    .eq("id", normalizedShareId)
    .eq("user_id", principal.userId)
    .maybeSingle()
  if (existingError) throw existingError
  if (!existing) throw new NamingWorkspaceError("report_share_not_found", "This report share could not be found.", 404)
  if (existing.revoked_at) return mapReportShare(existing)

  const { data, error } = await service
    .from("naming_report_share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", normalizedShareId)
    .eq("user_id", principal.userId)
    .select("*")
    .single()
  if (error) throw error
  return mapReportShare(data)
}

export async function deleteNamingShortlist(shortlistId: string): Promise<void> {
  const principal = await requireAuthenticatedPrincipal()
  const service = createServiceClient()
  const normalizedShortlistId = requireUuid(shortlistId, "Shortlist")
  const { data, error } = await service
    .from("naming_shortlists")
    .delete()
    .eq("id", normalizedShortlistId)
    .eq("user_id", principal.userId)
    .select("id")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new NamingWorkspaceError("shortlist_not_found", "This shortlist could not be found.", 404)
}

export async function deleteNamingDecisionReport(reportId: string): Promise<void> {
  const principal = await requireAuthenticatedPrincipal()
  const service = createServiceClient()
  const normalizedReportId = requireUuid(reportId, "Decision report")
  const { data, error } = await service
    .from("naming_decision_reports")
    .delete()
    .eq("id", normalizedReportId)
    .eq("user_id", principal.userId)
    .select("id")
    .maybeSingle()
  if (error) throw error
  if (!data) throw new NamingWorkspaceError("report_not_found", "This decision report could not be found.", 404)
}

/**
 * Capability-token access for a future no-login report route. This is the
 * single exception to authenticated owner access: a valid, unrevoked token is
 * the authorisation proof. The browser never queries these tables directly.
 */
export async function getSharedNamingDecisionReport(token: string): Promise<SharedNamingDecisionReport> {
  let tokenHash: string
  try {
    tokenHash = hashNamingWorkspaceShareToken(token)
  } catch {
    throw new NamingWorkspaceError("report_not_found", "This shared report is unavailable.", 404)
  }

  const service = createServiceClient()
  const { data: share, error: shareError } = await service
    .from("naming_report_share_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle()
  if (shareError) throw shareError

  const expiresAt = share?.expires_at ? Date.parse(share.expires_at) : Number.NaN
  if (!share || share.revoked_at || (Number.isFinite(expiresAt) && expiresAt <= Date.now())) {
    throw new NamingWorkspaceError("report_not_found", "This shared report is unavailable.", 404)
  }

  const { data: report, error: reportError } = await service
    .from("naming_decision_reports")
    .select("*")
    .eq("id", share.report_id)
    .eq("user_id", share.user_id)
    .maybeSingle()
  if (reportError) throw reportError
  if (!report) throw new NamingWorkspaceError("report_not_found", "This shared report is unavailable.", 404)

  const mapped = mapReport(report)
  return {
    id: mapped.id,
    title: mapped.title,
    snapshot: mapped.snapshot,
    createdAt: mapped.createdAt,
  }
}
