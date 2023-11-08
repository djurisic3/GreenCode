import * as hover from "./hoverProvider";
import * as vscode from "vscode";
import * as cursor from "./cursorHelper";
import {
  checkExplicitPrimKeys,
  checkImplicitPrimKeys,
} from "./primaryKeyHelper";
import {getLoginDataMySql} from "./loginManager";

export async function sqlImplicitJoinHoverReplacement(
  currentSqlHover: hover.sqlImplicitJoinHover
) {
  let replacedCode: string;
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const loginData = await getLoginDataMySql();
  if (!loginData) return;

  let matchImplicitJoin;
  let matchWhere: string;
  const implicitJoinRegex = 
  /\bSELECT\b\s+((?:(?!SELECT|UPDATE|DELETE|INSERT)[\s\S])*?)\bFROM\b\s+((\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*)(\s+(WHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*))?)(\s*;)?\s*$/gim;

  // We utilize the hover range provided by currentSqlHover for our hover functionality
  const hoverRange = currentSqlHover.currentImplicitSqlRange;

  if (!hoverRange) {
    return;
  }

  const implicitJoinCursor = editor.document.getText(hoverRange).trim();

  if (!implicitJoinCursor) {
    return;
  }

  while (
    (matchImplicitJoin = implicitJoinRegex.exec(implicitJoinCursor)) !== null
  ) {
    if (matchImplicitJoin[13] === undefined) {
      matchWhere = "";
    } else {
      matchWhere = matchImplicitJoin[13].toString();
    }
    const [
      tableInfo,
      isPrimaryKeyAbsent,
      isValidSql,
      primaryKeyMap,
      tableAliasMap,
    ] = (await checkImplicitPrimKeys(
      loginData,
      matchImplicitJoin,
      matchWhere
    )) as [
      string,
      boolean,
      boolean,
      { [tableName: string]: string[] },
      Map<string, string>
    ];

    if (isValidSql) {
      replacedCode = implicitJoinCursor.replace(
        /\bWHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*)/gim,
        (match) => {
          let newConditions = [];

          for (const tableName in primaryKeyMap) {
            const primaryKeys = primaryKeyMap[tableName];
            const tableAlias =
              Array.from(tableAliasMap.entries()).find(
                ([alias, actualTableName]) => actualTableName === tableName
              )?.[0] || tableName;

            for (const primaryKey of primaryKeys) {
              const primaryKeyRegex = new RegExp(
                `\\b${tableAlias}\\b\\s*\\.\\s*\\b${primaryKey}\\b`,
                "gim"
              );
              if (!primaryKeyRegex.test(match)) {
                newConditions.push(`${tableAlias}.${primaryKey} = value`);
              }
            }
          }

          const currentConditions = match
            .replace(/^\s*WHERE\s+/gim, "")
            .split(/\s+(?:AND|OR)\s+/);
          const newConditionsSet = new Set(newConditions);

          if (
            newConditions.length > 0 &&
            !currentConditions.every((cond) => newConditionsSet.has(cond))
          ) {
            return `${match} AND ${newConditions.join(" AND ")}`;
          } else {
            return match;
          }
        }
      );
    }

    editor.edit((editBuilder) => {
      editBuilder.replace(hoverRange as vscode.Range, replacedCode);
      currentSqlHover.currentImplicitSql = undefined;
      currentSqlHover.currentImplicitSqlRange = undefined;
    });
  }
}

export async function sqlImplicitJoinCursorReplacement(
  currentSqlHover: hover.sqlImplicitJoinHover
) {
  let replacedCode: string;
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const loginData = await getLoginDataMySql();
  if (!loginData) return;

  let matchImplicitJoin;
  let matchWhere: string;
  const implicitJoinRegex =
    ///\bSELECT\b[ \t]+((?:(?!SELECT|UPDATE|DELETE|INSERT)[\s\S])*?)\bFROM\b[ \t]+((\w+(\.\w+)?)([ \t]+(AS[ \t]+)?\w+)?([ \t]*,[ \t]*(\w+(\.\w+)?)([ \t]+(AS[ \t]+)?\w+)?)*)([ \t]+(WHERE[ \t]+((\w+(\.\w+)?[ \t]*=[ \t]*\w+(\.\w+)?)([ \t]+(AND|OR)[ \t]+(\w+(\.\w+)?[ \t]*=[ \t]*\w+(\.\w+)?))*))?)([ \t]*;)?[ \t]*$/gim;
    /\bSELECT\b\s+((?:(?!SELECT|UPDATE|DELETE|INSERT)[\s\S])*?)\bFROM\b\s+((\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*)(\s+(WHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*))?)(\s*;)?\s*$/gim;
  const position = editor.selection.active;
  
  let implicitJoinCursorAndRange = cursor.isCursorOnImpJoin(position);

  if (!implicitJoinCursorAndRange) {
    return;
  }

  let [implicitJoinCursor, implicitJoinRange] = implicitJoinCursorAndRange;

  implicitJoinCursor = implicitJoinCursor.toString().trim();

  if (!implicitJoinCursor) {
    return;
  } else if (implicitJoinCursor) {
    while (
      (matchImplicitJoin = implicitJoinRegex.exec(implicitJoinCursor)) !== null
    ) {
      if (matchImplicitJoin[13] === undefined) {
        matchWhere = "";
      } else {
        matchWhere = matchImplicitJoin[13].toString();
      }
      const [
        tableInfo,
        isPrimaryKeyAbsent,
        isValidSql,
        primaryKeyMap,
        tableAliasMap,
      ] = (await checkImplicitPrimKeys(
        loginData,
        matchImplicitJoin,
        matchWhere
      )) as [
        string,
        boolean,
        boolean,
        { [tableName: string]: string[] },
        Map<string, string>
      ];

      if (isValidSql) {
        replacedCode = implicitJoinCursor.replace(
          /\bWHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*)/gim,
          (match) => {
            let newConditions = [];

            for (const tableName in primaryKeyMap) {
              const primaryKeys = primaryKeyMap[tableName];
              const tableAlias =
                Array.from(tableAliasMap.entries()).find(
                  ([alias, actualTableName]) => actualTableName === tableName
                )?.[0] || tableName;

              for (const primaryKey of primaryKeys) {
                const primaryKeyRegex = new RegExp(
                  `\\b${tableAlias}\\b\\s*\\.\\s*\\b${primaryKey}\\b`,
                  "gim"
                );
                if (!primaryKeyRegex.test(match)) {
                  newConditions.push(`${tableAlias}.${primaryKey} = value`);
                }
              }
            }

            const currentConditions = match
              .replace(/^\s*WHERE\s+/gim, "")
              .split(/\s+(?:AND|OR)\s+/);
            const newConditionsSet = new Set(newConditions);

            if (
              newConditions.length > 0 &&
              !currentConditions.every((cond) => newConditionsSet.has(cond))
            ) {
              return `${match} AND ${newConditions.join(" AND ")}`;
            } else {
              return match;
            }
          }
        );
      }

      const document = editor.document;
      const text = document.getText();

      // Retrieve the range from the hover provider
      //let implicitJoinRange = currentSqlHover.currentImplicitSqlRange;
      if (!implicitJoinRange) {
        console.log("No current SQL range available");
        return;
      }

      
      if ((implicitJoinRange as vscode.Range).contains(position)) {
        editor.edit((editBuilder) => {
          editBuilder.replace(implicitJoinRange as vscode.Range, replacedCode);
          currentSqlHover.currentImplicitSql = undefined;
          currentSqlHover.currentImplicitSqlRange = undefined;
        });
      }
    }
  }
}

export async function sqlExplicitJoinHoverReplacement(
  currentSqlHover: hover.sqlExplicitJoinHover
) {
  let replacedCode: string;
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const loginData = await getLoginDataMySql();
  if (!loginData) return;

  let matchExplicitJoin;
  let matchJoin: string;

  const explicitJoinRegex = /\bSELECT\b\s*(?:(?!\bFROM\b).)*(?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+)((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))*)+(\s*;)?\s*$/gim;

  // We utilize the hover range provided by currentSqlHover for our hover functionality
  const hoverRange = currentSqlHover.currentExplicitSqlRange;

  if (!hoverRange) {
    return;
  }

  const explicitJoinText = editor.document.getText(hoverRange).trim();

  if (!explicitJoinText) {
    return;
  }

  while (
    (matchExplicitJoin = explicitJoinRegex.exec(explicitJoinText)) !== null
  ) {
    if (matchExplicitJoin[10] === undefined) {
      matchJoin = "";
    } else {
      matchJoin = matchExplicitJoin[10].toString();
    }

    const [
      tableInfo,
      isPrimaryKeyAbsent,
      isValidSql,
      primaryKeyMap,
      tableAliasMap,
    ] = (await checkExplicitPrimKeys(
      loginData,
      matchExplicitJoin,
      matchJoin
    )) as [
      string,
      boolean,
      boolean,
      { [tableName: string]: string[] },
      Map<string, string>
    ];

    if (isValidSql) {
      replacedCode = explicitJoinText.replace(
        /\bSELECT\b\s*(?:(?!\bFROM\b).)*(?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+)((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))*)+(\s*;)?\s*$/gim,
        (match) => {
          let newConditions = [];
          for (const tableName in primaryKeyMap) {
            const primaryKeys = primaryKeyMap[tableName];
            const tableAlias =
              Array.from(tableAliasMap.entries()).find(
                ([alias, actualTableName]) => actualTableName === tableName
              )?.[0] || tableName;

            for (const primaryKey of primaryKeys) {
              const primaryKeyRegex = new RegExp(
                `\\b${tableAlias}\\b\\s*\\.\\s*\\b${primaryKey}\\b`,
                "gim"
              );
              if (!primaryKeyRegex.test(match)) {
                newConditions.push(`${tableAlias}.${primaryKey} = value`);
              }
            }
          }

          const currentConditions = match
            .replace(
              /^\s*JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+/gi,
              ""
            )
            .split(/\s+(?:AND|OR)\s+/);
          const newConditionsSet = new Set(newConditions);

          if (
            newConditions.length > 0 &&
            !currentConditions.every((cond) => newConditionsSet.has(cond))
          ) {
            return `${match} AND ${newConditions.join(" AND ")}`;
          } else {
            return match;
          }
        }
      );
    }

    editor.edit((editBuilder) => {
      editBuilder.replace(hoverRange, replacedCode);
      currentSqlHover.currentExplicitSql = undefined;
      currentSqlHover.currentExplicitSqlRange = undefined;
    });
  }
}

export async function sqlExplicitJoinCursorReplacement(
  currentSqlHover: hover.sqlExplicitJoinHover
) {
  let replacedCode: string;
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const loginData = await getLoginDataMySql();
  if (!loginData) return;

  let matchExplicitJoin;
  let matchJoin: string;

  const explicitJoinRegex =
    /\bSELECT\b\s*(?:(?!\bFROM\b).)*(?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+)((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))*)+(\s*;)?\s*$/gim;
  const position = editor.selection.active;
  
  let explicitJoinCursorAndRange = cursor.isCursorOnExpJoin(position);

  if (!explicitJoinCursorAndRange) {
    return;
  }
  let [explicitJoinCursor, explicitJoinRange] = explicitJoinCursorAndRange;

  explicitJoinCursor = explicitJoinCursor.toString();
  
  if (!explicitJoinCursor) {
    return;
  } else if (explicitJoinCursor) {
    while (
      (matchExplicitJoin = explicitJoinRegex.exec(explicitJoinCursor)) !== null
    ) {
      
      if (matchExplicitJoin[10] === undefined) {
        matchJoin = "";
      } else {
        matchJoin = matchExplicitJoin[10].toString();
      }

      const [
        tableInfo,
        isPrimaryKeyAbsent,
        isValidSql,
        primaryKeyMap,
        tableAliasMap,
      ] = (await checkExplicitPrimKeys(
        loginData,
        matchExplicitJoin,
        matchJoin
      )) as [
        string,
        boolean,
        boolean,
        { [tableName: string]: string[] },
        Map<string, string>
      ];

      if (isValidSql) {
        replacedCode = explicitJoinCursor.toString().replace(
          /((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))*?)/gim,
          (match) => {
            let newConditions = [];
            for (const tableName in primaryKeyMap) {
              const primaryKeys = primaryKeyMap[tableName];
              const tableAlias =
                Array.from(tableAliasMap.entries()).find(
                  ([alias, actualTableName]) => actualTableName === tableName
                )?.[0] || tableName;

              for (const primaryKey of primaryKeys) {
                const primaryKeyRegex = new RegExp(
                  `\\b${tableAlias}\\b\\s*\\.\\s*\\b${primaryKey}\\b`,
                  "gim"
                );
                if (!primaryKeyRegex.test(match)) {
                  newConditions.push(`${tableAlias}.${primaryKey} = value`);
                }
              }
            }

            const currentConditions = match
              .replace(
                /^\s*JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+/gi,
                ""
              )
              .split(/\s+(?:AND|OR)\s+/);
            const newConditionsSet = new Set(newConditions);

            if (
              newConditions.length > 0 &&
              !currentConditions.every((cond) => newConditionsSet.has(cond))
            ) {
              return `${match} AND ${newConditions.join(" AND ")}`;
            } else {
              return match;
            }
          }
        );
      }

      const document = editor.document;
      const text = document.getText();

      if (!explicitJoinRange) {
        console.log("No current SQL range available");
        return;
      }

      if ((explicitJoinRange as vscode.Range).contains(position)) {
        editor.edit((editBuilder) => {
          editBuilder.replace(explicitJoinRange as vscode.Range, replacedCode);
          currentSqlHover.currentExplicitSql = undefined;
          currentSqlHover.currentExplicitSqlRange = undefined;
        });
      }
    }
  }
}
