"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HisClient = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const pg_1 = require("pg");
class HisClient {
    constructor(config) {
        this.dbType = config.dbType;
        if (this.dbType === "postgres") {
            this.pool = new pg_1.Pool({
                host: config.db.host,
                port: config.db.port,
                user: config.db.user,
                password: config.db.password,
                database: config.db.database,
                max: 5
            });
            return;
        }
        this.pool = promise_1.default.createPool({
            host: config.db.host,
            port: config.db.port,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            waitForConnections: true,
            connectionLimit: 5
        });
    }
    async fetchWardRows(sql) {
        if (this.dbType === "postgres") {
            const result = await this.pool.query(sql);
            return result.rows;
        }
        const [rows] = await this.pool.query(sql);
        return rows;
    }
    async close() {
        if (this.dbType === "postgres") {
            await this.pool.end();
            return;
        }
        await this.pool.end();
    }
}
exports.HisClient = HisClient;
