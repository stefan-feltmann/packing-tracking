import { getAuthToken, outputStandard, handlers, validateAuthToken, getJwtSecret } from './handlers'
import { Context, APIGatewayProxyEvent } from 'aws-lambda'
import { verify, TokenExpiredError } from 'jsonwebtoken'
import { ContextProvider } from '@aws-cdk/core'

const LambdaTester = require('lambda-tester')

const password = getJwtSecret()

describe('API lambda Handlers', () => {
  test('getAuthToken', () => {
    let user = {
      Username: 'unit test',
      Password: 'unit password',
    }
    let event = { body: JSON.stringify(user) }
    let token = getAuthToken(event)
    const decodedToken = verify(token, password)
    expect(decodedToken).toMatchSnapshot({
      exp: expect.any(Number),
      iat: expect.any(Number),
    })
  })
  test('outputStandard', () => {
    let output = outputStandard('unit test')
    expect(output).toMatchSnapshot()
  })
  test('handlers', async () => {
    await LambdaTester(handlers)
      .event({ name: 'Unknown' })
      .expectResult((result: any) => {
        expect(result).toMatchSnapshot()
      })
    let user = {
      Username: 'unit test',
      Password: 'unit password',
    }
    await LambdaTester(handlers)
      .event({
        path: '/v1/auth',
        httpMethod: 'POST',
        headers: { User: 'test' },
        body: JSON.stringify(user),
      })
      .expectResult((result: any) => {
        expect(result).toMatchSnapshot({ body: expect.any(String) })
        let body = result.body
        const decodedToken = verify(body, password)
        expect(decodedToken).toMatchSnapshot({
          exp: expect.any(Number),
          iat: expect.any(Number),
        })
      })
    let user2 = {
      Username: 'unit test',
      Password: 'unit password',
    }
    let event = { body: JSON.stringify(user2) }
    let token = getAuthToken(event)
    await LambdaTester(handlers)
      .event({ path: '/v1/move', headers: { Authorization: `Bearer ${token}` } })
      .expectResult((result: any) => {
        expect(result).toMatchSnapshot()
      })
  })
  test('validateAuthToken', async () => {
    // let event = { headers: { User: 'unit test' } }
    let user2 = {
      Username: 'unit test',
      Password: 'unit password',
    }
    let event = { body: JSON.stringify(user2) }
    let token = getAuthToken(event)
    let testEvent = { headers: { Authorization: `Bearer ${token}` } }
    let result = validateAuthToken(testEvent)
    expect(result).toMatchSnapshot({
      exp: expect.any(Number),
      iat: expect.any(Number),
    })
    let oldToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7IlVzZXIiOiJ1bml0IHRlc3QifSwiaWF0IjoxNjMxMzMzMTUwLCJleHAiOjE2MzEzMzM3NTB9.mcqi6u8jHHf4iaXSKT40Ve6tM0oiNSwFMyqEQnM-MbE'
    // testEvent = { headers: { Authorization: `Bearer ${oldToken}` } }
    try {
      testEvent = { headers: { Authorization: `Bearer ${oldToken}` } }
      let result = validateAuthToken(testEvent)
      expect(result).toBeUndefined()
    } catch (error) {
      expect(error).toMatchSnapshot()
    }
  })
})
