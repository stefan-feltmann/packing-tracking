import { Client } from 'pg'

export class PostgresConnection {
  private password: string
  private dbUser: string
  private host: string
  private database: string
  private port: number
  //TODO: This might be better served as a pool.
  private client: Client
  constructor(dbUser: string, password: string, host: string, database: string, port: number = 5432) {
    this.dbUser = dbUser
    this.host = host
    this.database = database
    this.port = port
    this.password = password
    this.client = new Client({
      user: this.dbUser,
      host: this.host,
      database: this.database,
      password: this.password,
      port: this.port,
    })
    this.client.connect()
  }

  public async checkConnection(): Promise<any[]> {
    let dbPromise = new Promise<any[]>((resolve, reject) => {
      this.client.query('SELECT NOW()', (err, res) => {
        if (err) {
          reject(err)
        }
        // console.log(err, res)
        resolve(res.rows)
      })
    })
    return dbPromise
  }
}
