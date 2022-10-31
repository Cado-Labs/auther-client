import { decode, verify } from "../src/lib/jwt"

/* eslint-disable max-len */
// const TEST_TOKEN = `
// eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.
// eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.
// NHVaYe26MbtOYhSKkoKYdFVomg4i8ZJd8_-RU8VNbftc4TSMb4bXP3l3YlNWACwyXPGffz5aXHc6lty1Y2t4SWRqGteragsVdZufDn5BlnJl9pdR_kdVFUsra2rWKEofkZeIC4yWytE58sMIihvo9H1ScmmVwBcQP6XETqYd0aSHp1gOa9RdUPDvoXQ5oqygTqVtxaDr6wUFKrKItgBMzWIdNZ6y7O9E0DhEPTbE9rfBo6KTFsHAZnMg4k68CDp2woYIaXbmYTWcvbzIuHO7_37GT79XdIwkm95QJ7hYC9RiwrV7mesbY4PAahERJawntho0my942XheVLmGwLMBkQ
// `

const TEST_TOKEN = `
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.
eyJhZG1pbiI6dHJ1ZSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE2NjcwNjU2ODY0NDYxfQ.
cMQ_5nHJetfiJG58S3sh8zm7WRG4O4juwtuTss-bBVBQYVKxsakUFiHFbARi--0v14351Q5uG0qVBrGJqIlSJC2XKFXI9PrMdd2dzTegmBWH1dKnjBH1XodojlZwG3dKmqcfwKLmVFsNWxOtKO6H7ZLjQJTwskGQXembT2LU-jb_PKCLRWc-xQ7F7aM4XrEYDDleOcDxtrkjZ6kVHgOUC_-B3gfJFGlXlMW7TwWoPZ8zkPHfhrSDz88f3HDj59b2PcGRFellnp23JPNLqqp5mcI8x9gQ9ioFYVyHb8F5vnWxOIuvYtg9apAG9XP8oUsGUbGbZcWmcrznjaoRcG5dzA
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

const INVALID_PAYLOAD = `
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.
e30.
upI8kdqCUNUUgd1IrUpjNDDiif7yJZT_pI03g_DW6-aFIxEZD_kszt6E33_cjiUv6tWkutqTDgLr8XfKzFVfBKUTA9QDhpY9Imavnu-CW5k6xSUdiSiwo5b7EyMGBO7bRPN9b0L3OL2CzqowqOalYiqY0lldy1IDUgD_n5Cm0CFLpMOipb_vGf2KJFYmR8T_oZOAJzf6FYbZKFhjujeXiVLah2kj2qIZMIws9Q5t485udznl_gNlQwcnVB3bqEd6_msgUOo0ZRkyctQz9rZ70-JBviwXzhiqoeDGeiqJeRbaWLOjhmpWlwc6DJgRgP1H59dzV9htOWjST6cs8vpG2A
`

const DECODED_HEADER = {
  alg: "RS256",
  typ: "JWT",
}

const DECODED_PAYLOAD = {
  admin: true,
  iat: 1516239022,
  exp: 16670656864461,
}

const TOKEN_SIGNATURE = `
cMQ_5nHJetfiJG58S3sh8zm7WRG4O4juwtuTss-bBVBQYVKxsakUFiHFbARi--0v14351Q5uG0qVBrGJqIlSJC2XKFXI9PrMdd2dzTegmBWH1dKnjBH1XodojlZwG3dKmqcfwKLmVFsNWxOtKO6H7ZLjQJTwskGQXembT2LU-jb_PKCLRWc-xQ7F7aM4XrEYDDleOcDxtrkjZ6kVHgOUC_-B3gfJFGlXlMW7TwWoPZ8zkPHfhrSDz88f3HDj59b2PcGRFellnp23JPNLqqp5mcI8x9gQ9ioFYVyHb8F5vnWxOIuvYtg9apAG9XP8oUsGUbGbZcWmcrznjaoRcG5dzA
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

    it("should return token invalid", () => {
      const decoded = () => verify(INVALID_PAYLOAD)

      expect(decoded).toThrow("token.invalid")
    })
  })
})
