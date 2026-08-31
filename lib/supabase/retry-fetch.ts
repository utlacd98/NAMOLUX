const POSTGREST_CLOCK_SKEW_CODE = "PGRST303"
const DEFAULT_CLOCK_SKEW_RETRY_MS = 1_500

type FetchLike = typeof fetch

async function isPostgrestClockSkewResponse(response: Response): Promise<boolean> {
  if (response.status !== 401) return false

  try {
    const payload = await response.clone().json() as { code?: unknown; message?: unknown }
    return payload.code === POSTGREST_CLOCK_SKEW_CODE
      && typeof payload.message === "string"
      && payload.message.toLowerCase().includes("issued at future")
  } catch {
    return false
  }
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

/**
 * Supabase's managed Auth and PostgREST services can briefly disagree about
 * the current time immediately after a JWT is minted. PostgREST rejects that
 * request before it reaches the database with PGRST303. Retry that one exact
 * pre-execution failure once; all other responses pass through untouched.
 */
export function createSupabaseRetryFetch(options: {
  fetchImpl?: FetchLike
  retryDelayMs?: number
  delay?: (milliseconds: number) => Promise<void>
} = {}): FetchLike {
  const fetchImpl = options.fetchImpl || fetch
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_CLOCK_SKEW_RETRY_MS
  const delay = options.delay || wait

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetchImpl(input, init)
    if (!await isPostgrestClockSkewResponse(response)) return response

    await delay(retryDelayMs)
    return fetchImpl(input, init)
  }) as FetchLike
}
