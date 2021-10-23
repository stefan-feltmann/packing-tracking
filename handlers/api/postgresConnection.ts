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
    console.log(dbUser, password, host, database, port)
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

  public async setupDB(): Promise<any[]> {
    let extQuery = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
    let extValues : string[] = []

    await this.runQuery(extQuery, extValues)

    let query = `-- SQL dump generated using DBML (dbml-lang.org)
    -- Database: PostgreSQL
    -- Generated at: 2021-08-13T00:30:54.877Z

    
    
    CREATE TABLE "users" (
      "id" uuid UNIQUE PRIMARY KEY DEFAULT (uuid_generate_v4()),
      "username" varchar UNIQUE NOT NULL,
      "role" varchar,
      "created_at" timestamp DEFAULT (now()),
      "active" bool DEFAULT (true)
    );
    
    CREATE TABLE "move" (
      "id" uuid UNIQUE PRIMARY KEY DEFAULT (uuid_generate_v4()),
      "user_id" uuid NOT NULL,
      "move_name" varchar UNIQUE NOT NULL,
      "created_at" timestamp DEFAULT (now()),
      "active" bool DEFAULT (true)
    );
    
    CREATE TABLE "box" (
      "id" uuid UNIQUE PRIMARY KEY DEFAULT (uuid_generate_v4()),
      "move_id" uuid NOT NULL,
      "box_name" varchar UNIQUE NOT NULL,
      "box_desc" varchar,
      "created_at" timestamp DEFAULT (now()),
      "active" bool DEFAULT (true)
    );
    
    CREATE TABLE "item" (
      "id" uuid UNIQUE PRIMARY KEY DEFAULT (uuid_generate_v4()),
      "box_id" uuid NOT NULL,
      "item_name" varchar UNIQUE NOT NULL,
      "item_desc" varchar,
      "created_at" timestamp DEFAULT (now()),
      "active" bool DEFAULT (true)
    );
    
    ALTER TABLE "move" ADD CONSTRAINT "user_to_move" FOREIGN KEY ("user_id") REFERENCES "users" ("id");
    
    ALTER TABLE "box" ADD CONSTRAINT "move_to_box" FOREIGN KEY ("move_id") REFERENCES "move" ("id");
    
    ALTER TABLE "item" ADD CONSTRAINT "box_to_item" FOREIGN KEY ("box_id") REFERENCES "box" ("id");
    `
    const values: string[] = []
    let dbPromise = this.runQuery(query, values)
    return dbPromise
  }

  public async insertUser(username: string): Promise<any[]> {
    const query: string = 'INSERT INTO users(username) VALUES($1) RETURNING *'
    const values = [username]
    let dbPromise = this.runQuery(query, values)
    return dbPromise
  }

  public async selectUsers(): Promise<any[]> {
    const query: string = 'SELECT * FROM users'
    const values: string[] = []
    let dbPromise = this.runQuery(query, values)
    return dbPromise
  }

  public async checkConnection(): Promise<any[]> {
    const selectNowQuery: string = 'SELECT NOW()'
    const selectNowVariables: string[] = []
    let dbPromise = this.runQuery(selectNowQuery, selectNowVariables)
    return dbPromise
  }

  private runQuery(query: string, variables: string[]) {
    return new Promise<any[]>((resolve, reject) => {
      this.client.query(query, variables, (err, res) => {
        if (err) {
          reject(err)
        }
        console.log(err, res)
        if(res){

            resolve(res.rows)
        } else {
            let nothing : string[] = []
            resolve(nothing)
        }
      })
    })
  }
}
