/**
 * PEIT Modal API Client
 *
 * Handles communication with the Modal.com serverless backend for geospatial processing.
 * Uses Server-Sent Events (SSE) for real-time progress streaming.
 */

import type { ProcessingConfig } from "@/components/config-panel"
import type { ProgressUpdate } from "@/components/processing-status"

import { isAuthRetryableFetchError } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/client"

/**
 * Thrown when we cannot verify the session against the Supabase server due to a
 * transient/network failure WHILE a local session token still exists. In that
 * case the user believes they are logged in, so we must NOT silently downgrade
 * the request to the anonymous rate-limit tier. Surfacing this error lets the
 * existing processFile error path prompt the user to retry.
 */
class AuthValidationError extends Error {
  constructor() {
    super("Couldn't verify your session. Please check your connection and try again.")
    this.name = "AuthValidationError"
  }
}

// API URL from environment variable (set in .env.local)
const API_URL = process.env.NEXT_PUBLIC_MODAL_API_URL || ""

/**
 * Get the current Supabase access token for authenticated API requests.
 * Returns null if user is not authenticated.
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

/**
 * Build authorization headers for authenticated API requests.
 * Returns headers with Bearer token if available, otherwise empty.
 *
 * Used by strictly-authenticated endpoints (claim-jobs, delete-job) where
 * sending the stored token unconditionally is fine — a stale token simply
 * 401s, which is the correct outcome for those auth-required calls.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/**
 * Build authorization headers for anonymous-capable endpoints (e.g. /api/process).
 *
 * `getSession()` reads the stored session WITHOUT validating it against the
 * Supabase server, so a stale/expired session would attach a Bearer token that
 * the backend rejects with a hard 401 — blocking the intended fall-through to
 * the anonymous rate-limit path. `getUser()` validates (and refreshes) the
 * session server-side, so we only attach the token when a valid user is
 * confirmed; otherwise we omit it and let the request proceed anonymously.
 *
 * We must, however, distinguish a genuinely-invalid session from a transient
 * failure. A stale/expired/absent session (definitive auth rejection, or no
 * local session at all) correctly falls through to the anonymous path. But a
 * transient network/offline blip while a local session token still exists must
 * NOT silently downgrade a logged-in user to the 4/day anonymous IP tier (and
 * strand their job with `user_id = None`). In that case we throw
 * `AuthValidationError` so processFile surfaces a retry-able error instead.
 */
async function getValidatedAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  try {
    // Validates the session against the Supabase server, refreshing if possible.
    const { data: { user }, error } = await supabase.auth.getUser()

    if (!error && user) {
      // Session is valid; read the (possibly refreshed) access token to send.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!sessionError && session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` }
      }
      // getUser() already CONFIRMED a valid user, so a missing token or a
      // getSession() error here is a transient/racy read — NOT a definitive
      // logged-out state. Throw (retryable) so processFile surfaces a retry
      // instead of silently downgrading a validated user to the anonymous tier.
      throw new AuthValidationError()
    }

    // getUser() reported an error. Treat only a retryable/network failure that
    // occurs WHILE a local session token still exists as transient (throw). A
    // definitive auth error (invalid/expired/absent session) — or the absence of
    // any local session — falls through to the anonymous path.
    if (error && isAuthRetryableFetchError(error) && (await getAuthToken())) {
      throw new AuthValidationError()
    }
    return {}
  } catch (err) {
    if (err instanceof AuthValidationError) throw err
    // getUser() threw outright (e.g. an offline fetch TypeError). Only block the
    // anonymous downgrade — by throwing — when a local session token exists, so
    // a genuinely logged-out user still proceeds anonymously.
    if (await getAuthToken()) {
      throw new AuthValidationError()
    }
    return {}
  }
}

/**
 * Check if we're using mock mode (no API URL configured)
 */
export function isUsingMockMode(): boolean {
  return !API_URL
}

/**
 * Rate limit information from the API
 */
export interface RateLimitInfo {
  remaining_runs: number
  max_runs_per_day: number
  global_remaining_runs: number
  max_global_runs_per_day: number
  resets_at: string
}

/**
 * Result of file processing
 */
export interface ProcessingResult {
  success: boolean
  jobId?: string
  downloadUrl?: string
  mapUrl?: string
  mapBlobUrl?: string
  pdfUrl?: string
  xlsxUrl?: string
  error?: string
}

/**
 * Result of claiming jobs
 */
export interface ClaimJobsResult {
  success: boolean
  claimedCount?: number
  error?: string
}

/**
 * Result of deleting a job
 */
export interface DeleteJobResult {
  success: boolean
  error?: string
}

/**
 * Check API health status
 */
export async function checkHealth(): Promise<boolean> {
  if (!API_URL) return false

  try {
    const response = await fetch(`${API_URL}/api/health`, {
      method: "GET",
    })
    const data = await response.json()
    return data.status === "healthy"
  } catch {
    return false
  }
}

/**
 * Get rate limit status for the current user
 */
export async function getRateLimitStatus(): Promise<RateLimitInfo | null> {
  if (!API_URL) return null

  try {
    const response = await fetch(`${API_URL}/api/rate-limit`, {
      method: "GET",
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Parse SSE event data
 */
function parseSSEEvent(data: string): ProgressUpdate | null {
  try {
    // SSE format: "data: {...}\n\n"
    const lines = data.split("\n")
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6) // Remove "data: " prefix
        return JSON.parse(jsonStr)
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Process a geospatial file with progress streaming
 *
 * @param file - The file to process
 * @param config - Processing configuration options
 * @param userId - Optional user ID for authenticated users (associates job with user)
 * @param onProgress - Callback for progress updates
 * @returns Processing result with download URL on success
 */
export async function processFile(
  file: File,
  config: ProcessingConfig,
  userId: string | null,
  onProgress: (update: ProgressUpdate) => void
): Promise<ProcessingResult> {
  if (!API_URL) {
    return {
      success: false,
      error: "API URL not configured. Using mock mode.",
    }
  }

  // Build form data
  const formData = new FormData()
  formData.append("file", file)
  formData.append("project_name", config.projectName)
  formData.append("project_id", config.projectId)
  formData.append("buffer_distance_feet", config.bufferDistanceFeet.toString())
  formData.append("clip_buffer_miles", config.clipBufferMiles.toString())

  // User identity is derived server-side from the verified JWT, never from the
  // request body. Send the Bearer token when authenticated; the backend ignores
  // any user_id in the form. (userId is retained in the signature for callers
  // but is intentionally not trusted for authorization.)
  void userId

  try {
    // Validate the session before attaching a token so a stale/expired session
    // falls through to the anonymous path instead of hard-failing with a 401.
    const authHeaders = await getValidatedAuthHeaders()
    const response = await fetch(`${API_URL}/api/process`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    })

    // Check for rate limit error
    if (response.status === 429) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || "Rate limit exceeded. Please try again tomorrow.",
      }
    }

    // Check for other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.detail || `Server error: ${response.status}`,
      }
    }

    // Read SSE stream
    const reader = response.body?.getReader()
    if (!reader) {
      return {
        success: false,
        error: "Failed to read response stream",
      }
    }

    const decoder = new TextDecoder()
    let buffer = ""
    let lastUpdate: ProgressUpdate | null = null

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete events (separated by double newline)
      const events = buffer.split("\n\n")
      buffer = events.pop() || "" // Keep incomplete event in buffer

      for (const eventData of events) {
        if (!eventData.trim()) continue

        const update = parseSSEEvent(eventData)
        if (update) {
          lastUpdate = update
          onProgress(update)

          // Check for error
          if (update.stage === "error") {
            return {
              success: false,
              error: update.error || update.message,
            }
          }

          // Check for completion
          if (update.stage === "complete") {
            // Extract URLs from the update
            const extendedUpdate = update as ProgressUpdate & {
              download_url?: string
              job_id?: string
              map_url?: string
              map_blob_url?: string
              pdf_url?: string
              xlsx_url?: string
            }

            return {
              success: true,
              jobId: extendedUpdate.job_id,
              downloadUrl: extendedUpdate.download_url ? `${API_URL}${extendedUpdate.download_url}` : undefined,
              mapUrl: extendedUpdate.map_url,
              mapBlobUrl: extendedUpdate.map_blob_url,
              pdfUrl: extendedUpdate.pdf_url,
              xlsxUrl: extendedUpdate.xlsx_url,
            }
          }
        }
      }
    }

    // If we got here without a complete event, check last update
    if (lastUpdate?.stage === "complete") {
      const extendedUpdate = lastUpdate as ProgressUpdate & {
        download_url?: string
        job_id?: string
        map_url?: string
        map_blob_url?: string
        pdf_url?: string
        xlsx_url?: string
      }

      return {
        success: true,
        jobId: extendedUpdate.job_id,
        downloadUrl: extendedUpdate.download_url ? `${API_URL}${extendedUpdate.download_url}` : undefined,
        mapUrl: extendedUpdate.map_url,
        mapBlobUrl: extendedUpdate.map_blob_url,
        pdfUrl: extendedUpdate.pdf_url,
        xlsxUrl: extendedUpdate.xlsx_url,
      }
    }

    return {
      success: false,
      error: "Processing ended without completion status",
    }
  } catch (error) {
    // A transient session-verification failure (logged-in user, network blip) is
    // surfaced with its own clear message via the existing error-state path,
    // rather than being silently downgraded to an anonymous upload.
    if (error instanceof AuthValidationError) {
      return {
        success: false,
        error: error.message,
      }
    }
    const message = error instanceof Error ? error.message : "Unknown error occurred"
    return {
      success: false,
      error: `Network error: ${message}`,
    }
  }
}

/**
 * Download results for a completed job
 *
 * @param downloadUrl - Full URL to the download endpoint
 */
export async function downloadResults(downloadUrl: string): Promise<void> {
  try {
    const response = await fetch(downloadUrl)

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`)
    }

    // Get filename from Content-Disposition header or URL
    const contentDisposition = response.headers.get("Content-Disposition")
    let filename = "peit_results.zip"

    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (match) {
        filename = match[1].replace(/['"]/g, "")
      }
    }

    // Create blob and trigger download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Download error:", error)
    throw error
  }
}

/**
 * Claim unclaimed jobs for a newly authenticated user
 *
 * @param userId - The authenticated user's ID
 * @param jobIds - Array of job IDs to claim
 * @returns Result with number of jobs claimed
 */
export async function claimJobs(
  userId: string,
  jobIds: string[]
): Promise<ClaimJobsResult> {
  if (!API_URL) {
    return {
      success: false,
      error: "API URL not configured",
    }
  }

  if (!jobIds || jobIds.length === 0) {
    return {
      success: true,
      claimedCount: 0,
    }
  }

  try {
    const authHeaders = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/claim-jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        job_ids: jobIds,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.detail || `Server error: ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      claimedCount: data.claimed_count || 0,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred"
    return {
      success: false,
      error: `Network error: ${message}`,
    }
  }
}

/**
 * Nominatim response structure for reverse geocoding
 */
export interface NominatimResponse {
  lat: string
  lon: string
  display_name: string
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    country?: string
    country_code?: string
  }
  error?: string
}

/**
 * Reverse geocode coordinates via backend proxy
 *
 * This proxies requests through our Modal backend to avoid CORS issues
 * with Nominatim's public API (which doesn't include CORS headers).
 *
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns Nominatim response or null on error
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<NominatimResponse | null> {
  if (!API_URL) return null

  try {
    const response = await fetch(
      `${API_URL}/api/reverse-geocode?lat=${lat}&lon=${lon}`
    )
    if (!response.ok) return null

    const data = await response.json()
    if (data.error) {
      console.warn("Geocoding error:", data.error)
      return null
    }
    return data
  } catch (error) {
    console.warn("Reverse geocode failed:", error)
    return null
  }
}

/**
 * Delete a job and all associated data (map, reports, storage)
 *
 * @param jobId - The job ID to delete
 * @param userId - The authenticated user's ID (must own the job)
 * @returns Result with success status
 */
export async function deleteJob(
  jobId: string,
  userId: string
): Promise<DeleteJobResult> {
  if (!API_URL) {
    return {
      success: false,
      error: "API URL not configured",
    }
  }

  try {
    const authHeaders = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.detail || `Error: ${response.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred"
    return {
      success: false,
      error: `Network error: ${message}`,
    }
  }
}
