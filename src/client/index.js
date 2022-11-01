import { doFetch } from "../lib/http"

import { AutherClient } from "./AutherClient"

export default class {
  static init ({ redirectUri, autherUrl }) {
    return new AutherClient({
      http: doFetch(autherUrl),
      redirectUri,
      autherUrl,
    })
  }
}
