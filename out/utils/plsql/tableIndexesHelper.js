"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExistingIndexes = exports.findIndexCandidates = exports.findPrimaryKeys = exports.openConnection = void 0;
const oracledb = require("oracledb");
const conn = require("./loginManager");
oracledb.initOracleClient({
    libDir: "C:\\Users\\dario\\Downloads\\instantclient-basic-windows.x64-21.10.0.0.0dbru\\instantclient_21_10",
});
async function openConnection(user, password, connectString) {
    const connection = await oracledb.getConnection({
        user,
        password,
        connectString,
    });
    return connection;
}
exports.openConnection = openConnection;
async function findPrimaryKeys(uniqueTableNames) {
    let loginData = await conn.getLoginDataPlSql();
    const connection = await openConnection(loginData?.user, loginData?.password, loginData?.connectionString);
    // Constructing the parameterized part of the query
    let uniqueTableNamesLowercase = uniqueTableNames.map((name) => name.toUpperCase());
    // Create an object for binding
    let bindObj = {};
    uniqueTableNamesLowercase.forEach((name, index) => {
        bindObj[`val${index}`] = name;
    });
    // Create a list of bind variables names
    let bindvarsStr = Object.keys(bindObj)
        .map((name) => `:${name}`)
        .join(", ");
    const result = await connection.execute(`SELECT ind.index_name, ind.table_name, cols.column_name
     FROM user_indexes ind, user_ind_columns cols
     WHERE ind.index_name = cols.index_name
     AND ind.table_name = cols.table_name
     AND cols.table_name IN (${bindvarsStr})
     ORDER BY cols.table_name, cols.column_position`, bindObj, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log("ORACLE DB QUERY: " + result);
    const primaryKeyMap = {};
    if (result.rows && Array.isArray(result.rows)) {
        for (let row of result.rows) {
            console.log("ROW HERE XXXXX: " + row);
            const tableName = row.TABLE_NAME;
            console.log("TABLENAME:  ", tableName);
            const columnName = row.COLUMN_NAME;
            if (!primaryKeyMap[tableName]) {
                primaryKeyMap[tableName] = [];
            }
            primaryKeyMap[tableName].push(columnName);
        }
    }
    await connection.close();
    return primaryKeyMap;
}
exports.findPrimaryKeys = findPrimaryKeys;
async function findIndexCandidates(tableColumns) {
    const connection = await openConnection("system", "m1d2e3j4", "localhost:1521");
    const cardinalityMap = {};
    for (let { table, columnName } of tableColumns) {
        const result = await connection.execute(`SELECT COUNT(*) as cardinality FROM (SELECT DISTINCT ${columnName} FROM ${table})`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (result.rows && Array.isArray(result.rows)) {
            const cardinality = result.rows[0].CARDINALITY;
            if (!cardinalityMap[table]) {
                cardinalityMap[table] = {};
            }
            cardinalityMap[table][columnName] = cardinality;
        }
    }
    await connection.close();
    return cardinalityMap;
}
exports.findIndexCandidates = findIndexCandidates;
async function checkExistingIndexes(tableName, columnName) {
    const connection = await openConnection("system", "m1d2e3j4", "localhost:1521");
    const result = await connection.execute(`SELECT column_name
    FROM USER_IND_COLUMNS
    WHERE table_name = :tableName
    AND column_name = :columnName`, { tableName, columnName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    await connection.close();
    return result.rows && Array.isArray(result.rows) && result.rows.length > 0
        ? true
        : false;
}
exports.checkExistingIndexes = checkExistingIndexes;
//# sourceMappingURL=tableIndexesHelper.js.map