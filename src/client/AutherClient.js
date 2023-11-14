import { verify, decode } from "../lib/jwt"

// TODO: delete
const ONE_SECOND_MS = 1000
// const ONE_MINUTE_MS = 60 * 1000
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

  refreshByTimer = ({ fetchTokens, saveTokens }) => {
    const { accessToken } = fetchTokens()

    verify(accessToken)

    const decodedToken = decode(accessToken)
    const tokenExpDateMs = decodedToken.payload.exp * 1000

    let refreshTimeout = (tokenExpDateMs - new Date()) / 2

    // TODO: delete
    if (refreshTimeout < ONE_SECOND_MS) {
      refreshTimeout = ONE_SECOND_MS
    }

    // if (refreshTimeout < ONE_MINUTE_MS) {
    //   refreshTimeout = ONE_MINUTE_MS
    // }

    if (refreshTimeout > ONE_DAY_MS) {
      refreshTimeout = ONE_DAY_MS
    }

    const tokenExpDate = new Date(tokenExpDateMs)
    const refreshDate = new Date(Date.now() + refreshTimeout)

    this.logger.log(`Token will expire at ${(tokenExpDate)} [${tokenExpDate.toUTCString()}]`)
    this.logger.log(`Token will be refreshed at ${refreshDate} [${refreshDate.toUTCString()}]`)

    setTimeout(() => {
      try {
        this.refresh({ fetchTokens, saveTokens })
      }
      catch (error) {
        this.logger.error(
          `Error during tokens refreshing at ${new Date()} [${new Date().toUTCString()}]`,
        )
        throw error
      }
    }, refreshTimeout)
  }

  refresh = async ({ fetchTokens, saveTokens }) => {
    const currentTime = `${new Date()} [${new Date().toUTCString()}]`
    const { refreshToken } = fetchTokens()

    const response = await this.updateTokens(refreshToken)
    const tokens = await response.json()

    saveTokens(tokens)

    this.logger.log(`Access token has been refreshed successfully at ${currentTime}`)
    this.logger.log(`Refresh token has been refreshed successfully at ${currentTime}`)
    this.refreshByTimer({ fetchTokens, saveTokens })
  }

  authWithRefresh = async ({ fetchTokens, saveTokens, immediate }) => {
    const { refreshToken } = fetchTokens()
    verify(refreshToken)

    immediate
      ? await this.refresh({ fetchTokens, saveTokens })
      : this.refreshByTimer({ fetchTokens, saveTokens })
  }

  authentication = async ({ fetchTokens, saveTokens }) => {
    const { accessToken } = fetchTokens()
    try {
      verify(accessToken)
    }
    catch (err) {
      // TODO: delete
      this.logger.error("err: ", err)
      await this.authWithRefresh({ fetchTokens, saveTokens, immediate: true })
      return
    }
    // TODO: delete
    this.logger.log("fine 💚💚💚💚")

    return this.authWithRefresh({ fetchTokens, saveTokens, immediate: false })
  }
}
