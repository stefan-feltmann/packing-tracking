import { Context, APIGatewayProxyEvent } from 'aws-lambda'
import { createHash } from 'crypto'
import { sign, TokenExpiredError, verify } from 'jsonwebtoken'
import parseBearerToken from 'parse-bearer-token'

export const handlers = async (event: APIGatewayProxyEvent, _context: Context): Promise<any> => {
  // console.log(event.httpMethod)
  // console.log(_context)
  const method = event.httpMethod
  if (event && event.path && event.path !== '/v1/auth') {
    try {
      let tokenInfo = validateAuthToken(event)
    } catch (error) {
      console.log(error)
      switch (true) {
        case error instanceof TokenExpiredError:
          //TODO: Figure out why this isn't working
          let status = 401
          let tokenError = error as TokenExpiredError
          let errMsg = tokenError.toString()
          let headers = {
            headers: {
              'Content-Type': 'text/plain',
            },
          }
          let errorMsg = makeResponse(status, headers, errMsg)
          return errorMsg
          break
        default:
          let defaultHeaders = {
            headers: {
              'Content-Type': 'text/plain',
            },
          }
          let err = error as Error

          let errorDefaultMsg = makeResponse(500, defaultHeaders, err.message)
          return errorDefaultMsg
          break
      }
    }
  }
  switch (method) {
    case 'POST':
      switch (event.path) {
        case '/v1/auth':
          const authToken = getAuthToken(event)
          const outputAuth = outputStandard(authToken)
          return outputAuth
        case '/v1/user':
          const outputUser = outputDefault()
          return outputUser
        case '/v1/move':
          const outputMove = outputDefault()
          return outputMove

        default:
          const output = outputDefault()
          return output
      }
    default:
      const output = outputDefault()
      return output
  }
}

function makeResponse(status: number, headers: { headers: { 'Content-Type': string } }, errMsg: string) {
  return {
    statusCode: status,
    headers,
    body: errMsg,
  }
}

export function getAuthToken(event: any) {
  let token = ''
  try {
    const jwtSecret = getJwtSecret()
    const body = JSON.parse(event.body)

    //TODO: Use this for something
    const password = body.Password

    const returnData = { Username: body.Username }
    token = sign({ data: returnData }, jwtSecret, { expiresIn: '10m' })
  } catch (error) {
    console.error(error)
  }
  return token
}

export function validateAuthToken(event: any) {
  const jwtSecret = getJwtSecret()
  const rawToken = event.headers.Authorization
  const userToken = rawToken.replace('Bearer', '').trim()
  const token = verify(userToken, jwtSecret)
  return token
}

export function outputStandard(msgBody: string) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
    body: msgBody,
  }
}

export function getJwtSecret() {
  // TODO: Setup a better secret
  const hash = createHash('sha512')

  hash.update('TODO: Setup a better secret')
  const hashDigest = hash.digest('hex')
  return hashDigest
}

function outputDefault() {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
    body: 'Hello, CDK!',
  }
}
