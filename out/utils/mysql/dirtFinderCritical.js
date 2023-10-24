"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSelectAsteriskStatements = void 0;
const vscode = require("vscode");
const node_sql_parser_1 = require("node-sql-parser");
function findSelectAsteriskStatements(document) {
    let decorations = [];
    let text = document.getText();
    if (document.languageId !== "sql") {
        return [];
    }
    // Cartesian logic
    const parser = new node_sql_parser_1.Parser();
    let queries = text.split(/;|\)/); // split text by ';' to get individual queries
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
        if (!ast || ast === undefined) {
            return;
        }
        if (isCartesianProduct(ast) || isUnusedJoin(ast) || isCrossJoin(ast)) {
            let start = document.positionAt(text.indexOf(query));
            let end = document.positionAt(text.indexOf(query) + query.length);
            decorations.push({
                range: new vscode.Range(start, end),
                hoverMessage: "Cartesian product or unused join detected. Please review the query for potential issues.",
            });
        }
    }
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
        if (!ast || ast.type !== "select" || !ast.from || ast.from.length <= 1) {
            return false;
        }
        const fromTables = [];
        const joinConditions = [];
        function recurseThroughJoinAndFromNodes(node) {
            if (!node) {
                return;
            }
            if (node.table || node.as) {
                fromTables.push({
                    name: node.table,
                    alias: node.as || null,
                });
            }
            // Checking for join condition in the node
            if (node.on) {
                joinConditions.push(node.on);
            }
            if (node.join) {
                const joins = Array.isArray(node.join) ? node.join : [node.join];
                joins.forEach((joinNode) => {
                    if (joinNode.on) {
                        joinConditions.push(...extractJoinConditions(joinNode));
                    }
                    recurseThroughJoinAndFromNodes(joinNode.table);
                });
            }
        }
        ast.from.forEach((fromNode) => recurseThroughJoinAndFromNodes(fromNode));
        if (!ast.where && joinConditions.length === 0) {
            return true;
        }
        else {
            const conditions = ast.where
                ? extractWhereConditions(ast.where)
                : [];
            conditions.push(...joinConditions);
            const usedTables = new Set();
            conditions.forEach((condition) => {
                fromTables.forEach((table) => {
                    // If condition is a BinaryExpr
                    if (typeof condition === "object" &&
                        "left" in condition &&
                        "right" in condition) {
                        const conditionString = `${condition.left.table} ${condition.right.table}`;
                        if (conditionString.includes(`${table.name}`) ||
                            conditionString.includes(`${table.name}`) ||
                            conditionString.includes(`${table.alias}`) ||
                            conditionString.includes(`${table.alias}`)) {
                            usedTables.add(table.name);
                        }
                    }
                    // If condition is a string
                    else if (typeof condition === "string" &&
                        (condition.includes(`${table.name}`) ||
                            condition.includes(`${table.name}`) ||
                            condition.includes(`${table.alias}`) ||
                            condition.includes(`${table.alias}`))) {
                        usedTables.add(table.name);
                    }
                });
            });
            // If not all tables are used in ON conditions, it's a Cartesian product
            if (usedTables.size < fromTables.length) {
                return true;
            }
        }
        return false;
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
    //
    const forLoopRanges = [];
    // SELECT * in a for loop
    const sqlStarForLoop = /for\s+([a-zA-Z0-9_]+)\s+in\s*\(\s*(select\s+(?:[a-zA-Z0-9_]+\.\*)?\s*\*?\s+from\s+[a-zA-Z0-9_]+.*?)(?=\s*\)\s+loop)/gim;
    let matchSqlStarForLoop;
    while ((matchSqlStarForLoop = sqlStarForLoop.exec(text)) !== null) {
        const start = document.positionAt(matchSqlStarForLoop.index);
        const end = document.positionAt(sqlStarForLoop.lastIndex);
        const range = new vscode.Range(start, end);
        forLoopRanges.push(range);
        decorations.push({
            range: range,
            hoverMessage: `Use column names instead of the "*" wildcard character. For loops use much more energy than regular queries.`,
        });
    }
    // Check if a given position is within any of the for-loop ranges
    const isInForLoopRange = (position) => {
        return forLoopRanges.some((range) => range.contains(position));
    };
    // SELECT * logic
    const sqlStarStatements = /\bselect\s+\*\s+(from|into)\b/gim;
    let matchSqlStar;
    while ((matchSqlStar = sqlStarStatements.exec(text)) !== null) {
        const start = document.positionAt(matchSqlStar.index);
        // If this select * is inside a for loop, skip adding the decoration
        if (isInForLoopRange(start)) {
            continue;
        }
        const end = document.positionAt(sqlStarStatements.lastIndex);
        decorations.push({
            range: new vscode.Range(start, end),
            hoverMessage: `Use column names instead of the "*" wildcard character.   \nYou can save up to 40% in energy per statement call when using only relevant columns.`,
        });
    }
    return decorations;
}
exports.findSelectAsteriskStatements = findSelectAsteriskStatements;
//# sourceMappingURL=dirtFinderCritical.js.map