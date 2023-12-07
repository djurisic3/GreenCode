import * as vscode from "vscode";
import { Parser } from "node-sql-parser";
import * as counter from "./counter";
import { addLocation, clearLocations } from "../plsql/codeLocationStorage";

export function findSelectAsteriskStatements(
  document: vscode.TextDocument
): vscode.DecorationOptions[] {
  let decorations: vscode.DecorationOptions[] = [];
  let text = document.getText();

  clearLocations("high");
  if (document.languageId.includes("sql") === false) {
    return [];
  }

  // Cartesian logic
  const parser = new Parser();

  interface BinaryExpr {
    type: string;
    operator: string;
    left: {
      type: string;
      table: string;
      column: string;
    };
    right: {
      type: string;
      table: string;
      column: string;
    };
  }

  interface Node {
    table: any;
    as: any;
    join: any[];
    on: BinaryExpr;
  }

  interface Table {
    name: string;
    alias?: string;
  }

  type Condition = string | BinaryExpr;

  // SELECT * logic
  const sqlStarStatements = /\bselect\s+(?:\w+\.)?\*\s+(from|into)\b/gim;
  let matchSqlStar;
  while ((matchSqlStar = sqlStarStatements.exec(text)) !== null) {
    counter.incrementCounterCritical();
    const start = document.positionAt(matchSqlStar.index);
    const end = document.positionAt(sqlStarStatements.lastIndex);
    const savedRange = new vscode.Range(start, end);
    addLocation(savedRange, "high");
    decorations.push({
      range: new vscode.Range(start, end),
      hoverMessage: `Use column names instead of the "*" wildcard character.   \nYou can save up to 40% in energy per statement call when using only relevant columns.`,
    });
  }

  let queries: string[] = text.split(/;(?![^(]*\))|(?<=\))/gm); // split text by ';' to get individual queries

  const forLoopRegex =
    /FOR\s+\w+\s+IN\s+\(([^)]+)\)\s+LOOP[\s\S]+?END\s+LOOP;/gim;
  let forLoopMatches = text.matchAll(forLoopRegex);

  // Process FOR loop queries
  for (const match of forLoopMatches) {
    let innerQuery = match[1]; // The capturing group with the query
    if (innerQuery) {
      try {
        let ast = parser.astify(innerQuery);
        processAstNode(ast, innerQuery, decorations, document);
      } catch (error) {
        // Handle parse error or skip
      }
    }
  }

  for (let query of queries) {
    let ast;

    try {
      ast = parser.astify(query);
    } catch (error) {
      continue;
    }

    processAstNode(ast, query, decorations, document);
  }

  return decorations;

  function processAstNode(
    ast: any,
    query: string,
    decorations: vscode.DecorationOptions[],
    document: vscode.TextDocument
  ) {
    if (Array.isArray(ast)) {
      ast.forEach((node) => processAstNode(node, query, decorations, document));
    } else if (ast && ast.type === "select") {
      checkForCartesianProduct(ast, query, decorations, document);
      processNestedSelects(ast, query, decorations, document);
    }
  }

  function processNestedSelects(
    ast: any,
    query: string,
    decorations: vscode.DecorationOptions[],
    document: vscode.TextDocument
  ) {
    // Process nested queries in the FROM clause
    if (ast.from) {
      ast.from.forEach((fromItem: any) => {
        if (
          fromItem.expr &&
          fromItem.expr.ast &&
          fromItem.expr.ast.type === "select"
        ) {
          processAstNode(fromItem.expr.ast, query, decorations, document);
        }
      });
    }
  }

  function checkForCartesianProduct(
    ast: any,
    query: string,
    decorations: vscode.DecorationOptions[],
    document: vscode.TextDocument
  ) {
    if (!ast || ast === undefined) {
      return;
    }

    //counter.resetCounterCritical(); // reseting counter and locations of high severity code spots

    if (isCartesianProduct(ast) || isUnusedJoin(ast) || isCrossJoin(ast)) {
      let start = document.positionAt(text.indexOf(query));
      let end = document.positionAt(text.indexOf(query) + query.length);
      const savedRange = new vscode.Range(start, end);
      addLocation(savedRange, "high");
      counter.incrementCounterCritical();
      decorations.push({
        range: new vscode.Range(start, end),
        hoverMessage:
          "Cartesian product or unused join detected. Please review the query for potential issues.",
      });
    }
  }

  function isUnusedJoin(ast: any): boolean {
    if (ast.type === "select" && ast.join) {
      const joinTables = ast.join.map((joinNode: any) => joinNode.table);
      const fromTables = ast.from.map((fromNode: any) => fromNode.table);
      const unusedJoin = joinTables.some(
        (joinTable: any) => !fromTables.includes(joinTable)
      );
      return unusedJoin;
    }
    return false;
  }

  function isCrossJoin(ast: any): boolean {
    if (
      ast.type === "select" &&
      ast.from &&
      ast.from.length === 1 &&
      ast.from[0].type === "table" &&
      ast.from[0].join &&
      ast.from[0].join[0].type === "cross"
    ) {
      return true;
    }
    return false;
  }

  function isCartesianProduct(ast: any): boolean {
    if (!ast || ast.type !== "select" || !ast.from || ast.from.length <= 1) {
      return false;
    }

    const hasSubquery = ast.from.some(
      (fromItem: { expr: { ast: { type: string } } }) =>
        fromItem.expr &&
        fromItem.expr.ast &&
        fromItem.expr.ast.type === "select"
    );

    // if (hasSubquery) {
    //   // Here, you can add logic to check whether these subqueries are joined correctly
    //   // For now, we will return true if there's at least one subquery in the FROM clause
    //   return true;
    // }

    const fromTables: Table[] = [];
    const joinConditions: any[] = [];


    function recurseThroughJoinAndFromNodes(node: Node) {
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

    ast.from.forEach((fromNode: Node) =>
      recurseThroughJoinAndFromNodes(fromNode)
    );

    if (!ast.where && joinConditions.length === 0) {
      return true;
    } else {
      const conditions: Condition[] = ast.where
        ? extractWhereConditions(ast.where)
        : [];
      conditions.push(...joinConditions);
      const usedTables = new Set<string>();

      function extractTableNames(condition: any) {
        if (!condition) {
          return;
        }

        // Recursively process binary expressions
        if (condition.type === "binary_expr") {
          extractTableNames(condition.left);
          extractTableNames(condition.right);
        }

        // Extract table names from column references
        if (condition.type === "column_ref") {
          usedTables.add(condition.table);
        }
      }

      conditions.forEach(extractTableNames);
      joinConditions.forEach(extractTableNames);

      // If not all tables are used in ON conditions, it's a Cartesian product
      // Compare the elements of usedTables with fromTables
      const allTablesUsed = fromTables.every(
        (table) =>
          usedTables.has(table.name) ||
          (table.alias && usedTables.has(table.alias))
      );

      if (!allTablesUsed) {
      }
      // A Cartesian product is present if not all tables are used in the conditions
      return !allTablesUsed;
    }
  }

  function extractJoinConditions(joinNodeOrArray: any): string[] {
    let conditions: string[] = [];

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

  function extractWhereConditions(whereObj: any): string[] {
    let conditions: string[] = [];
    // Recursively process the left part of the whereObj
    if (whereObj && whereObj.left) {
      conditions = conditions.concat(extractWhereConditions(whereObj.left));
    }

    // Recursively process the right part of the whereObj
    if (whereObj && whereObj.right) {
      conditions = conditions.concat(extractWhereConditions(whereObj.right));
    }

    // If whereObj itself is a condition (e.g., a binary expression), handle it
    if (whereObj && whereObj.type === "binary_expr") {
      // Construct a condition string from the binary expression
      conditions.push(whereObj);
    }
    return conditions;
  }
  //

  return decorations;
}
