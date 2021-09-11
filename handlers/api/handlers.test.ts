import { getAuthToken, outputStandard, handlers, validateAuthToken, getJwtSecret } from './handlers'
import { Context, APIGatewayProxyEvent } from 'aws-lambda'
import { verify, TokenExpiredError } from 'jsonwebtoken'
import { ContextProvider } from '@aws-cdk/core'

const LambdaTester = require('lambda-tester')

const password = getJwtSecret()

describe('API lambda Handlers', () => {
  test('getAuthToken', () => {
    let event = { headers: { User: 'unit test' } }
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
    await LambdaTester(handlers)
      .event({ path: '/v1/auth', headers: { User: 'test' } })
      .expectResult((result: any) => {
        expect(result).toMatchSnapshot({ body: expect.any(String) })
        let body = result.body
        const decodedToken = verify(body, password)
        expect(decodedToken).toMatchSnapshot({
          exp: expect.any(Number),
          iat: expect.any(Number),
        })
      })
    let event = { headers: { User: 'unit test' } }
    let token = getAuthToken(event)
    await LambdaTester(handlers)
      .event({ path: '/v1/addMove', headers: { token } })
      .expectResult((result: any) => {
        expect(result).toMatchSnapshot({ body: expect.any(String) })
      })
  })
  test('validateAuthToken', async () => {
    let event = { headers: { User: 'unit test' } }
    let token = getAuthToken(event)
    // console.log(token)
    let testEvent = { headers: { token } }
    let result = validateAuthToken(testEvent)
    expect(result).toMatchSnapshot({
      exp: expect.any(Number),
      iat: expect.any(Number),
    })
    let oldToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7IlVzZXIiOiJ1bml0IHRlc3QifSwiaWF0IjoxNjMxMzMzMTUwLCJleHAiOjE2MzEzMzM3NTB9.mcqi6u8jHHf4iaXSKT40Ve6tM0oiNSwFMyqEQnM-MbE'
    testEvent = { headers: { token: oldToken } }
    try {
      testEvent = { headers: { token: oldToken } }
      let result = validateAuthToken(testEvent)
      expect(result).toBeUndefined()
    } catch (error) {
      expect(error).toMatchSnapshot()
    }
  })
})
