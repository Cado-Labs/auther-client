import { verify, decode } from "../lib/jwt"

const ONE_MINUTE_MS = 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export class AutherClient {
  #location = window.location

  #INITIATE_PATH = "/tokens/initiate"
  #REVOKE_PATH = "/tokens/revoke"
  #REFRESH_PATH = "/tokens/refresh"
  #LOGIN_PATH = "/login"

  constructor ({ redirectUri, autherUrl, http, appcode, logger }) {
    this.redirectUri = redirectUri
    this.autherUrl = autherUrl
    this.http = http
    this.appcode = appcode
    this.logger = logger
  }

  #buildOauthUrl = () => {
    const returnUrl = new URL(this.redirectUri)
    const redirectUrl = new URL(this.#LOGIN_PATH, this.autherUrl)

    redirectUrl.searchParams.append("return_url", returnUrl)
    redirectUrl.searchParams.append("appcode", this.appcode)

    return redirectUrl.toString()
  }

  #refreshTokens = async ({ getTokens, saveTokens }) => {
    const currentTime = `${new Date()} [${new Date().toUTCString()}]`
    const { refreshToken } = getTokens()

    verify(refreshToken)

    const response = await this.updateTokens(refreshToken)
    const tokens = await response.json()

    saveTokens(tokens)

    this.logger.log(`Token has been refreshed successfully at ${currentTime}`)
  }

  #scheduleTokensRefreshing = ({ getTokens, saveTokens }) => {
    const { accessToken } = getTokens()

    verify(accessToken)

    const decodedToken = decode(accessToken)
    const tokenExpDateMs = decodedToken.payload.exp * 1000
    let refreshTimeout = (tokenExpDateMs - new Date()) / 2

    if (refreshTimeout < ONE_MINUTE_MS) {
      refreshTimeout = ONE_MINUTE_MS
    }

    if (refreshTimeout > ONE_DAY_MS) {
      refreshTimeout = ONE_DAY_MS
    }

    const tokenExpDate = new Date(tokenExpDateMs)
    const refreshDate = new Date(Date.now() + refreshTimeout)

    this.logger.log(`Token will expire at ${(tokenExpDate)} [${tokenExpDate.toUTCString()}]`)
    this.logger.log(`Token will be refreshed at ${refreshDate} [${refreshDate.toUTCString()}]`)

    setTimeout(async () => {
      try {
        await this.#refreshTokens({ getTokens, saveTokens })
        this.#scheduleTokensRefreshing({ getTokens, saveTokens })
      }
      catch (error) {
        this.logger.error(
          `Error during tokens refreshing at ${new Date()} [${new Date().toUTCString()}]`,
        )
        throw error
      }
    }, refreshTimeout)
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

  fetchTokens = authorizationCode => {
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

  authentication = async ({ getTokens, saveTokens }) => {
    const { accessToken } = getTokens()
    try {
      verify(accessToken)
    }
    catch (err) {
      await this.#refreshTokens({ getTokens, saveTokens })
    }

    this.#scheduleTokensRefreshing({ getTokens, saveTokens })
  }
}
