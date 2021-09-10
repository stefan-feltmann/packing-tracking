import { getAuthToken, outputStandard, handlers } from './handlers'
import { Context, APIGatewayProxyEvent } from 'aws-lambda'
import { verify } from 'jsonwebtoken'
import { ContextProvider } from '@aws-cdk/core'

const LambdaTester = require( 'lambda-tester' )

describe('API lambda Handlers', () => {
  test('getAuthToken', () => {
    let event = { headers: { User: 'unit test' } }
    let token = getAuthToken(event)
    const decodedToken = verify(token, 'shhhhh')
    expect(decodedToken).toMatchSnapshot({
        iat: expect.any(Number)
    })
  })
  test('outputStandard', () => {
    let output = outputStandard('unit test')
    expect(output).toMatchSnapshot()
  })
  test('handlers', async () => {
    await LambdaTester( handlers )
            .event( { name: 'Unknown' } )
            .expectResult( ( result: any ) => {

              expect( result).toMatchSnapshot();
            });
    await LambdaTester( handlers )
            .event( { path: '/v1/auth',  headers: {User: 'test'}} )
            .expectResult( ( result: any ) => {

              expect( result).toMatchSnapshot({body: expect.any(String)});
              let body = result.body
              const decodedToken = verify(body, 'shhhhh')
              expect(decodedToken).toMatchSnapshot({
                iat: expect.any(Number)
            })
            })
  })
})
