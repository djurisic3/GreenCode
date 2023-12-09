import { findPrimaryKeys, openConnection } from "./tableIndexesHelper";
import * as queryHelper from "../plsql/tableIndexesHelper";

export async function checkImplicitPrimKeys(
  credentials: {
    user: string;
    password: string;
    connectionString: string;
  },
  implicitJoinMatch: RegExpExecArray,
  matchWhere: string
) {
  let isValidSql: boolean;
  let isPrimaryKeyAbsent: boolean = false;

  if (matchWhere === "") {
    isPrimaryKeyAbsent = true;
    isValidSql = true;
  }

  let tableNamesStr = implicitJoinMatch[2] ?? implicitJoinMatch[4];
  const tableNames = tableNamesStr.split(",");
  isValidSql = true;

  for (const tableName of tableNames) {
    const tableNameParts = tableName.trim().split(/[.\s]+/);
    const lastElementTableDef = tableNameParts[tableNameParts.length - 1];
    const tableNameOrAliasRegex = new RegExp(
      `\\b${lastElementTableDef}\\b`,
      "gmi"
    );

    if (!tableNameOrAliasRegex.test(matchWhere)) {
      isValidSql = false;
      break;
    }
  }

  const tableAliasMap = new Map<string, string>();
  const processedTableNames = tableNames.map((tableName) => {
    const tableNameParts = tableName.trim().split(/[.\s]+/);
    const alias =
      tableNameParts.length > 1
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
  const primaryKeyMap = await queryHelper.findPrimaryKeys(processedTableNames);

  // Create a string of table names and their corresponding primary keys
  const tableInfo = processedTableNames
    .map((tableName) => {
      const primaryKeys = primaryKeyMap[tableName.toLocaleUpperCase()] ?? [
        "unknown",
      ];
      return `${tableName}: ${primaryKeys.join(", ")}`;
    })
    .join("   \n");

  for (const tableName in primaryKeyMap) {
    const primaryKeys = primaryKeyMap[tableName] ?? ["unknown"];
    let allPrimaryKeysPresent = true;

    primaryKeys.forEach((primaryKey) => {
      const primaryKeyRegex = new RegExp(`\\b${primaryKey}\\b`, "gmi");
      if (!primaryKeyRegex.test(matchWhere)) {
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

export async function checkExplicitPrimKeys(
  credentials: {
    user: string;
    password: string;
    connectionString: string;
  },
  matchExplicitJoin: RegExpExecArray,
  matchJoinOn: string
) {
  let isValidSql: boolean;
  let isPrimaryKeyAbsent: boolean = false;
  let allTablesOrAliases: Map<string, string> = new Map();
  const joinPattern = /(?:FROM|JOIN)\s+([\w]+)(?:\s+AS)?(?:\s+([a-zA-Z]+))?/gim;

  const matchTablesFromJoinOn = Array.from(
    matchExplicitJoin[0].matchAll(joinPattern)
  );
  const tableNames = matchTablesFromJoinOn.map((match) => {
    if (/inner|join|full|left|right|on/i.test(match[2])) {
      return match[1].trim();
    } else {
      return (match[2] ? match[1] + " " + match[2] : match[1]).trim();
    }
  });

  isValidSql = true;

  for (const tableName of tableNames) {
    const tableNameParts = tableName.trim().split(/[.\s]+/);
    const lastElementTableDef = tableNameParts[tableNameParts.length - 1];
    const tableNameOrAliasRegex = new RegExp(
      `\\b${lastElementTableDef}.\\b`,
      "gmi"
    );
    if (!tableNameOrAliasRegex.test(matchJoinOn)) {
      isValidSql = false;
    }
    allTablesOrAliases.set(tableNameParts[0], lastElementTableDef);
  }

  const tableAliasMap = new Map<string, string>();
  const processedTableNames = tableNames.map((tableName) => {
    const tableNameParts = tableName.trim().split(/[.\s]+/);
    const alias =
      tableNameParts.length > 1
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

  await openConnection(
    credentials.user,
    credentials.password,
    credentials.connectionString
  );
  const primaryKeyMap = await findPrimaryKeys(processedTableNames);

  // Create a string of table names and their corresponding primary keys
  const tableInfo = processedTableNames
    .map((tableName) => {
      const primaryKeys = primaryKeyMap[tableName.toLocaleUpperCase()] ?? [
        "unknown",
      ];
      return `${tableName}: ${primaryKeys.join(", ")}`;
    })
    .join("   \n");

  for (const tableName in primaryKeyMap) {
    const primaryKeys = primaryKeyMap[tableName] ?? ["unknown"];

    let allPrimaryKeysPresent = true;

    primaryKeys.forEach((primaryKey) => {
      const table = allTablesOrAliases.get(tableName.toLocaleLowerCase());
      const primaryKeyRegex = new RegExp(
        `\\b${table}\\.${primaryKey}\\b`,
        "gmi"
      );
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
