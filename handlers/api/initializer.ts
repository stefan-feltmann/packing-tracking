import { Context, APIGatewayProxyEvent, EventBridgeEvent, S3Event } from 'aws-lambda'
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

export const handlers = async (event: any, _context: any): Promise<any> => {
  // let output = await postgresConnection.checkConnection()

  console.log(event)

  try {
    await postgresConnection.setupDB()
  } catch (error) {
      console.log(error)
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
