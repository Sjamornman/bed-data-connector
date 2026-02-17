import mysql, { Pool as MySqlPool } from "mysql2/promise";
import { Pool as PgPool } from "pg";
import { ConnectorConfig } from "./types";

type SupportedPool = MySqlPool | PgPool;

export class HisClient {
  private readonly pool: SupportedPool;
  private readonly dbType: ConnectorConfig["hisDbType"];

  constructor(config: {
    dbType: ConnectorConfig["hisDbType"];
    db: ConnectorConfig["hisDb"];
  }) {
    this.dbType = config.dbType;

    if (this.dbType === "postgres") {
      this.pool = new PgPool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        max: 5
      });
      return;
    }

    this.pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 5
    });
  }

  async fetchWardRows<T extends object>(sql: string): Promise<T[]> {
    if (this.dbType === "postgres") {
      const result = await (this.pool as PgPool).query(sql);
      return result.rows as T[];
    }

    const [rows] = await (this.pool as MySqlPool).query(sql);
    return rows as T[];
  }

  async close() {
    if (this.dbType === "postgres") {
      await (this.pool as PgPool).end();
      return;
    }
    await (this.pool as MySqlPool).end();
  }
}
