/**
 * Server-controlled rollout gate for the candidate-first generator.
 *
 * Keep this flag off by default so an unconfigured deployment preserves the
 * established generator. The value is passed to client components as a plain
 * boolean; the environment variable itself is never exposed to the browser.
 */
export function isGeneratorRedesignEnabled(): boolean {
  return process.env.GENERATOR_REDESIGN_V2?.trim().toLowerCase() === "true"
}

/** V3 is the lab-only, guided generation workflow. */
export function isGeneratorLabV3Enabled(): boolean {
  return process.env.NAMOLUX_GENERATOR_LAB_V3?.trim().toLowerCase() === "true"
}

/**
 * A server-only emergency hold for every Quick Generate style while its
 * admission criteria are being repaired. It deliberately does not change the
 * public response shape, stored user data, quotas, or any Advanced/Founder
 * Signal behaviour.
 *
 * The hold is opt-in and is intended to be removed as soon as preview quality
 * acceptance passes. Returning an honest retryable response is safer than
 * publishing a weak, normal-looking shortlist.
 */
export function isQuickAutoEmergencyHoldEnabled(): boolean {
  return process.env.QUICK_GENERATE_EMERGENCY_HOLD?.trim().toLowerCase() === "true"
}

/**
 * A server-only emergency hold for Advanced Generate and Auto-find. It is
 * intentionally separate from the Quick hold so either surface can recover
 * independently after its own quality acceptance checks pass.
 */
export function isAdvancedGenerateEmergencyHoldEnabled(): boolean {
  return process.env.ADVANCED_GENERATE_EMERGENCY_HOLD?.trim().toLowerCase() === "true"
}
