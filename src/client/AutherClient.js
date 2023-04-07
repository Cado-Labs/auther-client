export class AutherClient {
  #location = window.location

  #INITIATE_PATH = "/tokens/initiate"
  #REVOKE_PATH = "/tokens/revoke"
  #REFRESH_PATH = "/tokens/refresh"
  #LOGIN_PATH = "/login"

  constructor ({ redirectUri, autherUrl, http }) {
    this.redirectUri = redirectUri
    this.autherUrl = autherUrl
    this.http = http
  }

  #buildOauthUrl = () => {
    const returnUrl = new URL(this.redirectUri)
    const redirectUrl = new URL(this.#LOGIN_PATH, this.autherUrl)
    const appcode = "appcode"

    redirectUrl.searchParams.append("return_url", returnUrl)
    redirectUrl.searchParams.append("appcode", appcode)

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
      path: this.#REVOKE_PATH,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  getTokens = authorizationCode => {
    if (!authorizationCode) {
      throw new Error("invalid.authorization_code")
    }

    return this.http({
      path: this.#INITIATE_PATH,
      body: { authorization_code: authorizationCode },
    })
  }

  updateTokens = refreshToken => {
    if (!refreshToken) {
      throw new Error("invalid.refresh_token")
    }

    return this.http({ path: this.#REFRESH_PATH, body: { refreshToken } })
  }
}
