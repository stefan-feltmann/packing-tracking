const axios = require('axios')
import gql from 'graphql-tag'
import { print } from 'graphql/language/printer'
import { DocumentNode } from 'graphql'

export class HasuraConnection {
  private password: string
  private url: string
  constructor(url: string, password: string) {
    this.password = password
    this.url = url
  }

  public async getUsers() {
    let getUsersQuery = gql`
      query getUsersQuery {
        users {
          username
          role
          id
          created_at
          active
        }
      }
    `
    let users = await this.runQuery(getUsersQuery)
    return users
  }

  public async runQuery(queryNode: DocumentNode, variables: object = {}) {
    const query = print(queryNode)
    var data = JSON.stringify({
      query: query,
      variables: variables,
    })

    var config = {
      method: 'post',
      url: `${this.url}`,
      headers: {
        'x-hasura-admin-secret': this.password,
        'Content-Type': 'application/json',
      },
      data: data,
    }

    console.log(config)

    return await axios(config)
      .then(function (response: { data: any }) {
        return response.data
      })
      .catch(function (error: any) {
        throw error
      })
  }
}
