"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExplicitPrimKeys = void 0;
const tableIndexesHelper_1 = require("./tableIndexesHelper");
async function checkExplicitPrimKeys(credentials, matchExplicitJoin, matchJoinOn) {
    let isValidSql;
    let isPrimaryKeyAbsent = false;
    let allTablesOrAliases = new Map();
    const joinPattern = /(?:FROM|JOIN)\s+([\w]+)(?:\s+AS)?(?:\s+([a-zA-Z]+))?/gi;
    const matchTablesFromJoinOn = Array.from(matchExplicitJoin[0].matchAll(joinPattern));
    const tableNames = matchTablesFromJoinOn.map((match) => {
        if (/inner|join|full|left|right|on/i.test(match[2])) {
            return match[1].trim();
        }
        else {
            return (match[2] ? match[1] + " " + match[2] : match[1]).trim();
        }
    });
    isValidSql = true;
    for (const tableName of tableNames) {
        const tableNameParts = tableName.trim().split(/[.\s]+/);
        const lastElementTableDef = tableNameParts[tableNameParts.length - 1];
        const tableNameOrAliasRegex = new RegExp(`\\b${lastElementTableDef}.\\b`, "gmi");
        if (!tableNameOrAliasRegex.test(matchJoinOn)) {
            isValidSql = false;
        }
        allTablesOrAliases.set(tableNameParts[0], lastElementTableDef);
    }
    const tableAliasMap = new Map();
    const processedTableNames = tableNames.map((tableName) => {
        const tableNameParts = tableName.trim().split(/[.\s]+/);
        const alias = tableNameParts.length > 1
            ? tableNameParts[tableNameParts.length - 1]
            : "";
        const actualTableName = tableName.includes(".")
            ? tableNameParts[1]
            : tableNameParts[0];
        if (alias) {
            tableAliasMap.set(alias, actualTableName);
        }
        return actualTableName;
    });
    console.log('processedTableNames:', processedTableNames);
    console.log('tableAliasMap:', tableAliasMap);
    await (0, tableIndexesHelper_1.openConnection)(credentials.user, credentials.password, credentials.connectionString);
    const primaryKeyMap = await (0, tableIndexesHelper_1.findPrimaryKeys)(processedTableNames);
    console.log("CONNECTION OPEN");
    console.log("PRIMARY KEY MAP: " + primaryKeyMap);
    // Create a string of table names and their corresponding primary keys
    const tableInfo = processedTableNames
        .map((tableName) => {
        const primaryKeys = primaryKeyMap[tableName.toLocaleUpperCase()] ?? ["unknown"];
        return `${tableName}: ${primaryKeys.join(", ")}`;
    })
        .join("   \n");
    console.log("TABLE INFO: ", tableInfo);
    for (const tableName in primaryKeyMap) {
        const primaryKeys = primaryKeyMap[tableName] ?? ["unknown"];
        console.log('Checking primaryKeys for tableName: ', tableName);
        console.log('primaryKeys: ', primaryKeys);
        let allPrimaryKeysPresent = true;
        primaryKeys.forEach((primaryKey) => {
            const table = allTablesOrAliases.get(tableName);
            const primaryKeyRegex = new RegExp(`\\b${table}\\.${primaryKey}\\b`, "gmi");
            console.log("TABLE: " + table);
            console.log("PRIM KEY: " + primaryKey);
            if (!primaryKeyRegex.test(matchJoinOn)) {
                allPrimaryKeysPresent = false;
            }
        });
        if (!allPrimaryKeysPresent) {
            isPrimaryKeyAbsent = true;
            break;
        }
    }
    return [
        tableInfo,
        isPrimaryKeyAbsent,
        isValidSql,
        primaryKeyMap,
        tableAliasMap,
    ];
}
exports.checkExplicitPrimKeys = checkExplicitPrimKeys;
//# sourceMappingURL=primaryKeyHelper.js.map