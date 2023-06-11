"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPrimKeys = void 0;
const queryHelper = require("./tableKeyHelper");
async function checkPrimKeys(credentials, implicitJoinMatch, matchWhere) {
    let isValidSql = false;
    let isPrimaryKeyAbsent = true;
    const tableNames = implicitJoinMatch[2].split(",").map((tableName) => {
        const tableNameParts = tableName.trim().split(/[.\s]+/); // get the table with (if there is) alias
        const lastElementTableDef = tableNameParts[tableNameParts.length - 1]; //get the last element of the table expression
        const tableNameOrAliasRegex = new RegExp(`\\b${lastElementTableDef}\\b`, 'gmi'); // as regex
        if (tableNameOrAliasRegex.test(matchWhere)) { // is the table or alias in the where clause
            isValidSql = true;
        }
        if (tableName.includes(".")) {
            return tableNameParts[1]; // if referencing with database
        }
        else {
            return tableNameParts[0]; // if only table 
        }
    });
    const primaryKeyMap = await queryHelper.findPrimaryKeys(tableNames, credentials.host, credentials.user, credentials.password, credentials.database);
    // Create a string of table names and their corresponding primary keys
    const tableInfo = tableNames
        .map((tableName) => {
        const primaryKeys = primaryKeyMap[tableName] ?? ["unknown"];
        return `${tableName}: ${primaryKeys.join(", ")}`;
    })
        .join("   \n");
    for (const tableName in primaryKeyMap) {
        const primaryKeys = primaryKeyMap[tableName] ?? ["unkown"];
        primaryKeys.forEach((primaryKey) => {
            const primaryKeyRegex = new RegExp(`\\b${primaryKey}\\b`, 'gmi');
            if (primaryKeyRegex.test(matchWhere)) {
                isPrimaryKeyAbsent = false;
            }
        });
    }
    return [tableInfo, isPrimaryKeyAbsent, isValidSql];
}
exports.checkPrimKeys = checkPrimKeys;
//# sourceMappingURL=primaryKey.js.map