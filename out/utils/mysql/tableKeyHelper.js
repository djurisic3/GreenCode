"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExistingIndexes = exports.findIndexCandidates = exports.findPrimaryKeys = void 0;
const mysql = require("mysql");
async function findPrimaryKeys(uniqueTableNames, host, user, password, database) {
    return new Promise((resolve, reject) => {
        const pool = mysql.createPool({
            host,
            user,
            password,
            database,
            connectionLimit: 200,
        });
        pool.getConnection((err, connection) => {
            if (err) {
                console.error("Error connecting to MySQL: ", err.stack);
                reject("no connection to server");
            }
            console.log("Connected to MySQL as id ", connection.threadId);
            const primaryKeyMap = {};
            connection.query(`SELECT column_name, table_name
         FROM information_schema.key_column_usage
         WHERE table_name IN (${uniqueTableNames
                .map((name) => `'${name}'`)
                .join(",")})
         AND constraint_name = 'PRIMARY'`, (err, res, fld) => {
                if (err) {
                    console.error("Error fetching primary keys: ", err);
                    reject("no primary keys found for tables");
                }
                res.forEach((row) => {
                    const columnName = row.COLUMN_NAME;
                    const tableName = row.TABLE_NAME;
                    if (primaryKeyMap[tableName]) {
                        primaryKeyMap[tableName].push(columnName);
                    }
                    else {
                        primaryKeyMap[tableName] = [columnName];
                    }
                });
                resolve(primaryKeyMap);
            });
        });
    });
}
exports.findPrimaryKeys = findPrimaryKeys;
async function findIndexCandidates(tableColumns, host, user, password, database) {
    return new Promise(async (resolve, reject) => {
        const pool = mysql.createPool({
            host,
            user,
            password,
            database,
            connectionLimit: 200,
        });
        pool.getConnection(async (err, connection) => {
            if (err) {
                console.error("Error connecting to MySQL: ", err.stack);
                reject("no connection to server");
            }
            console.log("Connected to MySQL as id ", connection.threadId);
            const cardinalityMap = {};
            // Collect unique table names and their respective column names
            const uniqueTableColumns = {};
            tableColumns.forEach(({ table, columnName }) => {
                if (uniqueTableColumns[table]) {
                    uniqueTableColumns[table].add(columnName);
                }
                else {
                    uniqueTableColumns[table] = new Set([columnName]);
                }
            });
            const queries = [];
            for (const table in uniqueTableColumns) {
                uniqueTableColumns[table].forEach((columnName) => {
                    queries.push(new Promise((resolve, reject) => {
                        connection.query(`SELECT '${table}' AS table_name, '${columnName}' AS column_name, COUNT(DISTINCT ${columnName}) AS cardinality
                FROM ${table}`, (err, res) => {
                            if (err) {
                                console.error(`Error fetching cardinality for table ${table}, column ${columnName}: `, err);
                                resolve(null);
                            }
                            else {
                                res.forEach((row) => {
                                    const tableName = row.table_name;
                                    const columnName = row.column_name;
                                    const cardinality = row.cardinality;
                                    if (cardinalityMap[tableName]) {
                                        cardinalityMap[tableName][columnName] = cardinality;
                                    }
                                    else {
                                        cardinalityMap[tableName] = { [columnName]: cardinality };
                                    }
                                });
                                resolve(null);
                            }
                        });
                    }));
                });
            }
            try {
                await Promise.all(queries);
                resolve(cardinalityMap);
            }
            catch (err) {
                console.error("Error fetching column cardinalities: ", err);
                reject("no cardinalities found for columns");
            }
        });
    });
}
exports.findIndexCandidates = findIndexCandidates;
async function checkExistingIndexes(tableName, columnName, host, user, password, database) {
    return new Promise((resolve, reject) => {
        const pool = mysql.createPool({
            host,
            user,
            password,
            database,
            connectionLimit: 200,
        });
        pool.getConnection((err, connection) => {
            if (err) {
                console.error("Error connecting to MySQL: ", err.stack);
                reject("no connection to server");
            }
            console.log("Connected to MySQL as id ", connection.threadId);
            connection.query(`SHOW INDEXES FROM \`${tableName}\` WHERE Column_name = ?;`, [columnName], (err, rows, fields) => {
                if (err) {
                    console.error("Error fetching indexes: ", err);
                    reject("error fetching indexes");
                }
                resolve(rows.length > 0);
            });
        });
    });
}
exports.checkExistingIndexes = checkExistingIndexes;
//# sourceMappingURL=tableKeyHelper.js.map