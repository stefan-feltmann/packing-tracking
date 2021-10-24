import { PostgresConnection } from './postgresConnection'

jest.setTimeout(500000)
const DB_USERNAME = 'postgres'
const DB_PASSWORD = 'secret'
const DB_HOST = 'localhost'
const DB_NAME = 'postgres'
const DB_PORT = 5433
let postgresConnection: PostgresConnection

beforeEach(() => {
  postgresConnection = new PostgresConnection(DB_USERNAME, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT)
})

describe('PostgresConnection', () => {
  test('construct', async () => {
    expect(postgresConnection).not.toBeUndefined()
  })
  test('construct', async () => {
    let output = await postgresConnection.checkConnection()
    expect(output).toMatchSnapshot(
      [
        {
          now: expect.any(Date),
        },
      ]
    )
  })
})
