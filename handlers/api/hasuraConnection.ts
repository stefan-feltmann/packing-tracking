const axios = require('axios')
import gql from 'graphql-tag'
import { print } from 'graphql/language/printer'
import { DocumentNode } from 'graphql'

export type InsertMoveParams = {
  active: boolean
  moveName: string
  userId: string
}

export class HasuraConnection {
  private password: string
  private url: string
  constructor(url: string, password: string) {
    this.password = password
    this.url = url
  }

  public async insertMove({ active, moveName, userId }: InsertMoveParams) {
    let insertMoveVariables = {
      active,
      move_name: moveName,
      user_id: userId,
    }

    let insertMoveQuery = gql`
      mutation insertMove($active: Boolean = false, $move_name: String = "", $user_id: uuid = "") {
        insert_move_one(object: { active: $active, move_name: $move_name, user_id: $user_id }) {
          created_at
          active
          id
          move_name
          user_id
        }
      }
    `

    let output = await this.runQuery(insertMoveQuery, insertMoveVariables)
  }

  public async getUsers() {
    let getUsersQuery = gql`query getUsersQuery {
        users {
          username
          role
          id
          created_at
          active
        }
      }`
      let output = await this.runQuery(getUsersQuery)
      return output
  }

  public async insertUser(userName: string) {
    let insertUserVariables = {
      username: userName,
    }

    let insertUserQuery = gql`
      mutation InsertUser($username: String = "", $role: String = "Admin") {
        insert_users_one(object: { username: $username, role: $role }) {
          username
          id
          active
          created_at
          role
        }
      }
    `

    // let output = await this.runQuery(insertUserQuery, insertUserVariables)
    // return output
  }

  public async runQuery(queryNode: DocumentNode, variables: object = {}) {
    console.log(print(queryNode))
    console.log(variables)
    console.log(this.url)
    console.log(this.password)
    // postman-echo.com/post
    const query = print(queryNode)
    //   const fullUrl = `${this.url}/v1/graphql`
      const fullUrl = `postman-echo.com/post`

      var data = JSON.stringify({
        query: query,
        variables: variables
      });
      
      var config = {
        method: 'post',
        url: 'localhost:8080/v1/graphql',
        headers: { 
          'x-hasura-admin-secret': 'test', 
          'Content-Type': 'application/json'
        },
        data : data
      };
      
      await axios(config)
      .then(function (response: { data: any }) {
          console.log('then')
        console.log(JSON.stringify(response.data));
      })
      .catch(function (error: any) {
        console.log('catch')
        console.log(error);
      })
      return null
    // const response = await axios.post(
    //   fullUrl,
    //   {
    //     query,
    //     variables,
    //   },
    //   {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'x-hasura-admin-secret': this.password,
    //     },
    //   }
    // ).catch(function (err: { response: any }) {
    //     console.log(err)
    //     console.log('err')
    //     if (err.response) {

    //     }
    // })
    // const output = response.data
    // console.log(output)
    // if (output.errors) {
    //   console.error(query)
    //   console.error(JSON.stringify(output.errors))
    //   throw new Error(JSON.stringify(output.errors))
    // }
    // return output
  }
}
