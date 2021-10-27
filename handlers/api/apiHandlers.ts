import { Context, APIGatewayProxyEvent } from 'aws-lambda'
import { connect } from 'http2'
import { PostgresConnection } from './postgresConnection'
import * as utils from './utils'

const dbUser = utils.getEnvVar('DB_USERNAME')
const dbPassword = utils.getEnvVar('DB_PASSWORD')
const dbHost = utils.getEnvVar('DB_HOST')
const dbName = utils.getEnvVar('DB_NAME')
const postgresConnection = new PostgresConnection(dbUser, dbPassword, dbHost, dbName)

export const handlerMethodNotAllowed = async (event: APIGatewayProxyEvent, _context: Context): Promise<any> => {
  return {
    statusCode: 405,
    headers: {
      'Content-Type': 'text/plain',
    },
    body: 'Method Not Allowed',
  }
}

export const handlerGetUser = async (event: APIGatewayProxyEvent, _context: Context): Promise<any> => {
  const users = await postgresConnection.selectUsers()
  const usersBody = JSON.stringify(users)
  const usersStatus = 200
  let userResponse = formatResponse(usersStatus, usersBody)
  return userResponse
}

export const handlerGetUserId = async (event: APIGatewayProxyEvent, _context: Context): Promise<any> => {
  // const users = await postgresConnection.selectUsers()
  // const usersBody = JSON.stringify(users)
  // const usersStatus = 200
  // let userResponse = formatResponse(usersStatus, usersBody)
  if (event && event.pathParameters && event.pathParameters.id) {
    let id: string = event.pathParameters.id

    const users = await postgresConnection.selectUserById(id)
    const usersBody = JSON.stringify(users)
    const usersStatus = 200
    let userResponse = formatResponse(usersStatus, usersBody)
    return userResponse
  }
  return {
    statusCode: 405,
    headers: {
      'Content-Type': 'text/plain',
    },
    body: 'Method Not Allowed',
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

function makeResponse(status: number, headers: { headers: { 'Content-Type': string } }, bodyMsg: string) {
  return {
    statusCode: status,
    headers,
    body: bodyMsg,
  }
}
