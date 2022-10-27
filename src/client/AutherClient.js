export class AutherClient {
  #location = window.location

  constructor ({ redirectUri, autherUrl, http }) {
    this.redirectUri = redirectUri
    this.autherUrl = autherUrl
    this.http = http
  }

  #buildOauthUrl = () => {
    const returnUrl = new URL(this.redirectUri)
    const redirectUrl = new URL("/login", this.autherUrl)

    redirectUrl.searchParams.append("return_url", returnUrl)

    return redirectUrl.toString()
  }

  login = () => {
    return this.#location.replace(this.#buildOauthUrl())
  }

  logout = accessToken => {
    if (!accessToken) {
      throw new Error("invalid.access_token")
    }

    return this.http({
      path: "/tokens/revoke",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  getTokens = authorizationCode => {
    if (!authorizationCode) {
      throw new Error("invalid.authorization_code")
    }

    return this.http({
      path: "/tokens/initiate",
      body: { authorization_code: authorizationCode },
    })
  }

  updateTokens = refreshToken => {
    if (!refreshToken) {
      throw new Error("invalid.refresh_token")
    }

    return this.http({ path: "/tokens/refresh", body: { refreshToken } })
  }
}
