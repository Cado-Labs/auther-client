import fetchMock from "jest-fetch-mock"

import { AutherClient } from "../src"
import { doFetch } from "../src/lib/http"

fetchMock.enableMocks()

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

const getTokenPayload = expDate => {
  const expiredAt = expDate ? new Date(expDate) : new Date()
  const issuedAt = new Date(expiredAt)
  if (!expDate) {
    expiredAt.setHours(expiredAt.getHours() + 1)
  }
  const iat = issuedAt.getTime() / 1000 // in seconds
  const exp = expiredAt.getTime() / 1000 // in seconds
  return { iat, exp }
}

const getToken = (params = {}) => {
  const { expDate, type } = params
  const payload = btoa(JSON.stringify({ ...getTokenPayload(expDate), type }))
  const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
  const signature = "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  const jwtLikeToken = `${header}.${payload}.${signature}`
  return jwtLikeToken
}

const getAccessToken = expDate => {
  return getToken({ type: "access", expDate })
}

const getRefreshToken = expDate => {
  return getToken({ type: "refresh", expDate })
}

const getAuthCallbacks = ({ accessTokenExpDate, refreshTokenExpDate } = {}) => {
  let accessToken = getAccessToken(accessTokenExpDate)
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
    })

    it("should authenticate with fresh tokens", async () => {
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

    it("should authenticate with fresh refresh token and expired access token", async () => {
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
})
