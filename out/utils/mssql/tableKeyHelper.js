"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPrimaryKeys = void 0;
const mysql = require("mysql");
async function findPrimaryKeys(query) {
    const pool = mysql.createPool({
        host: "localhost",
        user: "root",
        password: "m1d2e3j4",
        database: "sakila",
        connectionLimit: 10, // Optional: Limit the number of connections in the pool
    });
    // Test the connection
    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Error connecting to MySQL: ", err.stack);
            return;
        }
        console.log("Connected to MySQL as id ", connection.threadId);
        // Perform a sample query
        connection.query(query, (error, results, fields) => {
            connection.release(); // Release the connection
            if (error) {
                console.error("Error performing query: ", error);
                return;
            }
            console.log("The solution is: ", results[0].first_name);
            if (fields === undefined) {
                console.log("fields je undefined");
                return;
            }
            // Fetch the primary key information for the table
            connection.query(`SELECT column_name
         FROM information_schema.key_column_usage
         WHERE table_name = '${fields[0].table}'
           AND constraint_name = 'PRIMARY'`, (err, res, fld) => {
                if (err) {
                    console.error("Error fetching primary key: ", err);
                    return;
                }
                console.log(res[0]);
                const primaryKey = res[0].COLUMN_NAME;
                console.log(`Primary key for ${fields[0].table}: ${primaryKey}`);
            });
        });
    });
}
exports.findPrimaryKeys = findPrimaryKeys;
//# sourceMappingURL=tableKeyHelper.js.map