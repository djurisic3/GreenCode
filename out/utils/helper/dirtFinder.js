"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markSelectSQL = void 0;
const vscode = require("vscode");
const primKeysHelper = require("../mysql/primaryKeyHelper");
const primKeysPlSqlHelper = require("../plsql/primaryKeyHelper");
const counter = require("./counter");
async function markSelectSQL(document, isLogged, loginData) {
    if (document.languageId !== "sql") {
        return [];
    }
    let text = document.getText();
    let decorations = [];
    let matchImplicitJoin;
    let matchWhere;
    const implicitJoinRegex = /\bSELECT\b\s+((?:(?!SELECT|UPDATE|DELETE|INSERT)[\s\S])*?)\bFROM\b\s+((\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*)\s+(WHERE\s+((\w+(\.\w+)?\s*=\s*(\([^)]*\)|[\s\S]+?))(?:\s*(AND|OR)\s+(\w+(\.\w+)?\s*=\s*(\([^)]*\)|[\s\S]+?)))*))?(?:\s*;)?[^\S\r\n]*$/gim;
    while ((matchImplicitJoin = implicitJoinRegex.exec(text)) !== null) {
        if (matchImplicitJoin[13] === undefined) {
            matchWhere = "";
        }
        else {
            matchWhere = matchImplicitJoin[13].toString();
        }
        function isMysqlLoginData(loginData) {
            return ("host" in loginData &&
                "user" in loginData &&
                "password" in loginData &&
                "database" in loginData);
        }
        function isPlsqlLoginData(loginData) {
            return ("user" in loginData &&
                "password" in loginData &&
                "connectionString" in loginData);
        }
        if (isMysqlLoginData(loginData)) {
            const [tablePrimKeys, isPrimaryKeyAbsent, isValidSql] = await primKeysHelper.checkImplicitPrimKeys(loginData, matchImplicitJoin, matchWhere);
            if (isValidSql && isPrimaryKeyAbsent) {
                const start = document.positionAt(matchImplicitJoin.index);
                const end = document.positionAt(implicitJoinRegex.lastIndex);
                counter.incrementCounter();
                decorations.push({
                    range: new vscode.Range(start, end),
                    hoverMessage: `Use primary keys to optimize queries.   \n${tablePrimKeys}`,
                });
            }
        }
        else if (isPlsqlLoginData(loginData)) {
            const [tablePrimKeys, isPrimaryKeyAbsentExplicit, isValidExplicitSql] = await primKeysPlSqlHelper.checkImplicitPrimKeys(loginData, matchImplicitJoin, matchWhere);
            if (isValidExplicitSql && isPrimaryKeyAbsentExplicit) {
                const start = document.positionAt(matchImplicitJoin.index);
                const end = document.positionAt(implicitJoinRegex.lastIndex);
                counter.incrementCounter();
                decorations.push({
                    range: new vscode.Range(start, end),
                    hoverMessage: `Use primary keys to optimize queries.   \n${tablePrimKeys}`,
                });
            }
        }
    }
    // UPDATE WITHOUT WHERE
    let matchUpdate;
    const updateStatement = /\bupdate\b\s+\b\w+\b\s+\bset\b\s+.+/gim;
    while ((matchUpdate = updateStatement.exec(text)) !== null) {
        if (!/\bwhere\b/i.test(matchUpdate[0])) {
            counter.incrementCounter();
            const start = document.positionAt(matchUpdate.index);
            const end = document.positionAt(updateStatement.lastIndex);
            decorations.push({
                range: new vscode.Range(start, end),
                hoverMessage: `Avoid UPDATE statements without a WHERE clause.`,
            });
        }
    }
    // UPDATE WITHOUT WHERE
    let matchSqlStatements;
    const sqlStatements = /(?<!--)\b(SELECT|UPDATE|INSERT|DELETE)\b.*?\bFROM\s+(\w+)$|\b(UPDATE)\s+(\w+)$/gim;
    while ((matchSqlStatements = sqlStatements.exec(text)) !== null) {
        matchWhere = "";
        function isMysqlLoginData(loginData) {
            return ("host" in loginData &&
                "user" in loginData &&
                "password" in loginData &&
                "database" in loginData);
        }
        if (isMysqlLoginData(loginData)) {
            const [tablePrimKeys, isPrimaryKeyAbsent, isValidSql] = await primKeysHelper.checkImplicitPrimKeys(loginData, matchSqlStatements, matchWhere);
            counter.incrementCounter();
            const start = document.positionAt(matchSqlStatements.index);
            const end = document.positionAt(sqlStatements.lastIndex);
            decorations.push({
                range: new vscode.Range(start, end),
                hoverMessage: `Use primary keys to optimize queries.   \n${tablePrimKeys}`,
            });
        }
    }
    let matchExplicitJoin;
    let matchJoinOn;
    const explicitJoinRegex = 
    // /\bSELECT\b(?:(?!\bFROM\b).)*((?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+(?=\b(?:INNER\s+)?JOIN\b))(?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?))(?:\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*)+))(?:(\s+WHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*))?)(\s*;)?\s*$/gim;
    // /\bSELECT\b\s*(?:(?!\bFROM\b).)*(?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+)((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*)+))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*)+))*)+(\s+WHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*))?(\s*;)?\s*$/gmi;
    // /\bSELECT\b\s*(?:(?!\bFROM\b).)*(?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+)((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*)+))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*)+))*)+(\s*;)?\s*$/gmi
    /\bSELECT\b\s*(?:(?!\bFROM\b).)*(?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+)((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))*)+(\s*;)?\s*$/gim;
    while ((matchExplicitJoin = explicitJoinRegex.exec(text)) !== null) {
        if (matchExplicitJoin[10] === undefined) {
            matchJoinOn = "";
        }
        else {
            matchJoinOn = matchExplicitJoin[10].toString();
        }
        function isMysqlLoginData(loginData) {
            return ("host" in loginData &&
                "user" in loginData &&
                "password" in loginData &&
                "database" in loginData);
        }
        function isPlsqlLoginData(loginData) {
            return ("user" in loginData &&
                "password" in loginData &&
                "connectionString" in loginData);
        }
        if (isMysqlLoginData(loginData)) {
            const [tablePrimKeys, isPrimaryKeyAbsentExplicit, isValidExplicitSql] = await primKeysHelper.checkExplicitPrimKeys(loginData, matchExplicitJoin, matchJoinOn);
            if (isValidExplicitSql && isPrimaryKeyAbsentExplicit) {
                counter.incrementCounter();
                const start = document.positionAt(matchExplicitJoin.index);
                const end = document.positionAt(explicitJoinRegex.lastIndex);
                decorations.push({
                    range: new vscode.Range(start, end),
                    hoverMessage: `Use primary keys to optimize queries.   \n${tablePrimKeys}`,
                });
            }
        }
        else if (isPlsqlLoginData(loginData)) {
            const [tablePrimKeys, isPrimaryKeyAbsentExplicit, isValidExplicitSql] = await primKeysPlSqlHelper.checkExplicitPrimKeys(loginData, matchExplicitJoin, matchJoinOn);
            if (isValidExplicitSql && isPrimaryKeyAbsentExplicit) {
                counter.incrementCounter();
                const start = document.positionAt(matchExplicitJoin.index);
                const end = document.positionAt(explicitJoinRegex.lastIndex);
                decorations.push({
                    range: new vscode.Range(start, end),
                    hoverMessage: `Use primary keys to optimize queries.   \n${tablePrimKeys}`,
                });
            }
        }
    }
    return decorations;
}
exports.markSelectSQL = markSelectSQL;
//# sourceMappingURL=dirtFinder.js.map