import { Context, APIGatewayProxyEvent } from 'aws-lambda'
import { createHash } from 'crypto'
import { sign, TokenExpiredError, verify } from 'jsonwebtoken'
import { SecretsManager } from 'aws-sdk'
import { HasuraConnection } from './hasuraConnection'
import { PostgresConnection } from './postgresConnection'
import { sys } from 'ping'
import { Client } from 'pg'

console.log(process.env.DB_USERNAME)
console.log(process.env.DB_PASSWORD)
console.log(process.env.DB_HOST)
console.log(process.env.DB_NAME)

const dbUser = getEnvVar('DB_USERNAME')
const dbPassword = getEnvVar('DB_PASSWORD')
const dbHost = getEnvVar('DB_HOST')
const dbName = getEnvVar('DB_NAME')
const postgresConnection = new PostgresConnection(dbUser, dbPassword, dbHost, dbName)



export const handlers = async (event: APIGatewayProxyEvent, _context: Context): Promise<any> => {
  // let output = await postgresConnection.checkConnection()

  // console.log(output)

  try {
    await postgresConnection.setupDB()
  } catch (error) {
    
  }

  let turnOnAuth = false

  const method = event.httpMethod
  if (event && event.path && event.path !== '/v1/auth' && turnOnAuth) {
    try {
      validateAuthToken(event)
    } catch (error) {
      console.log(error)
      return handleAuthError(error)
    }
  }
  switch (method) {
    case 'GET':
      return handleGet(event)
    case 'POST':
      return handlePost(event)
    case 'PUT':
      return handlePut(event)
    case 'DELETE':
      return handleDelete(event)
    default:
      return returnMethodNotAllowed()
  }
}

function handleAuthError(error: unknown) {
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

function handleDelete(event: APIGatewayProxyEvent) {
  switch (event.path) {
    case '/v1/auth':
      return returnMethodNotAllowed()
    case '/v1/user':
      return returnMethodNotAllowed()
    case '/v1/move':
      return returnMethodNotAllowed()
    default:
      return returnMethodNotAllowed()
  }
}

async function handleGet(event: APIGatewayProxyEvent) {
  switch (event.path) {
    case '/v1/auth':
      return returnMethodNotAllowed()
    case '/v1/user':
      const users = await postgresConnection.selectUsers()
      const usersBody = JSON.stringify(users)
      const usersStatus = 201
      let userResponse = formatResponse(usersStatus, usersBody)
      return userResponse
    case '/v1/move':
      return returnMethodNotAllowed()
    default:
      return returnMethodNotAllowed()
  }
}

function formatResponse(status: number, body: string) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'text/plain',
    },
    body: body,
  }
}

function handlePut(event: APIGatewayProxyEvent) {
  switch (event.path) {
    case '/v1/auth':
      return returnMethodNotAllowed()
    case '/v1/user':
      return returnMethodNotAllowed()
    case '/v1/move':
      return returnMethodNotAllowed()
    default:
      return returnMethodNotAllowed()
  }
}

function handlePost(event: APIGatewayProxyEvent) {
  switch (event.path) {
    case '/v1/auth':
      const authToken = getAuthToken(event)
      const outputAuth = outputStandard(authToken)
      return outputAuth
    case '/v1/user':
      if (event && event.body) {
        const body = JSON.parse(event.body)

        if (body.Username) {
          const username: string = body.Username
          return postgresConnection.insertUser(username)
        } else {
          let header = {
            headers: {
              'Content-Type': 'text/plain',
            },
          }
          return makeResponse(400, header, 'Bad Request')
        }
      } else {
        let header = {
          headers: {
            'Content-Type': 'text/plain',
          },
        }
        return makeResponse(400, header, 'Bad Request')
      }
      return returnMethodNotAllowed()
    case '/v1/move':
      return returnMethodNotAllowed()

    default:
      return returnMethodNotAllowed()
  }
}

function getEnvVar(variable: string): string {
  let output = ''
  let env = process.env[variable]
  if (env && typeof env !== 'undefined') {
    output = env
  }
  return output
}

function makeResponse(status: number, headers: { headers: { 'Content-Type': string } }, bodyMsg: string) {
  return {
    statusCode: status,
    headers,
    body: bodyMsg,
  }
}

export function getAuthToken(event: any) {
  let token = ''
  try {
    const jwtSecret = getJwtSecret()
    const body = JSON.parse(event.body)

    //TODO: Use this for something

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

function returnMethodNotAllowed(): { statusCode: number; headers: { 'Content-Type': string }; body: string } {
  return {
    statusCode: 405,
    headers: {
      'Content-Type': 'text/plain',
    },
    body: 'Method Not Allowed',
  }
}
