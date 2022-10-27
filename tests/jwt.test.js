import { decode, verify } from "../src/lib/jwt"

/* eslint-disable max-len */
const TEST_TOKEN = `
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.
NHVaYe26MbtOYhSKkoKYdFVomg4i8ZJd8_-RU8VNbftc4TSMb4bXP3l3YlNWACwyXPGffz5aXHc6lty1Y2t4SWRqGteragsVdZufDn5BlnJl9pdR_kdVFUsra2rWKEofkZeIC4yWytE58sMIihvo9H1ScmmVwBcQP6XETqYd0aSHp1gOa9RdUPDvoXQ5oqygTqVtxaDr6wUFKrKItgBMzWIdNZ6y7O9E0DhEPTbE9rfBo6KTFsHAZnMg4k68CDp2woYIaXbmYTWcvbzIuHO7_37GT79XdIwkm95QJ7hYC9RiwrV7mesbY4PAahERJawntho0my942XheVLmGwLMBkQ
`

const INVALID_TOKEN = `
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
`

const EXPIRED_TOKEN = `
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE2NjY4MTE0ODJ9.
1wdcBW_7EaiI03EeezpyyVuTrVzRVWRGhsD1RXu4pTk
`

const DECODED_HEADER = {
  alg: "RS256",
  typ: "JWT",
}

const DECODED_PAYLOAD = {
  sub: "1234567890",
  name: "John Doe",
  admin: true,
  iat: 1516239022,
}

const TOKEN_SIGNATURE = `
NHVaYe26MbtOYhSKkoKYdFVomg4i8ZJd8_-RU8VNbftc4TSMb4bXP3l3YlNWACwyXPGffz5aXHc6lty1Y2t4SWRqGteragsVdZufDn5BlnJl9pdR_kdVFUsra2rWKEofkZeIC4yWytE58sMIihvo9H1ScmmVwBcQP6XETqYd0aSHp1gOa9RdUPDvoXQ5oqygTqVtxaDr6wUFKrKItgBMzWIdNZ6y7O9E0DhEPTbE9rfBo6KTFsHAZnMg4k68CDp2woYIaXbmYTWcvbzIuHO7_37GT79XdIwkm95QJ7hYC9RiwrV7mesbY4PAahERJawntho0my942XheVLmGwLMBkQ
`
/* eslint-enable max-len */

describe("When decode token", () => {
  it("should return the decoded result", () => {
    const decoded = decode(TEST_TOKEN)
    const expectedResult = {
      header: DECODED_HEADER,
      payload: DECODED_PAYLOAD,
      signature: TOKEN_SIGNATURE,
    }

    expect(decoded).toEqual(expectedResult)
  })

  it("should show an error invalid token", () => {
    const decoded = () => decode(INVALID_TOKEN)
    expect(decoded).toThrow("token.invalid_token")
  })
})

describe("When verify token", () => {
  it("should return the verified result", () => {
    const verified = verify(TEST_TOKEN)
    const expectedResult = TEST_TOKEN

    expect(verified).toEqual(expectedResult)
  })

  describe("Token is invalid", () => {
    it("should return not authorized", () => {
      const decoded = () => verify(undefined)

      expect(decoded).toThrow("token.not_found")
    })

    it("should return token expired", () => {
      const decoded = () => verify(EXPIRED_TOKEN)

      expect(decoded).toThrow("token.expired")
    })
  })
})
