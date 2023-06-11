"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = void 0;
// dbPool.ts
const mysql = require("mysql");
let pool = null;
function getPool(host, user, password, database) {
    if (!pool) {
        pool = mysql.createPool({
            host,
            user,
            password,
            database,
            connectionLimit: 10000,
        });
    }
    return pool;
}
exports.getPool = getPool;
//# sourceMappingURL=dbPool.js.map