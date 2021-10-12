import { HasuraConnection } from "./hasuraConnection"

const password = 'test'

const graphQlUrl = 'localhost:8080'

const hasuraConnection = new HasuraConnection(graphQlUrl, password)

jest.setTimeout(500000)

describe('hasuraConnect', () => {
    test('testing connection', async () => {
        let output = await hasuraConnection.getUsers()
        expect(output).toMatchSnapshot()
    })
})