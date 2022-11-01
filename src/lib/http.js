export const doFetch = url => params => {
  const { path, body, method = "POST", headers = "" } = params

  const buildHeaders = () => {
    const defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    return {
      ...defaultHeaders,
      ...headers,
    }
  }

  const buildBody = () => {
    if (!body) return null

    return JSON.stringify(body)
  }

  const buildUrl = () => {
    return new URL(path, url).toString()
  }

  const requestUrl = buildUrl()
  const requestHeaders = buildHeaders()
  const requestBody = buildBody()

  return fetch(requestUrl, {
    method,
    headers: requestHeaders,
    body: requestBody,
  })
}
