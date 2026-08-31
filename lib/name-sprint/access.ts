import "server-only"

import {
  FREE_NAME_SPRINT_DAILY_LIMIT,
  PRO_NAME_SPRINT_MONTHLY_LIMIT,
} from "@/lib/plans"
import type {
  PlanFeatureQuotaLimits,
  PlanFeatureQuotaPeriods,
  QuotaPeriod,
  QuotaSubject,
} from "@/lib/rate-limit"
import {
  checkPlanFeatureQuotaIdempotentForSubject,
  getPlanFeatureQuotaStateForSubject,
  refundPlanFeatureQuotaIdempotentForSubject,
} from "@/lib/rate-limit"

export const NAME_SPRINT_FEATURE = "name-sprint"
export const NAME_SPRINT_BRIEF_FEATURE = "name-sprint-brief"
export const NAME_SPRINT_EMPTY_REFUND_FEATURE = "name-sprint-empty-refund"
export const NAME_SPRINT_LIMITS: PlanFeatureQuotaLimits = {
  free: FREE_NAME_SPRINT_DAILY_LIMIT,
  pro: PRO_NAME_SPRINT_MONTHLY_LIMIT,
}
export const NAME_SPRINT_PERIODS: PlanFeatureQuotaPeriods = {
  free: "day",
  pro: "month",
}
const NAME_SPRINT_BRIEF_LIMITS: PlanFeatureQuotaLimits = { free: 3, pro: 80 }
const NAME_SPRINT_EMPTY_REFUND_LIMITS: PlanFeatureQuotaLimits = { free: 1, pro: 1 }
const DAILY_PERIODS: PlanFeatureQuotaPeriods = { free: "day", pro: "day" }

export function nameSprintPeriod(subject: QuotaSubject): QuotaPeriod {
  return NAME_SPRINT_PERIODS[subject.plan]
}

export function getNameSprintQuotaState(subject: QuotaSubject) {
  return getPlanFeatureQuotaStateForSubject(
    subject,
    NAME_SPRINT_FEATURE,
    NAME_SPRINT_LIMITS,
    NAME_SPRINT_PERIODS,
  )
}

export function consumeNameSprintQuota(subject: QuotaSubject, idempotencyKey: string) {
  return checkPlanFeatureQuotaIdempotentForSubject(
    subject,
    NAME_SPRINT_FEATURE,
    NAME_SPRINT_LIMITS,
    idempotencyKey,
    NAME_SPRINT_PERIODS,
  )
}

export function consumeNameSprintBriefQuota(subject: QuotaSubject, idempotencyKey: string) {
  return checkPlanFeatureQuotaIdempotentForSubject(
    subject,
    NAME_SPRINT_BRIEF_FEATURE,
    NAME_SPRINT_BRIEF_LIMITS,
    idempotencyKey,
    NAME_SPRINT_PERIODS,
  )
}

export function refundNameSprintBriefQuota(subject: QuotaSubject, idempotencyKey: string) {
  return refundPlanFeatureQuotaIdempotentForSubject(
    subject,
    NAME_SPRINT_BRIEF_FEATURE,
    idempotencyKey,
    nameSprintPeriod(subject),
  )
}

export function refundNameSprintQuota(subject: QuotaSubject, idempotencyKey: string) {
  return refundPlanFeatureQuotaIdempotentForSubject(
    subject,
    NAME_SPRINT_FEATURE,
    idempotencyKey,
    nameSprintPeriod(subject),
  )
}

/** Reserves the single zero-result allowance refund available each UTC day. */
export function consumeNameSprintEmptyRefundAllowance(subject: QuotaSubject, idempotencyKey: string) {
  return checkPlanFeatureQuotaIdempotentForSubject(
    subject,
    NAME_SPRINT_EMPTY_REFUND_FEATURE,
    NAME_SPRINT_EMPTY_REFUND_LIMITS,
    idempotencyKey,
    DAILY_PERIODS,
  )
}
