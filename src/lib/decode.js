const decodeB64 = str => atob(str).split("")

const encodeURI = str => {
  const encoded = str.map(c => `%${c.charCodeAt(0).toString(16)}`)
  return encoded.join("")
}

const decodeURI = str => {
  const decodedB64 = decodeB64(str)
  const encodedURI = encodeURI(decodedB64)

  return decodeURIComponent(encodedURI)
}

export { decodeB64, encodeURI, decodeURI }
