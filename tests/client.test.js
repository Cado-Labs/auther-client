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

const createAutherClient = () => {
  return AutherClient.init({
    autherUrl: AUTHER_URL,
    redirectUri: RETURN_URI,
    appcode: APPCODE,
    http: doFetch(AUTHER_URL),
  })
}

const getTokenPayload = expDate => {
  const expiredAt = expDate ? new Date(expDate) : new Date()
  const issuedAt = new Date(expiredAt)
  expiredAt.setHours(expiredAt.getHours() + 1)
  const iat = issuedAt.getTime() / 1000 // in seconds
  const exp = expiredAt.getTime() / 1000 // in seconds
  return { iat, exp }
}

const getToken = (params = {}) => {
  const payload = btoa(JSON.stringify({ ...getTokenPayload(), ...params }))
  const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
  const signature = "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  const jwtLikeToken = `${header}.${payload}.${signature}`
  return jwtLikeToken
}

const getAccessToken = (params = {}) => {
  return getToken({ type: "access", ...params })
}

const getRefreshToken = (params = {}) => {
  return getToken({ type: "refresh", ...params })
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
    it("should authenticate with fresh tokens", async () => {
      fetch.mockResponseOnce(JSON.stringify({
        accessToken: getAccessToken(),
        refreshToken: getRefreshToken(),
      }))
      jest.useFakeTimers()

      const auth = createAutherClient()
      const accessToken = getAccessToken()
      const refreshToken = getRefreshToken()
      const getTokens = () => ({ accessToken, refreshToken })
      const saveTokens = () => {}

      await expect(() => auth.authentication({ getTokens, saveTokens })).not.toThrowError()

      jest.runOnlyPendingTimers()

      const expectedUrl = "http://localhost/tokens/refresh"
      const expectedBody = JSON.stringify({ refreshToken })
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
      jest.useFakeTimers()

      const auth = createAutherClient()
      const expiredDate = new Date()
      expiredDate.setHours(expiredDate.getHours() - 3)

      let accessToken = getAccessToken(getTokenPayload(expiredDate))
      let refreshToken = getRefreshToken()
      const getTokens = () => ({ accessToken, refreshToken })
      const saveTokens = (tokens = {}) => {
        if (tokens.accessToken) accessToken = tokens.accessToken
        if (tokens.refreshToken) refreshToken = tokens.refreshToken
      }

      await expect(() => auth.authentication({ getTokens, saveTokens })).not.toThrowError()

      jest.runOnlyPendingTimers()

      const expectedUrl = "http://localhost/tokens/refresh"
      const expectedBody = JSON.stringify({ refreshToken })
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
      let accessToken = getAccessToken(getTokenPayload(expiredDate))
      let refreshToken = getRefreshToken(getTokenPayload(expiredDate))

      const getTokens = () => ({ accessToken, refreshToken })
      const saveTokens = (tokens = {}) => {
        if (tokens.accessToken) accessToken = tokens.accessToken
        if (tokens.refreshToken) refreshToken = tokens.refreshToken
      }

      await expect(() => auth.authentication({ getTokens, saveTokens }))
        .rejects
        .toThrow("token.expired")

      expect(fetch).not.toHaveBeenCalled()
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
