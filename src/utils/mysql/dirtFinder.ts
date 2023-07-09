import * as vscode from "vscode";
import * as primKeysHelper from "./primaryKeyHelper";
import * as primKeysPlSqlHelper from "../plsql/primaryKeyHelper";
import { Parser } from "node-sql-parser";

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

export async function markSelectSQL(
  document: vscode.TextDocument,
  isLogged: boolean,
  loginData:
    | { host: string; user: string; password: string; database: string }
    | { user: string; password: string; connectionString: string }
) {
  if (document.languageId !== "sql") {
    return [];
  }

  // const openai = require('openai');
  // openai.apiKey = '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';

  // async function gptAPIFunc(prompt: string) {
  //   try {
  //     const response = await openai.Completion.create({
  //       engine: 'gpt-4.0-turbo',
  //       prompt: prompt,
  //       max_tokens: 60,
  //     });

  //     // Interpret the response in the context of your application.
  //     // Replace the following with your own logic.
  //     if (response.choices && response.choices[0] && response.choices[0].text.trim() !== '') {
  //       return true;
  //     }
  //   } catch (err) {
  //     console.error(err);
  //   }

  //   return false;
  // }
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

  const parser = new Parser();

  let decorations: vscode.DecorationOptions[] = [];
  let text = document.getText();

  let queries: string[] = text.split(";"); // split text by ';' to get individual queries

  for (let query of queries) {
    let ast;

    try {
      ast = parser.astify(query); // parse the query to get AST
    } catch (error) {
      // handle any parsing errors
      console.error("Error parsing query: ", error);
      continue;
    }

    if (Array.isArray(ast)) {
      ast.forEach((node) =>
        checkForCartesianProduct(node, query, decorations, document)
      );
    } else {
      checkForCartesianProduct(ast, query, decorations, document);
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

    if (isCartesianProduct(ast) || isUnusedJoin(ast) || isCrossJoin(ast)) {
      let start = document.positionAt(text.indexOf(query));
      let end = document.positionAt(text.indexOf(query) + query.length);
      decorations.push({
        range: new vscode.Range(start, end),
        hoverMessage:
          "Possible Cartesian product or unused join. Please review the query for potential issues.",
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

      conditions.forEach((condition: Condition) => {
        fromTables.forEach((table: Table) => {
          // If condition is a BinaryExpr
          if (
            typeof condition === "object" &&
            "left" in condition &&
            "right" in condition
          ) {
            const conditionString = `${condition.left.table} ${condition.right.table}`;

            if (
              conditionString.includes(`${table.name}`) ||
              conditionString.includes(`${table.name}`) ||
              conditionString.includes(`${table.alias}`) ||
              conditionString.includes(`${table.alias}`)
            ) {
              usedTables.add(table.name);
            }
          }
          // If condition is a string
          else if (
            typeof condition === "string" &&
            (condition.includes(`${table.name}`) ||
              condition.includes(`${table.name}`) ||
              condition.includes(`${table.alias}`) ||
              condition.includes(`${table.alias}`))
          ) {
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

  let matchImplicitJoin;
  let matchWhere: string;
  const implicitJoinRegex =
    /\bSELECT\b\s+((?:(?!SELECT|UPDATE|DELETE|INSERT)[\s\S])*?)\bFROM\b\s+((\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*)(\s+(WHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*))?)(\s*;)?\s*$/gim;

  while ((matchImplicitJoin = implicitJoinRegex.exec(text)) !== null) {
    if (matchImplicitJoin[13] === undefined) {
      matchWhere = "";
    } else {
      matchWhere = matchImplicitJoin[13].toString();
    }

    function isMysqlLoginData(loginData: any): loginData is {
      host: string;
      user: string;
      password: string;
      database: string;
    } {
      return (
        "host" in loginData &&
        "user" in loginData &&
        "password" in loginData &&
        "database" in loginData
      );
    }

    function isPlsqlLoginData(loginData: any): loginData is {
      user: string;
      password: string;
      connectionString: string;
    } {
      return (
        "user" in loginData &&
        "password" in loginData &&
        "connectionString" in loginData
      );
    }

    if (isMysqlLoginData(loginData)) {
      const [tablePrimKeys, isPrimaryKeyAbsent, isValidSql] =
        await primKeysHelper.checkImplicitPrimKeys(
          loginData,
          matchImplicitJoin,
          matchWhere
        );

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

  // SELECT *
  let matchSqlStar;
  const sqlStarStatements = /\bselect\s+\*\s+(from|into)\b/gim;
  while ((matchSqlStar = sqlStarStatements.exec(text)) !== null) {
    decorations.push();
    const start = document.positionAt(matchSqlStar.index);
    const end = document.positionAt(sqlStarStatements.lastIndex);

    decorations.push({
      range: new vscode.Range(start, end),
      hoverMessage: `Use column names instead of the "*" wildcard character.`,
    });
  }
  // SELECT *

  // UPDATE WITHOUT WHERE
  let matchUpdate;
  const updateStatement = /\bupdate\b\s+\b\w+\b\s+\bset\b\s+.+/gim;

  while ((matchUpdate = updateStatement.exec(text)) !== null) {
    if (!/\bwhere\b/i.test(matchUpdate[0])) {
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
  const sqlStatements =
    /(?<!--)\b(SELECT|UPDATE|INSERT|DELETE)\b.*?\bFROM\s+(\w+)$|\b(UPDATE)\s+(\w+)$/gim;

  while ((matchSqlStatements = sqlStatements.exec(text)) !== null) {
    matchWhere = "";

    function isMysqlLoginData(loginData: any): loginData is {
      host: string;
      user: string;
      password: string;
      database: string;
    } {
      return (
        "host" in loginData &&
        "user" in loginData &&
        "password" in loginData &&
        "database" in loginData
      );
    }

    if (isMysqlLoginData(loginData)) {
      const [tablePrimKeys, isPrimaryKeyAbsent, isValidSql] =
        await primKeysHelper.checkImplicitPrimKeys(
          loginData,
          matchSqlStatements,
          matchWhere
        );

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
    } else {
      matchJoinOn = matchExplicitJoin[10].toString();
    }

    function isMysqlLoginData(loginData: any): loginData is {
      host: string;
      user: string;
      password: string;
      database: string;
    } {
      return (
        "host" in loginData &&
        "user" in loginData &&
        "password" in loginData &&
        "database" in loginData
      );
    }

    function isPlsqlLoginData(loginData: any): loginData is {
      user: string;
      password: string;
      connectionString: string;
    } {
      return (
        "user" in loginData &&
        "password" in loginData &&
        "connectionString" in loginData
      );
    }

    if (isMysqlLoginData(loginData)) {
      const [tablePrimKeys, isPrimaryKeyAbsentExplicit, isValidExplicitSql] =
        await primKeysHelper.checkExplicitPrimKeys(
          loginData,
          matchExplicitJoin,
          matchJoinOn
        );

      if (isValidExplicitSql && isPrimaryKeyAbsentExplicit) {
        const start = document.positionAt(matchExplicitJoin.index);
        const end = document.positionAt(explicitJoinRegex.lastIndex);
        decorations.push({
          range: new vscode.Range(start, end),
          hoverMessage: `Use primary keys to optimize queries.   \n${tablePrimKeys}`,
        });
      }
    } else if (isPlsqlLoginData(loginData)) {
      const [tablePrimKeys, isPrimaryKeyAbsentExplicit, isValidExplicitSql] =
        await primKeysPlSqlHelper.checkExplicitPrimKeys(
          loginData,
          matchExplicitJoin,
          matchJoinOn
        );
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
