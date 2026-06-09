import { decode, verify } from "../lib/jwt"
import { isFatalAuthError } from "../lib/authErrors"

export class AutherClient {
  #location = window.location

  #INITIATE_PATH = "/tokens/initiate"
  #REVOKE_PATH = "/tokens/revoke"
  #REFRESH_PATH = "/tokens/refresh"
  #LOGIN_PATH = "/login"
  #DISPOSABLE_TOKEN_PATH = "/tokens/disposable"

  #MAX_BACKOFF = 30_000
  #TRANSIENT_REPORT_THRESHOLD = 5

  #refreshTimer = null
  #scheduleCtx = null
  #lifecycleCleanup = null
  #retries = 0
  #reportedTransient = false

  constructor ({ redirectUri, autherUrl, http, appcode, logger }) {
    this.redirectUri = redirectUri
    this.autherUrl = autherUrl
    this.http = http
    this.appcode = appcode
    this.logger = logger
  }

  #buildOauthUrl = () => {
    const returnUrl = new URL(this.redirectUri)
    const redirectUrl = new URL(this.#LOGIN_PATH, this.autherUrl)

    redirectUrl.searchParams.append("return_url", returnUrl)
    redirectUrl.searchParams.append("appcode", this.appcode)

    return redirectUrl.toString()
  }

  refreshTokens = async ({ getTokens, saveTokens }) => {
    const tokenBefore = getTokens().refreshToken

    const doRefresh = async () => {
      const { refreshToken } = getTokens()

      if (refreshToken !== tokenBefore) {
        return getTokens()
      }

      verify(refreshToken)
      const response = await this.updateTokens(refreshToken)

      if (!response.ok) {
        const error = new Error("refresh.failed")
        error.status = response.status
        try {
          const body = await response.clone().json()
          if (body?.code) error.serverCode = body.code
        }
        catch {}
        throw error
      }

      const tokens = await response.json()
      saveTokens(tokens)
      this.logger.log(`Token has been refreshed successfully at ${new Date().toUTCString()}`)
      return tokens
    }

    if (typeof navigator !== "undefined" && navigator.locks) {
      return navigator.locks.request("auth_refresh", doRefresh)
    }

    return doRefresh()
  }

  login = () => {
    return this.#location.replace(this.#buildOauthUrl())
  }

  logout = accessToken => {
    if (!accessToken) {
      throw new Error("invalid.access_token")
    }

    return this.http({
      path: this.#REVOKE_PATH,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  fetchTokens = authorizationCode => {
    if (!authorizationCode) {
      throw new Error("invalid.authorization_code")
    }

    return this.http({
      path: this.#INITIATE_PATH,
      body: { authorization_code: authorizationCode },
    })
  }

  updateTokens = refreshToken => {
    if (!refreshToken) {
      throw new Error("invalid.refresh_token")
    }

    return this.http({ path: this.#REFRESH_PATH, body: { refreshToken } })
  }

  authentication = async ({ getTokens, saveTokens }) => {
    const { accessToken } = getTokens()
    try {
      verify(accessToken)
    }
    catch (err) {
      await this.refreshTokens({ getTokens, saveTokens })
    }
  }

  fetchDisposableTokensById = ({ id, headers }) => {
    if (!headers) {
      throw new Error("invalid.headers")
    }

    if (!id) {
      throw new Error("invalid.auther_id")
    }

    return this.http({
      path: this.#DISPOSABLE_TOKEN_PATH,
      body: { id },
      headers,
    })
  }

  #computeDelay = () => {
    const { getTokens, ratio, minBuffer } = this.#scheduleCtx
    const { payload } = decode(getTokens().accessToken) // exp/iat in seconds
    const now = Date.now()
    const byRatio = (payload.iat + (payload.exp - payload.iat) * ratio) * 1000
    const byBuffer = payload.exp * 1000 - minBuffer

    return Math.max(0, Math.min(byRatio, byBuffer) - now)
  }

  #tick = async () => {
    // Pin the context this tick belongs to. refreshTokens() awaits, and during that
    // await the host may stopScheduledRefresh() (or restart with a fresh context).
    // If that happened, this tick is stale: bail out so we neither re-arm a timer
    // nor invoke callbacks that the host already detached.
    const ctx = this.#scheduleCtx
    const { getTokens, saveTokens, onError, onTransientFailure } = ctx

    try {
      await this.refreshTokens({ getTokens, saveTokens })
      if (this.#scheduleCtx !== ctx) return
      this.#retries = 0
      this.#reportedTransient = false
      this.reschedule() // from the new exp
    }
    catch (error) {
      if (this.#scheduleCtx !== ctx) return

      // Fatal auth error (4xx: 422 reuse, expired refresh) → re-login. The session is
      // dead, so fully tear down: drop the lifecycle listeners too, otherwise a later
      // focus/online would wake the scheduler and hammer the doomed refresh again.
      // stopScheduledRefresh also resets #retries / #reportedTransient.
      if (isFatalAuthError(error)) {
        this.stopScheduledRefresh()
        onError?.(error)
        return
      }

      // Transient (network/5xx): retry with exponential backoff.
      const backoff = Math.min(this.#MAX_BACKOFF, 1000 * 2 ** this.#retries)
      this.#retries += 1

      // Report a persisting outage once per series.
      if (this.#retries >= this.#TRANSIENT_REPORT_THRESHOLD && !this.#reportedTransient) {
        this.#reportedTransient = true
        error.attempts = this.#retries
        onTransientFailure?.(error)
      }

      clearTimeout(this.#refreshTimer)
      this.#refreshTimer = setTimeout(this.#tick, backoff)
    }
  }

  // Public: called both internally (after a tick) and from the host app (cross-tab resync).
  reschedule = () => {
    if (!this.#scheduleCtx) return

    clearTimeout(this.#refreshTimer)

    let delay
    try {
      delay = this.#computeDelay()
    }
    catch (error) {
      // Missing/broken token — do not schedule, surface to the host app.
      this.#scheduleCtx.onError?.(error)
      return
    }

    this.#refreshTimer = setTimeout(this.#tick, delay)
  }

  startScheduledRefresh = ({
    getTokens,
    saveTokens,
    onError,
    onTransientFailure,
    ratio = 0.75,
    minBuffer = 30_000,
    watchLifecycle = true,
  }) => {
    this.stopScheduledRefresh()
    this.#scheduleCtx = { getTokens, saveTokens, onError, onTransientFailure, ratio, minBuffer }

    if (watchLifecycle && typeof window !== "undefined") {
      const onWake = () => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return
        this.reschedule() // expired token → delay 0 → tick immediately
      }

      document.addEventListener("visibilitychange", onWake)
      window.addEventListener("online", onWake)
      this.#lifecycleCleanup = () => {
        document.removeEventListener("visibilitychange", onWake)
        window.removeEventListener("online", onWake)
      }
    }

    this.reschedule()
  }

  stopScheduledRefresh = () => {
    clearTimeout(this.#refreshTimer)
    this.#refreshTimer = null
    this.#lifecycleCleanup?.()
    this.#lifecycleCleanup = null
    this.#scheduleCtx = null
    this.#retries = 0
    this.#reportedTransient = false
  }
}
