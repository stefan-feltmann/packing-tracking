import { Context, APIGatewayProxyEvent, EventBridgeEvent, S3Event } from 'aws-lambda'
import { createHash } from 'crypto'
import { sign, TokenExpiredError, verify } from 'jsonwebtoken'
import { SecretsManager } from 'aws-sdk'
import { HasuraConnection } from './hasuraConnection'
import { PostgresConnection } from './postgresConnection'
import { sys } from 'ping'
import { Client } from 'pg'
import * as utils from './utils'

console.log(process.env.DB_USERNAME)
console.log(process.env.DB_PASSWORD)
console.log(process.env.DB_HOST)
console.log(process.env.DB_NAME)

const dbUser = utils.getEnvVar('DB_USERNAME')
const dbPassword = utils.getEnvVar('DB_PASSWORD')
const dbHost = utils.getEnvVar('DB_HOST')
const dbName = utils.getEnvVar('DB_NAME')
const postgresConnection = new PostgresConnection(dbUser, dbPassword, dbHost, dbName)

export const handlers = async (event: any, _context: any): Promise<any> => {
  // let output = await postgresConnection.checkConnection()

  console.log(event)

  try {
    await postgresConnection.setupDB()
  } catch (error) {
    console.log(error)
  }
}
