import { Context, APIGatewayProxyEvent } from 'aws-lambda'
import { createHash } from 'crypto'
import { sign, verify } from 'jsonwebtoken'

const HASURA_GRAPHQL_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET as string

const URL = process.env.URL as string

const password = HASURA_GRAPHQL_ADMIN_SECRET ? HASURA_GRAPHQL_ADMIN_SECRET : 'test'

const graphQlUrl = URL ? `https://graphql.${URL}` : 'localhost:8080'


export const handlers = async (event: APIGatewayProxyEvent, _context: Context): Promise<any> => {

  //   console.log(event)
  //   console.log(_context)
  if (event && event.path && event.path !== '/v1/auth') {
    let tokenInfo = validateAuthToken(event)
    // console.log(tokenInfo)
  }
  switch (event.path) {
    case '/v1/auth':
      const authToken = getAuthToken(event)
      const outputAuth = outputStandard(authToken)
      return outputAuth
    case '/v1/addMove':
      const outputAddMove = outputDefault()
      return outputAddMove
    default:
      const output = outputDefault()
      return output
  }
}

export function getAuthToken(event: any) {
  const jwtSecret = getJwtSecret()
  const headers = event.headers
  const returnData = { User: headers.User }
  const token = sign({ data: returnData }, jwtSecret, { expiresIn: '10m' })
  return token
}

export function validateAuthToken(event: any) {
  const jwtSecret = getJwtSecret()
  const headers = event.headers
  const tokenString = headers.token
  const token = verify(tokenString, jwtSecret)
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
