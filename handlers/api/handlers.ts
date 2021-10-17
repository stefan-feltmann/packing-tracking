import { Context, APIGatewayProxyEvent } from 'aws-lambda'
import { createHash } from 'crypto'
import { sign, TokenExpiredError, verify } from 'jsonwebtoken'
import { SecretsManager } from 'aws-sdk'
import { HasuraConnection } from './hasuraConnection'
import { sys } from 'ping'
import { Client } from 'pg'

// environment: { HASURA_LOAD_BALANCER_DNS_NAME: dnsName,
//   SECRET_NAME: secretName,
//   DB_PASSWORD: dbPassword,
//   DB_HOST: dbHost,
//   DB_NAME: dbName,
//   DB_USERNAME: dbUsername
// }

const client = new Client({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
})

let ssmClient = new SecretsManager({
  region: process.env.REGION,
})

async function getHasuraPassword(): Promise<string> {
  let secretName = process.env.SECRET_NAME ? process.env.SECRET_NAME : ''
  return new Promise((resolve, reject) => {
    ssmClient.getSecretValue({ SecretId: secretName }, function (err, data) {
      if (err) {
        // handle all exceptions and take appropriate actions
        reject(err)
      } else {
        let secret = data && data.SecretString ? data.SecretString : ''
        resolve(secret)
      }
    })
  })
}

export const handlers = async (event: APIGatewayProxyEvent, _context: Context): Promise<any> => {
  // console.log(event.httpMethod)
  // try {
  console.log(1)
  let dns = process.env.HASURA_LOAD_BALANCER_DNS_NAME ? process.env.HASURA_LOAD_BALANCER_DNS_NAME : ''
  let fullDns = `http://${dns}`
  var cfg = {
    timeout: 10,
    // WARNING: -i 2 may not work in other platform like windows
    extra: ['-i', '2'],
  }

  let dibHost = process.env.DB_HOST ? process.env.DB_HOST : '127.0.0.1'

  let hosts = [fullDns, 'google.com', 'yahoo.com', '10.0.170.115', dibHost]

  hosts.forEach(function (host) {
    sys.probe(
      host,
      function (isAlive) {
        var msg = isAlive ? 'host ' + host + ' is alive' : 'host ' + host + ' is dead'
        console.log(msg)
      },
      cfg
    )
  })
  // console.log(2)
  // let password: string = await getHasuraPassword()
  // console.log(3)
  // let connection = new HasuraConnection(fullDns, password)
  // console.log(4)
  // let user = await connection.getUsers()
  // console.log(5)
  // console.log(user)

  let dbPromise = new Promise<void>((resolve, reject) => {
    
    client.connect()
    client.query('SELECT NOW()', (err, res) => {
      console.log(err, res)
      client.end()
      resolve()
    })
  })

  //   console.log(foo)
  // } catch (error) {
  //   console.log(error)
  // }
  await dbPromise
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
    statusCode: 405,
    headers: {
      'Content-Type': 'text/plain',
    },
    body: 'Method Not Allowed',
  }
}
