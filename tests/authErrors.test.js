import { isFatalAuthError } from "../src"

describe("isFatalAuthError", () => {
  it("classifies 4xx (except 429) as fatal", () => {
    expect(isFatalAuthError({ status: 400 })).toBe(true)
    expect(isFatalAuthError({ status: 401 })).toBe(true)
    expect(isFatalAuthError({ status: 422 })).toBe(true)
    expect(isFatalAuthError({ status: 499 })).toBe(true)
  })

  it("classifies 429 as transient", () => {
    expect(isFatalAuthError({ status: 429 })).toBe(false)
  })

  it("classifies 5xx and network errors as transient", () => {
    expect(isFatalAuthError({ status: 500 })).toBe(false)
    expect(isFatalAuthError({ status: 503 })).toBe(false)
    expect(isFatalAuthError(new Error("network down"))).toBe(false)
  })

  it("classifies local verify/refresh-token errors as fatal by message", () => {
    expect(isFatalAuthError(new Error("token.expired"))).toBe(true)
    expect(isFatalAuthError(new Error("token.invalid"))).toBe(true)
    expect(isFatalAuthError(new Error("token.invalid_token"))).toBe(true)
    expect(isFatalAuthError(new Error("token.not_found"))).toBe(true)
    expect(isFatalAuthError(new Error("invalid.refresh_token"))).toBe(true)
  })

  it("treats unknown thrown errors as transient", () => {
    expect(isFatalAuthError(new Error("anything else"))).toBe(false)
    expect(isFatalAuthError(undefined)).toBe(false)
    expect(isFatalAuthError(null)).toBe(false)
  })
})
