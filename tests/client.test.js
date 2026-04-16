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
      jest.useFakeTimers()
      window.navigator.locks = {
        request: (_name, callback) => callback(),
      }
    })

    it("should authenticate with actual tokens", async () => {
      fetch.mockResponseOnce(JSON.stringify({
        accessToken: getAccessToken(),
        refreshToken: getRefreshToken(),
      }))

      const auth = createAutherClient()
      const callbacks = getAuthCallbacks()

      await expect(() => auth.authentication(callbacks)).not.toThrowError()

      jest.runOnlyPendingTimers()

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

      jest.runOnlyPendingTimers()

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

    it("should log error when refresh token expired", async () => {
      fetch.mockResponseOnce(JSON.stringify({
        accessToken: getAccessToken(),
        refreshToken: getRefreshToken(),
      }))
      const mockLogger = { log: jest.fn(), error: jest.fn() }

      const auth = createAutherClient({ logger: mockLogger })
      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 3)
      const callbacks = getAuthCallbacks({ refreshTokenExpDate: expiredDate })

      await expect(() => auth.authentication(callbacks)).not.toThrowError()

      jest.runAllTimers()

      mockLogger.error.mockImplementationOnce(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          `Error during tokens refreshing at ${new Date()} [${new Date().toUTCString()}]`,
        )
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

    it("should log error when server fails to refresh tokens", async () => {
      const mockLogger = { log: jest.fn(), error: jest.fn() }
      const auth = createAutherClient({ logger: mockLogger })

      fetch.mockRejectOnce()

      const callbacks = getAuthCallbacks()

      await expect(() => auth.authentication(callbacks)).not.toThrowError()

      jest.runAllTimers()

      mockLogger.error.mockImplementationOnce(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          `Error during tokens refreshing at ${new Date()} [${new Date().toUTCString()}]`,
        )
      })
    })

    it("should set min refreshTimeout to one minute", async () => {
      const mockLogger = { log: jest.fn() }

      const auth = createAutherClient({ logger: mockLogger })
      const expiredDate = new Date()
      expiredDate.setSeconds(expiredDate.getSeconds() + 30)
      const callbacks = getAuthCallbacks({ accessTokenExpDate: expiredDate })

      await auth.authentication(callbacks)

      const expectedRefreshDate = new Date(Date.now() + 60 * 1000) // one minute

      expect(mockLogger.log).toHaveBeenCalledWith(
        `Token will be refreshed at ${expectedRefreshDate} [${expectedRefreshDate.toUTCString()}]`,
      )
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

    it("should not call saveTokens when scheduled refresh returns error response", async () => {
      const mockLogger = { log: jest.fn(), error: jest.fn() }
      const auth = createAutherClient({ logger: mockLogger })

      fetch.mockResponseOnce(JSON.stringify({ error: "token_invalid" }), { status: 401 })

      const saveTokensMock = jest.fn()
      const { getTokens } = getAuthCallbacks()

      await auth.authentication({ getTokens, saveTokens: saveTokensMock })

      jest.runAllTimers()
      // // flush microtasks from the async timer callback and fetch mock chain
      for (let i = 0; i < 10; i += 1) { await Promise.resolve() }

      expect(saveTokensMock).not.toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it("should not call onError when it is not provided and scheduled refresh fails", async () => {
      const mockLogger = { log: jest.fn(), error: jest.fn() }
      const auth = createAutherClient({ logger: mockLogger })

      fetch.mockResponseOnce(JSON.stringify({ error: "token_invalid" }), { status: 401 })

      const saveTokensMock = jest.fn()
      const { getTokens } = getAuthCallbacks()

      await auth.authentication({ getTokens, saveTokens: saveTokensMock })

      jest.runAllTimers()
      for (let i = 0; i < 10; i += 1) { await Promise.resolve() }

      expect(mockLogger.error).toHaveBeenCalled()
      // should not throw when onError is not provided
    })

    it("calls onError when scheduled refresh fails", async () => {
      const onErrorMock = jest.fn()
      const mockLogger = { log: jest.fn(), error: jest.fn() }
      const auth = createAutherClient({ logger: mockLogger, onError: onErrorMock })

      fetch.mockResponseOnce(JSON.stringify({ error: "token_invalid" }), { status: 401 })

      const saveTokensMock = jest.fn()
      const { getTokens } = getAuthCallbacks()

      await auth.authentication({ getTokens, saveTokens: saveTokensMock })

      jest.runAllTimers()
      for (let i = 0; i < 10; i += 1) { await Promise.resolve() }

      expect(onErrorMock).toHaveBeenCalledWith(expect.any(Error))
      expect(onErrorMock.mock.calls[0][0].message).toBe("refresh.failed")
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

    it("should set max refreshTimeout to one day", async () => {
      const mockLogger = { log: jest.fn() }

      const auth = createAutherClient({ logger: mockLogger })
      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() + 10)
      const callbacks = getAuthCallbacks({ accessTokenExpDate: expiredDate })

      await auth.authentication(callbacks)

      const expectedRefreshDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // one day

      expect(mockLogger.log).toHaveBeenCalledWith(
        `Token will be refreshed at ${expectedRefreshDate} [${expectedRefreshDate.toUTCString()}]`,
      )
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
