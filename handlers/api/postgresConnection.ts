import { Client } from 'pg'

export class PostgresConnection {
  private password: string
  private dbUser: string
  private host: string
  private database: string
  private port: number
  //TODO: This might be better served as a pool.
  private client: Client
  private dbSetup: boolean
  constructor(dbUser: string, password: string, host: string, database: string, port: number = 5432) {
    console.log(dbUser, password, host, database, port)
    this.dbSetup = false
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
    if(!this.dbSetup){

      let extQuery = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
      let extValues : string[] = []
  
      await this.runQuery(extQuery, extValues)
  
      let query = `-- SQL dump generated using DBML (dbml-lang.org)
      -- Database: PostgreSQL
      -- Generated at: 2021-08-13T00:30:54.877Z
  
      
      
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid UNIQUE PRIMARY KEY DEFAULT (uuid_generate_v4()),
        "username" varchar UNIQUE NOT NULL,
        "role" varchar,
        "created_at" timestamp DEFAULT (now()),
        "active" bool DEFAULT (true)
      );
      
      CREATE TABLE IF NOT EXISTS "move" (
        "id" uuid UNIQUE PRIMARY KEY DEFAULT (uuid_generate_v4()),
        "user_id" uuid NOT NULL,
        "move_name" varchar UNIQUE NOT NULL,
        "created_at" timestamp DEFAULT (now()),
        "active" bool DEFAULT (true)
      );
      
      CREATE TABLE IF NOT EXISTS "box" (
        "id" uuid UNIQUE PRIMARY KEY DEFAULT (uuid_generate_v4()),
        "move_id" uuid NOT NULL,
        "box_name" varchar UNIQUE NOT NULL,
        "box_desc" varchar,
        "created_at" timestamp DEFAULT (now()),
        "active" bool DEFAULT (true)
      );
      
      CREATE TABLE IF NOT EXISTS "item" (
        "id" uuid UNIQUE PRIMARY KEY DEFAULT (uuid_generate_v4()),
        "box_id" uuid NOT NULL,
        "item_name" varchar UNIQUE NOT NULL,
        "item_desc" varchar,
        "created_at" timestamp DEFAULT (now()),
        "active" bool DEFAULT (true)
      );

      declare
      BEGIN
        ALTER TABLE "move" ADD CONSTRAINT IF NOT EXISTS "user_to_move" FOREIGN KEY ("user_id") REFERENCES "users" ("id");
      
        ALTER TABLE "box" ADD CONSTRAINT IF NOT EXISTS "move_to_box" FOREIGN KEY ("move_id") REFERENCES "move" ("id");
      
        ALTER TABLE "item" ADD CONSTRAINT IF NOT EXISTS "box_to_item" FOREIGN KEY ("box_id") REFERENCES "box" ("id");
      END;
      `
      const values: string[] = []
      let dbPromise = this.runQuery(query, values)
      this.dbSetup = true
      return new Promise<any[]>(async (resolve, reject) => {
        try {
          await dbPromise
        } catch (error) {
          
        }
        resolve([])
      })
    } else {
      return new Promise<any[]>((resolve, reject) => {
        resolve([])
      })
    }
  }

  public async insertUser(username: string): Promise<any[]> {
    await this.setupDB()
    const query: string = 'INSERT INTO users(username) VALUES($1) RETURNING *'
    const values = [username]
    let dbPromise = this.runQuery(query, values)
    return dbPromise
  }

  public async selectUsers(): Promise<any[]> {
    await this.setupDB()
    const query: string = 'SELECT * FROM users'
    const values: string[] = []
    let dbPromise = this.runQuery(query, values)
    return dbPromise
  }

  public async checkConnection(): Promise<any[]> {
    await this.setupDB()
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
