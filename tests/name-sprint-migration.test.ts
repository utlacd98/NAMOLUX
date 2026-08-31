import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const migration = readFileSync("supabase/migrations/20260830235959_name_sprint_foundation.sql", "utf8")

describe("Name Sprint database boundary", () => {
  it.each(["naming_briefs", "generation_runs", "candidates", "candidate_checks", "collision_registry", "benchmark_cases"])("enables RLS and denies browser roles for %s", (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security;`)
    expect(migration).toContain(`revoke all on public.${table} from public, anon, authenticated;`)
    expect(migration).toContain(`grant select, insert, update, delete on public.${table} to service_role;`)
  })

  it("versions the registry and seeds the known published collisions", () => {
    expect(migration).toContain("'2026.08.30.1'")
    expect(migration).toContain("('anker', 'Anker'")
    expect(migration).toContain("('nucleus', 'Nucleus'")
  })

  it("persists the generation provenance required for cost and quality audits", () => {
    for (const column of ["model", "prompt_version", "founder_signal_version", "collision_registry_version", "input_tokens", "output_tokens", "estimated_cost_usd", "latency_ms", "retry_count", "generated_count", "survivor_count"]) {
      expect(migration).toContain(column)
    }
  })
})
