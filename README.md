# @cadolabs/auther-client &middot; <a target="_blank" href="https://github.com/Cado-Labs"><img src="https://github.com/Cado-Labs/cado-labs-logos/raw/main/cado_labs_badge.svg" alt="Supported by Cado Labs" style="max-width: 100%; height: 20px"></a>

A frontend client for working with the Auther gem.
## Getting Started
### Installation

```sh
npm i @cadolabs/auther-client
```

or

```sh
yarn add @cadolabs/auther-client
```

### Configure

Create an `AutherClient` instance before initializing your application.

```js
import { AutherClient } from "@cadolabs/auther-client"

const auth = AutherClient.init({
  autherUrl: "<AUTHER_DOMAIN>",
  redirectUri: "<CALLBACK_URL>",
})
```

### Usage

#### Logging In

To redirect to the auther login

```js
auth.login()
```

And after that you redirect to the callback route `<CALLBACK_URL>` with query string `authorization_code="12345"`.

#### Get tokens

```js
//async/await
try {
  const authorizationCode = "12345"

  const response = await auth.getTokens(authorizationCode) // return Promise
  const tokens = response.json()

  const { accessToken, refreshToken } = tokens
  ...
} catch (error) {
  throw Error(error.message) // invalid.authorization_code
}
```

#### Update tokens

```js
const refreshToken = "refresh_token"

//async/await
try {
  const response = await auth.updateTokens(refreshToken) // return Promise
  const tokens = response.json()

  const { accessToken, refreshToken } = tokens
} catch (error) {
  throw Error(error.message) // invalid.access_token
}
```

#### Loggout In

To make a request to revoke tokens

```js
const accessToken = "access_token"

//async/await
try {
  await auth.logout(accessToken)
  ...
} catch (error) {
  throw Error(error.message) // invalid.access_token
}
```

### Additional usage

#### Decode token

To decode the token

```js
import { decode } from "@cadolabs/auther-client"

const testToken = "eyJhbGc*.NHVaY*.i8ZJd8_-RU8V" // headers.payload.signature

const decodedToken = decode(testToken)

console.log(decodedToken)

/* console prints:
 * {
 *   header: {
 *     alg: "RS256",
 *     typ: "JWT"
 *   },
 *   payload: {
 *     sub: "1234567890",
 *     name: "John Doe",
 *     iat: 1516239022,
 *     exp: 1516239022,
 * },
 *   signature: "i8ZJd8_-RU8V",
 * }
*/
```

Return the decoded object with parameters

#### Verify token

Checks the token for errors or expired time. If there are no problems, return it back

```js
import { verify } from "@cadolabs/auther-client"

const testToken = "eyJhbGc*.NHVaY*.i8ZJd8_-RU8V" // headers.payload.signature

try {
  const verifiedToken = verify(testToken)

  console.log(verifiedToken)

  /* console prints if no problems:
  * "eyJhbGc*.NHVaY*.i8ZJd8_-RU8V"
  */
} catch (error) {
  console.log(error.message)
  /* console prints if token is expired:
  * "token.expired"
  */
}
```

## Contributing

- Fork it ( <https://github.com/Cado-Labs/auther-client> )
- Create your feature branch (`git checkout -b feature/my-new-feature`)
- Commit your changes (`git commit -am '[feature_context] Add some feature'`)
- Push to the branch (`git push origin feature/my-new-feature`)
- Create new Pull Request

## License

Released under MIT License.

## Supporting

<a href="https://github.com/Cado-Labs">
  <img src="https://github.com/Cado-Labs/cado-labs-resources/blob/main/cado_labs_supporting_rounded.svg" alt="Supported by Cado Labs" />
</a>

## Authors

[Sergey Andreev](https://github.com/elenik72)
