export const doFetch = baseUrl => params => {
  const { path, body, query, method = "POST", headers = "" } = params

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

  const buildUrl = (query) => {
    const url = new URL(path, baseUrl)

    if (query) {
      const params = new URLSearchParams(query)
      url.search = params.toString()
    }
    
    return url.toString()
  }

  const requestUrl = buildUrl(query)
  const requestHeaders = buildHeaders()
  const requestBody = buildBody()

  return fetch(requestUrl, {
    method,
    headers: requestHeaders,
    body: requestBody,
  })
}
