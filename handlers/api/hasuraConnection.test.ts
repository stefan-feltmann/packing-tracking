import { HasuraConnection } from './hasuraConnection'

jest.setTimeout(500000)

describe('HasuraConnection', () => {
  test('getUser', async () => {
    let hasuraConnection = new HasuraConnection('http://localhost:8080/v1/graphql', 'test')
    let users = await hasuraConnection.getUsers()
    expect(users).toMatchSnapshot()
  })
})
