const FATAL_AUTH_MESSAGES = new Set([
  "token.expired",
  "token.invalid",
  "token.invalid_token",
  "token.not_found",
  "invalid.refresh_token",
])

// Fatal (re-login): HTTP 4xx except 429, or a local verify error thrown before the request.
// Transient (retry/backoff): network error (no status), 5xx, 429.
export const isFatalAuthError = error => {
  if (typeof error?.status === "number") {
    return error.status >= 400 && error.status < 500 && error.status !== 429
  }

  return FATAL_AUTH_MESSAGES.has(error?.message)
}
