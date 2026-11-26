import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";
import { env } from "../env";

export const pool = mysql.createPool({
  uri: env.DATABASE_URL,
  connectionLimit: 10,
  waitForConnections: true,
  enableKeepAlive: true,
});

export const db = drizzle(pool, { schema, mode: "default" });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Executor = Db | Tx;
