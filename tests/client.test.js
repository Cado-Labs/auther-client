import fetchMock from "jest-fetch-mock"

import { AutherClient } from "../src"
import { doFetch } from "../src/lib/http"

fetchMock.enableMocks()

const TEST_TOKEN = "test-access-token"
const TEST_REFRESH_TOKEN = "test-refresh-token"
const RETURN_URI = "http://example.com/"
const AUTHER_URL = "http://localhost/"
const TEST_AUTHORIZATION_CODE = "75e1cece-2991-4be5-9fb4-c6968e5f3311"

const createAutherClient = () => {
  return AutherClient.init({
    autherUrl: AUTHER_URL,
    redirectUri: RETURN_URI,
    scope: "test-scope",
    http: doFetch(AUTHER_URL),
  })
}

describe("When use auther methods", () => {
  it("should trigger a redirect", () => {
    const returnUrl = new URL(RETURN_URI)
    const expectedRedirectUrl = new URL("/login", AUTHER_URL)
    expectedRedirectUrl.searchParams.append("return_url", returnUrl)
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

    const response = await auth.getTokens(TEST_AUTHORIZATION_CODE)

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
    const getTokens = () => auth.getTokens(undefined)

    expect(getTokens).toThrow("invalid.authorization_code")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("should show an error invalid refresh token", async () => {
    const auth = createAutherClient()
    const updateTokens = () => auth.updateTokens(undefined)

    expect(updateTokens).toThrow("invalid.refresh_token")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
