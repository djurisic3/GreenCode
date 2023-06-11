"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markSelectSQL = void 0;
const vscode = require("vscode");
const primKeysHelper = require("./primaryKeyHelper");
const primKeysPlSqlHelper = require("../plsql/primaryKeyHelper");
const node_sql_parser_1 = require("node-sql-parser");
async function markSelectSQL(document, isLogged, loginData) {
    if (document.languageId !== "sql") {
        return [];
    }
    // let loginData;
    // if (isLogged) {
    //   loginData = loginData;
    //   if (!loginData) {
    //     vscode.window.showErrorMessage("Missing login data");
    //     return [];
    //   }
    // } else {
    //   loginData = await getLoginDataMySql();
    //   if (!loginData) {
    //     return [];
    //   }
    // }
    const parser = new node_sql_parser_1.Parser();
    let decorations = [];
    let text = document.getText();
    let queries = text.split(";"); // split text by ';' to get individual queries
    for (let query of queries) {
        let ast;
        try {
            ast = parser.astify(query); // parse the query to get AST
        }
        catch (error) {
            // handle any parsing errors
            console.error("Error parsing query: ", error);
            continue;
        }
        if (Array.isArray(ast)) {
            ast.forEach((node) => checkForCartesianProduct(node, query, decorations, document));
        }
        else {
            checkForCartesianProduct(ast, query, decorations, document);
        }
    }
    function checkForCartesianProduct(ast, query, decorations, document) {
        if (isCartesianProduct(ast) || isUnusedJoin(ast) || isCrossJoin(ast)) {
            let start = document.positionAt(text.indexOf(query));
            let end = document.positionAt(text.indexOf(query) + query.length);
            decorations.push({
                range: new vscode.Range(start, end),
                hoverMessage: "Possible Cartesian product or unused join. Please review the query for potential issues.",
            });
        }
    }
    // function isCartesianProduct(ast: any): boolean {
    //   if (ast.type === "select" && ast.from && ast.from.length > 1) {
    //     return true;
    //   }
    //   return false;
    // }
    function isUnusedJoin(ast) {
        if (ast.type === "select" && ast.join) {
            const joinTables = ast.join.map((joinNode) => joinNode.table);
            const fromTables = ast.from.map((fromNode) => fromNode.table);
            const unusedJoin = joinTables.some((joinTable) => !fromTables.includes(joinTable));
            return unusedJoin;
        }
        return false;
    }
    function isCrossJoin(ast) {
        if (ast.type === "select" &&
            ast.from &&
            ast.from.length === 1 &&
            ast.from[0].type === "table" &&
            ast.from[0].join &&
            ast.from[0].join[0].type === "cross") {
            return true;
        }
        return false;
    }
    function isCartesianProduct(ast) {
        if (ast.type === "select" && ast.from && ast.from.length > 1) {
            const fromTables = ast.from.map((fromNode) => fromNode.table || fromNode.as);
            const joinConditions = ast.from
                .filter((fromNode) => fromNode.join)
                .flatMap((fromNode) => extractJoinConditions(fromNode.join));
            if (!ast.where && joinConditions.length === 0) {
                // If there's no WHERE clause or JOIN conditions, it's a Cartesian product
                return true;
            }
            else {
                const conditions = ast.where ? extractWhereConditions(ast.where) : [];
                conditions.push(...joinConditions);
                const usedTables = new Set();
                conditions.forEach((condition) => {
                    fromTables.forEach((table) => {
                        if (condition.includes(`"${table}"`) ||
                            condition.includes(`'${table}'`)) {
                            usedTables.add(table);
                        }
                    });
                });
                // If not all tables are used in WHERE or JOIN conditions, it's a Cartesian product
                if (usedTables.size < fromTables.length) {
                    return true;
                }
            }
        }
        return false;
    }
    function extractWhereConditions(whereObj) {
        let conditions = [];
        if (whereObj.condition) {
            conditions.push(whereObj.condition);
        }
        if (whereObj.left) {
            conditions = conditions.concat(extractWhereConditions(whereObj.left));
        }
        if (whereObj.right) {
            conditions = conditions.concat(extractWhereConditions(whereObj.right));
        }
        return conditions;
    }
    function extractJoinConditions(joinNodeOrArray) {
        let conditions = [];
        // Check if the input is an array, and if so, extract conditions from each join object in the array
        if (Array.isArray(joinNodeOrArray)) {
            joinNodeOrArray.forEach((joinObj) => {
                if (joinObj.on) {
                    conditions.push(joinObj.on);
                }
            });
        }
        // If the input is not an array but a single join object, extract the condition from it
        else if (joinNodeOrArray && joinNodeOrArray.on) {
            conditions.push(joinNodeOrArray.on);
        }
        return conditions;
    }
    let matchImplicitJoin;
    let matchWhere;
    const implicitJoinRegex = /\bSELECT\b\s+((?:(?!SELECT|UPDATE|DELETE|INSERT)[\s\S])*?)\bFROM\b\s+((\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*)(\s+(WHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*))?)(\s*;)?\s*$/gim;
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
                decorations.push({
                    range: new vscode.Range(start, end),
                    hoverMessage: `Use primary keys to optimize queries.   \n${tablePrimKeys}`,
                });
            }
        }
    }
    let matchSqlStar;
    const sqlStarStatements = /\bselect\s+\*\s+from\b/gim;
    while ((matchSqlStar = sqlStarStatements.exec(text)) !== null) {
        decorations.push();
        const start = document.positionAt(matchSqlStar.index);
        const end = document.positionAt(sqlStarStatements.lastIndex);
        decorations.push({
            range: new vscode.Range(start, end),
            hoverMessage: `Use column names instead of the "*" wildcard character.`,
        });
    }
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
            console.log("tablePrimKeys: " + tablePrimKeys);
            console.log("isPrimaryKeyAbsentExplicit: " + isPrimaryKeyAbsentExplicit);
            console.log("isValidExplicitSql: " + isValidExplicitSql);
            if (isValidExplicitSql && isPrimaryKeyAbsentExplicit) {
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