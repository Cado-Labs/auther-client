import { decodeURI } from "./decode"

const decode = token => {
  const structure = token.split(".")
  const [header, payload, signature] = structure

  if (!header || !payload || !signature) {
    throw new Error("token.invalid_token")
  }

  const decodedPayload = decodeURI(payload)
  const decodedHeader = decodeURI(header)

  return {
    header: JSON.parse(decodedHeader),
    payload: JSON.parse(decodedPayload),
    signature,
  }
}

const verify = token => {
  if (!token) {
    throw new Error("token.not_found")
  }

  const { payload } = decode(token)
  const currentTime = new Date().getTime()

  if (!payload.iat || !payload.exp) {
    throw new Error("token.invalid")
  }

  if (currentTime > payload.exp * 1000) {
    throw new Error("token.expired")
  }

  return token
}

export { decode, verify }
