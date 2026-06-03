import fetchMock from "jest-fetch-mock"

import { AutherClient } from "../src"
import { doFetch } from "../src/lib/http"

fetchMock.enableMocks()

const TEST_ID = 777
const TEST_TOKEN = "test-access-token"
const TEST_REFRESH_TOKEN = "test-refresh-token"
const RETURN_URI = "http://example.com/"
const APPCODE = "appcode"
const AUTHER_URL = "http://localhost/"
const TEST_AUTHORIZATION_CODE = "75e1cece-2991-4be5-9fb4-c6968e5f3311"

const createAutherClient = (params = {}) => {
  return AutherClient.init({
    autherUrl: AUTHER_URL,
    redirectUri: RETURN_URI,
    appcode: APPCODE,
    http: doFetch(AUTHER_URL),
    ...params,
  })
}

const getTokenPayload = (expDate, temp) => {
  const expiredAt = expDate ? new Date(expDate) : new Date()
  const issuedAt = new Date(expiredAt)
  if (!expDate) {
    expiredAt.setHours(expiredAt.getHours() + 1)
  }
  const iat = issuedAt.getTime() / 1000 // in seconds
  const exp = expiredAt.getTime() / 1000 // in seconds
  return { iat, exp, temp }
}

const getToken = (params = {}) => {
  const { expDate, type, tempToken } = params
  const payload = btoa(JSON.stringify({ ...getTokenPayload(expDate, tempToken), type }))
  const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
  const signature = "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  const jwtLikeToken = `${header}.${payload}.${signature}`
  return jwtLikeToken
}

const getAccessToken = (expDate, tempToken) => {
  return getToken({ type: "access", expDate, tempToken })
}

const getRefreshToken = expDate => {
  return getToken({ type: "refresh", expDate })
}

const getAuthCallbacks = ({
  accessTokenExpDate,
  refreshTokenExpDate,
  tempToken = false,
} = {}) => {
  let accessToken = getAccessToken(accessTokenExpDate, tempToken)
  let refreshToken = getRefreshToken(refreshTokenExpDate)
  const getTokens = () => ({ accessToken, refreshToken })
  const saveTokens = (tokens = {}) => {
    if (tokens.accessToken) accessToken = tokens.accessToken
    if (tokens.refreshToken) refreshToken = tokens.refreshToken
  }

  return { getTokens, saveTokens }
}

describe("When use auther methods", () => {
  it("should trigger a redirect", () => {
    const returnUrl = new URL(RETURN_URI)
    const appcode = APPCODE
    const expectedRedirectUrl = new URL("/login", AUTHER_URL)
    expectedRedirectUrl.searchParams.append("return_url", returnUrl)
    expectedRedirectUrl.searchParams.append("appcode", appcode)
    const locationPathMock = jest.fn()

    jest.spyOn(window, "location", "get").mockImplementationOnce(() => ({
      replace: locationPathMock,
    }))
    const auth = createAutherClient()

    auth.login()

    expect(locationPathMock).toHaveBeenCalledWith(expectedRedirectUrl.toString())
  })

  it("should make a request to revoke tokens", async () => {
    const auth = createAutherClient()

    const response = await auth.logout(TEST_TOKEN)

    const expectedUrl = "http://localhost/tokens/revoke"
    const expectedBody = null
    const expectedHeaders = expect.objectContaining({
      Authorization: `Bearer ${TEST_TOKEN}`,
    })

    expect(response.status).toEqual(200)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, {
      method: "POST",
      body: expectedBody,
      headers: expectedHeaders,
    })
  })

  it("should make a request to refresh tokens", async () => {
    const auth = createAutherClient()

    const response = await auth.updateTokens(TEST_REFRESH_TOKEN)

    const expectedUrl = "http://localhost/tokens/refresh"
    const expectedBody = JSON.stringify({ refreshToken: TEST_REFRESH_TOKEN })
    const expectedHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    expect(response.status).toEqual(200)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, {
      method: "POST",
      body: expectedBody,
      headers: expectedHeaders,
    })
  })

  it("should fetch one-time token by id", async () => {
    const payload = {
      id: TEST_ID,
      headers: { Authorization: TEST_TOKEN },
    }
    const auth = createAutherClient()

    const response = await auth.fetchDisposableTokensById(payload)

    const expectedUrl = "http://localhost/tokens/disposable"
    const expectedBody = JSON.stringify({ id: TEST_ID })
    const expectedHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: TEST_TOKEN,
    }

    expect(response.status).toEqual(200)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, {
      method: "POST",
      body: expectedBody,
      headers: expectedHeaders,
    })
  })

  it("should make a request to get tokens", async () => {
    const auth = createAutherClient()

    const response = await auth.fetchTokens(TEST_AUTHORIZATION_CODE)

    const expectedUrl = "http://localhost/tokens/initiate"
    const expectedBody = JSON.stringify({ authorization_code: TEST_AUTHORIZATION_CODE })
    const expectedHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    expect(response.status).toEqual(200)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, {
      method: "POST",
      body: expectedBody,
      headers: expectedHeaders,
    })
  })

  describe("authenticate method", () => {
    beforeEach(() => {
      window.navigator.locks = {
        request: (_name, callback) => callback(),
      }
    })

    it("should authenticate with actual refresh token and expired access token", async () => {
      fetch.mockResponseOnce(JSON.stringify({
        accessToken: getAccessToken(),
        refreshToken: getRefreshToken(),
      }))

      const auth = createAutherClient()
      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 3)

      const callbacks = getAuthCallbacks({ accessTokenExpDate: expiredDate })
      await expect(() => auth.authentication(callbacks)).not.toThrowError()

      const expectedUrl = "http://localhost/tokens/refresh"
      const expectedBody = JSON.stringify({ refreshToken: callbacks.getTokens().refreshToken })
      const expectedHeaders = {
        "Content-Type": "application/json",
        Accept: "application/json",
      }

      expect(fetch).toHaveBeenCalledWith(expectedUrl, {
        method: "POST",
        body: expectedBody,
        headers: expectedHeaders,
      })
    })

    it("should throw error when both tokens expired", async () => {
      const auth = createAutherClient()
      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 3)
      const callbacks = getAuthCallbacks({
        accessTokenExpDate: expiredDate,
        refreshTokenExpDate: expiredDate,
      })

      await expect(() => auth.authentication(callbacks))
        .rejects
        .toThrow("token.expired")

      expect(fetch).not.toHaveBeenCalled()
    })

    it("should not call saveTokens when refresh endpoint returns error response", async () => {
      fetch.resetMocks()
      const auth = createAutherClient()

      fetch.mockResponseOnce(JSON.stringify({ error: "token_invalid" }), { status: 401 })

      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 3)

      const saveTokensMock = jest.fn()
      const { getTokens } = getAuthCallbacks({ accessTokenExpDate: expiredDate })

      await expect(auth.authentication({ getTokens, saveTokens: saveTokensMock }))
        .rejects
        .toThrow("refresh.failed")

      expect(saveTokensMock).not.toHaveBeenCalled()
    })

    it("returns current tokens without fetch when refreshToken changed before lock", async () => {
      const newTokens = { accessToken: "new-access", refreshToken: "different-refresh" }
      let callCount = 0
      window.navigator.locks = {
        request: async (_name, callback) => {
          callCount += 1
          return callback()
        },
      }

      const auth = createAutherClient()
      const { getTokens: getTokensOrig, saveTokens } = getAuthCallbacks()
      const origRefreshToken = getTokensOrig().refreshToken
      const getTokens = () => {
        if (callCount > 0) return newTokens
        return { accessToken: getTokensOrig().accessToken, refreshToken: origRefreshToken }
      }

      fetch.resetMocks()
      const result = await auth.refreshTokens({ getTokens, saveTokens })

      expect(fetch).not.toHaveBeenCalled()
      expect(result).toEqual(newTokens)
    })

    it("falls back to direct call when navigator.locks is unavailable", async () => {
      const savedLocks = window.navigator.locks
      delete window.navigator.locks

      try {
        const newTokens = { accessToken: "new", refreshToken: "new-r" }
        fetch.mockResponseOnce(JSON.stringify(newTokens))

        const auth = createAutherClient()
        const saveTokensMock = jest.fn()
        const { getTokens } = getAuthCallbacks()

        const result = await auth.refreshTokens({ getTokens, saveTokens: saveTokensMock })

        expect(result).toEqual(newTokens)
        expect(saveTokensMock).toHaveBeenCalledWith(newTokens)
      }
      finally {
        window.navigator.locks = savedLocks
      }
    })
  })
})

describe("When params is missing", () => {
  it("should show an error invalid access token", async () => {
    const auth = createAutherClient()
    const logout = () => auth.logout(undefined)

    expect(logout).toThrow("invalid.access_token")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("should show an error invalid authorization code", async () => {
    const auth = createAutherClient()
    const fetchTokens = () => auth.fetchTokens(undefined)

    expect(fetchTokens).toThrow("invalid.authorization_code")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("should show an error invalid refresh token", async () => {
    const auth = createAutherClient()
    const updateTokens = () => auth.updateTokens(undefined)

    expect(updateTokens).toThrow("invalid.refresh_token")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("should show an error invalid without id", async () => {
    const auth = createAutherClient()
    const fetchTokens = () => auth.fetchDisposableTokensById({ id: undefined, headers: {} })

    expect(fetchTokens).toThrow("invalid.auther_id")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("should show an error invalid without headers", async () => {
    const auth = createAutherClient()
    const fetchTokens = () => auth.fetchDisposableTokensById({
      id: TEST_ID,
      headers: undefined,
    })

    expect(fetchTokens).toThrow("invalid.headers")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("attaches the HTTP status to a failed refresh error", async () => {
    window.navigator.locks = { request: (_name, callback) => callback() }
    fetch.resetMocks()
    fetch.mockResponseOnce(JSON.stringify({ error: "session.invalid" }), { status: 422 })

    const auth = createAutherClient()
    const expiredDate = new Date()
    expiredDate.setHours(expiredDate.getHours() - 3)
    const { getTokens } = getAuthCallbacks({ accessTokenExpDate: expiredDate })

    await auth.refreshTokens({ getTokens, saveTokens: jest.fn() }).catch(error => {
      expect(error.message).toBe("refresh.failed")
      expect(error.status).toBe(422)
    })
    expect.assertions(2)
  })

  it("exposes the server code from the response body on a failed refresh", async () => {
    window.navigator.locks = { request: (_name, callback) => callback() }
    fetch.resetMocks()
    fetch.mockResponseOnce(JSON.stringify({ code: "session.invalid" }), { status: 422 })

    const auth = createAutherClient()
    const { getTokens } = getAuthCallbacks()

    await auth.refreshTokens({ getTokens, saveTokens: jest.fn() }).catch(error => {
      expect(error.serverCode).toBe("session.invalid")
    })
    expect.assertions(1)
  })

  it("leaves serverCode undefined when the response body is not JSON", async () => {
    window.navigator.locks = { request: (_name, callback) => callback() }
    fetch.resetMocks()
    fetch.mockResponseOnce("not json", { status: 500 })

    const auth = createAutherClient()
    const { getTokens } = getAuthCallbacks()

    await auth.refreshTokens({ getTokens, saveTokens: jest.fn() }).catch(error => {
      expect(error.status).toBe(500)
      expect(error.serverCode).toBeUndefined()
    })
    expect.assertions(2)
  })

  it("should not start the update timer", async () => {
    const mockLogger = { log: jest.fn() }

    const auth = createAutherClient({ logger: mockLogger })
    const expiredDate = new Date()
    expiredDate.setDate(expiredDate.getDate() + 10)
    const callbacks = getAuthCallbacks({
      accessTokenExpDate: expiredDate,
      tempToken: true,
    })

    await auth.authentication(callbacks)

    const expectedRefreshDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // one day

    expect(mockLogger.log).not.toHaveBeenCalledWith(
      `Token will be refreshed at ${expectedRefreshDate} [${expectedRefreshDate.toUTCString()}]`,
    )
  })
})

describe("Scheduled token refresh", () => {
  const NOW = 1_700_000_000_000 // fixed wall clock for deterministic timers

  const buildToken = ({ iatOffset = 0, expOffset, type = "access" }) => {
    const iat = NOW / 1000 + iatOffset
    const exp = NOW / 1000 + expOffset
    const payload = btoa(JSON.stringify({ iat, exp, type }))
    const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    return `${header}.${payload}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`
  }

  const makeStore = (accessExpOffset = 1000) => {
    let accessToken = buildToken({ expOffset: accessExpOffset })
    let refreshToken = buildToken({ expOffset: 5000, type: "refresh" })

    return {
      getTokens: () => ({ accessToken, refreshToken }),
      saveTokens: tokens => {
        if (tokens.accessToken) accessToken = tokens.accessToken
        if (tokens.refreshToken) refreshToken = tokens.refreshToken
      },
      setAccess: value => { accessToken = value },
      setRefresh: value => { refreshToken = value },
    }
  }

  const freshTokensResponse = () => JSON.stringify({
    accessToken: buildToken({ iatOffset: 1000, expOffset: 3000 }),
    refreshToken: buildToken({ iatOffset: 1000, expOffset: 6000, type: "refresh" }),
  })

  // jest 29.2 has no advanceTimersByTimeAsync: advance fake timers, then drain microtasks
  // so the async tick bodies (refresh → catch/reschedule) settle before assertions.
  const advance = async ms => {
    jest.advanceTimersByTime(ms)
    for (let i = 0; i < 20; i += 1) {
      await Promise.resolve()
    }
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
    fetch.resetMocks()
    window.navigator.locks = { request: (_name, callback) => callback() }
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("schedules the refresh by ratio/minBuffer and fires before exp", async () => {
    fetch.mockResponse(freshTokensResponse())
    const { getTokens, saveTokens } = makeStore(1000) // lifetime 1000s
    const auth = createAutherClient()

    // byRatio = iat + 1000 * 0.75 = +750s; byBuffer = exp - 30s = +970s → ratio wins
    auth.startScheduledRefresh({ getTokens, saveTokens, ratio: 0.75, minBuffer: 30_000 })

    await advance(749_999)
    expect(fetch).not.toHaveBeenCalled()

    await advance(1)
    expect(fetch).toHaveBeenCalledTimes(1)

    auth.stopScheduledRefresh()
  })

  it("reschedules from the new exp after a successful tick", async () => {
    fetch.mockResponse(freshTokensResponse())
    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens })

    await advance(750_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(1) // a new timer was armed from the fresh token

    auth.stopScheduledRefresh()
    expect(jest.getTimerCount()).toBe(0)
  })

  it("retries with backoff on a network error and resets after success", async () => {
    fetch.mockRejectOnce(new Error("network down"))
    fetch.mockResponseOnce(freshTokensResponse())
    const onError = jest.fn()
    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens, onError })

    await advance(750_000) // tick → reject → backoff 1000ms
    expect(fetch).toHaveBeenCalledTimes(1)

    await advance(1000) // retry → success
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(onError).not.toHaveBeenCalled()

    auth.stopScheduledRefresh()
  })

  it("treats 5xx as transient and retries", async () => {
    fetch.mockResponseOnce(JSON.stringify({ error: "boom" }), { status: 503 })
    fetch.mockResponseOnce(freshTokensResponse())
    const onError = jest.fn()
    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens, onError })

    await advance(750_000)
    await advance(1000)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(onError).not.toHaveBeenCalled()

    auth.stopScheduledRefresh()
  })

  it("treats 429 as transient and retries", async () => {
    fetch.mockResponseOnce(JSON.stringify({ error: "slow down" }), { status: 429 })
    fetch.mockResponseOnce(freshTokensResponse())
    const onError = jest.fn()
    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens, onError })

    await advance(750_000)
    await advance(1000)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(onError).not.toHaveBeenCalled()

    auth.stopScheduledRefresh()
  })

  it("routes a fatal 422 to onError without rescheduling", async () => {
    fetch.mockResponse(JSON.stringify({ error: "session.invalid" }), { status: 422 })
    const onError = jest.fn()
    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens, onError })

    await advance(750_000)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0].status).toBe(422)
    expect(jest.getTimerCount()).toBe(0) // not rescheduled

    auth.stopScheduledRefresh()
  })

  it("stops watching lifecycle after a fatal error, so 'online' does not re-trigger a refresh", async () => {
    fetch.mockResponse(JSON.stringify({ error: "session.invalid" }), { status: 422 })
    const onError = jest.fn()
    const { getTokens, saveTokens, setAccess } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens, onError })

    await advance(750_000) // tick → fatal 422
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)

    // Session is dead. Even if the token is now expired and the tab comes back online,
    // the scheduler must not wake up and hammer the refresh endpoint again.
    setAccess(buildToken({ iatOffset: -2000, expOffset: -1000 })) // expired
    window.dispatchEvent(new Event("online"))
    await advance(1)

    expect(fetch).toHaveBeenCalledTimes(1) // no re-attempt
    expect(onError).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)

    auth.stopScheduledRefresh()
  })

  it("treats a local verify error as fatal and does not call a missing onError", async () => {
    const { getTokens, saveTokens, setRefresh } = makeStore(1000)
    setRefresh("not-a-jwt") // verify(refreshToken) throws token.invalid_token
    const auth = createAutherClient()

    // no onError provided → must not throw
    auth.startScheduledRefresh({ getTokens, saveTokens })

    await advance(750_000)
    expect(fetch).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(0)

    auth.stopScheduledRefresh()
  })

  it("calls onError when the access token cannot be decoded", () => {
    const onError = jest.fn()
    const { getTokens, saveTokens, setAccess } = makeStore(1000)
    setAccess("broken") // decode throws

    const auth = createAutherClient()
    auth.startScheduledRefresh({ getTokens, saveTokens, onError })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)

    auth.stopScheduledRefresh()
  })

  it("does not throw on a decode error when onError is absent", () => {
    const { getTokens, saveTokens, setAccess } = makeStore(1000)
    setAccess("broken")

    const auth = createAutherClient()
    expect(() => auth.startScheduledRefresh({ getTokens, saveTokens })).not.toThrow()

    auth.stopScheduledRefresh()
  })

  it("is a no-op when reschedule is called without an active context", () => {
    const auth = createAutherClient()
    expect(() => auth.reschedule()).not.toThrow()
    expect(jest.getTimerCount()).toBe(0)
  })

  it("registers and removes lifecycle listeners", () => {
    const windowAdd = jest.spyOn(window, "addEventListener")
    const windowRemove = jest.spyOn(window, "removeEventListener")
    const docAdd = jest.spyOn(document, "addEventListener")
    const docRemove = jest.spyOn(document, "removeEventListener")

    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens })
    expect(docAdd).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
    expect(windowAdd).toHaveBeenCalledWith("online", expect.any(Function))

    auth.stopScheduledRefresh()
    expect(docRemove).toHaveBeenCalledWith("visibilitychange", expect.any(Function))
    expect(windowRemove).toHaveBeenCalledWith("online", expect.any(Function))

    windowAdd.mockRestore()
    windowRemove.mockRestore()
    docAdd.mockRestore()
    docRemove.mockRestore()
  })

  it("does not register lifecycle listeners when watchLifecycle is false", () => {
    const windowAdd = jest.spyOn(window, "addEventListener")
    const docAdd = jest.spyOn(document, "addEventListener")

    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens, watchLifecycle: false })

    expect(windowAdd).not.toHaveBeenCalledWith("online", expect.any(Function))
    expect(docAdd).not.toHaveBeenCalledWith("visibilitychange", expect.any(Function))

    auth.stopScheduledRefresh() // covers the absent-cleanup branch
    windowAdd.mockRestore()
    docAdd.mockRestore()
  })

  it("catches up on the 'online' event when the token is expired", async () => {
    fetch.mockResponse(freshTokensResponse())
    const { getTokens, saveTokens, setAccess } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens }) // far timer for the valid token
    setAccess(buildToken({ iatOffset: -2000, expOffset: -1000 })) // now expired

    window.dispatchEvent(new Event("online"))
    await advance(1) // delay 0 → immediate tick
    expect(fetch).toHaveBeenCalledTimes(1)

    auth.stopScheduledRefresh()
  })

  it("ignores visibilitychange while the document is hidden, catches up when visible", async () => {
    fetch.mockResponse(freshTokensResponse())
    const { getTokens, saveTokens, setAccess } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens })
    setAccess(buildToken({ iatOffset: -2000, expOffset: -1000 })) // expired

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
    document.dispatchEvent(new Event("visibilitychange"))
    await advance(1)
    expect(fetch).not.toHaveBeenCalled() // hidden → no catch-up

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
    document.dispatchEvent(new Event("visibilitychange"))
    await advance(1)
    expect(fetch).toHaveBeenCalledTimes(1)

    auth.stopScheduledRefresh()
  })

  it("does not call onTransientFailure for the first four transient failures", async () => {
    for (let i = 0; i < 4; i += 1) fetch.mockRejectOnce(new Error("network down"))
    const onError = jest.fn()
    const onTransientFailure = jest.fn()
    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens, onError, onTransientFailure })

    await advance(750_000) // attempt 1 → backoff 1s
    await advance(1_000) // attempt 2 → backoff 2s
    await advance(2_000) // attempt 3 → backoff 4s
    await advance(4_000) // attempt 4 → backoff 8s

    expect(fetch).toHaveBeenCalledTimes(4)
    expect(onError).not.toHaveBeenCalled()
    expect(onTransientFailure).not.toHaveBeenCalled()

    auth.stopScheduledRefresh()
  })

  it("reports the transient outage once on the fifth consecutive failure", async () => {
    for (let i = 0; i < 6; i += 1) fetch.mockRejectOnce(new Error("network down"))
    const onError = jest.fn()
    const onTransientFailure = jest.fn()
    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens, onError, onTransientFailure })

    await advance(750_000) // 1
    await advance(1_000) // 2
    await advance(2_000) // 3
    await advance(4_000) // 4
    await advance(8_000) // 5 → report
    await advance(16_000) // 6 → silent

    expect(onError).not.toHaveBeenCalled()
    expect(onTransientFailure).toHaveBeenCalledTimes(1)
    const reported = onTransientFailure.mock.calls[0][0]
    expect(reported.attempts).toBe(5)
    expect(reported.message).toBe("network down")

    auth.stopScheduledRefresh()
  })

  it("does not throw when onTransientFailure is not provided", async () => {
    for (let i = 0; i < 5; i += 1) fetch.mockRejectOnce(new Error("network down"))
    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens }) // no callbacks

    await advance(750_000)
    await advance(1_000)
    await advance(2_000)
    await advance(4_000)
    await expect(advance(8_000)).resolves.not.toThrow()

    auth.stopScheduledRefresh()
  })

  it("resets the transient report flag after a successful refresh", async () => {
    // first burst: 5 failures → 1 report, then success
    for (let i = 0; i < 5; i += 1) fetch.mockRejectOnce(new Error("down"))
    fetch.mockResponseOnce(freshTokensResponse())
    // second burst: 5 failures → another report
    for (let i = 0; i < 5; i += 1) fetch.mockRejectOnce(new Error("down again"))

    const onTransientFailure = jest.fn()
    const { getTokens, saveTokens } = makeStore(1000)
    const auth = createAutherClient()

    auth.startScheduledRefresh({ getTokens, saveTokens, onTransientFailure })

    await advance(750_000) // 1
    await advance(1_000) // 2
    await advance(2_000) // 3
    await advance(4_000) // 4
    await advance(8_000) // 5 → first report; counter still pinned at 5
    await advance(16_000) // success → counter resets, scheduler re-arms from new exp

    expect(onTransientFailure).toHaveBeenCalledTimes(1)

    // After success the scheduler re-arms from the fresh-token exp (iat+1000s, exp+3000s),
    // so the next tick is ~1.72M ms away. Advance generously, then run the backoff steps.
    await advance(2_000_000) // burst-2 attempt 1
    await advance(1_000) // 2
    await advance(2_000) // 3
    await advance(4_000) // 4
    await advance(8_000) // 5 → second report

    expect(onTransientFailure).toHaveBeenCalledTimes(2)
    expect(onTransientFailure.mock.calls[1][0].attempts).toBe(5)

    auth.stopScheduledRefresh()
  })
})
