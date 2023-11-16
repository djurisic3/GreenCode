import * as mysql from "mysql";
import { getPool } from './dbPool';
import * as vscode from "vscode";

export async function findPrimaryKeys(
  uniqueTableNames: string[],
  host: string,
  user: string,
  password: string,
  database: string
): Promise<{ [tableName: string]: string[] }> {
  return new Promise<{ [tableName: string]: string[] }>(async (resolve, reject) => {
    try {
      const pool = getPool(host, user, password, database);

      pool.getConnection((err, connection) => {
        if (err) {
          console.error("Error connecting to MySQL: ", err.stack);
          vscode.window.showErrorMessage(`Error connecting to MySQL: ${err.message}`);
          reject("no connection to server");
        } else {
          console.log("Connected to MySQL as id ", connection.threadId);

          const primaryKeyMap: { [tableName: string]: string[] } = {};

          connection.query(
            `SELECT column_name, table_name
             FROM information_schema.key_column_usage
             WHERE table_name IN (${uniqueTableNames
               .map((name) => `'${name}'`)
               .join(",")})
             AND constraint_name = 'PRIMARY'`,
            (err, res) => {
              connection.release();

              if (err) {
                console.error("Error fetching primary keys: ", err);
                vscode.window.showErrorMessage(`Error fetching primary keys: ${err.message}`);
                reject("no primary keys found for tables");
              } else {
                res.forEach((row: { COLUMN_NAME: any; TABLE_NAME: any }) => {
                  const columnName = row.COLUMN_NAME;
                  const tableName = row.TABLE_NAME;
                  if (primaryKeyMap[tableName]) {
                    primaryKeyMap[tableName].push(columnName);
                  } else {
                    primaryKeyMap[tableName] = [columnName];
                  }
                });

                resolve(primaryKeyMap);
              }
            }
          );
        }
      });
    } catch (err) {
      console.error('An error occurred: ', err);
      vscode.window.showErrorMessage('An unexpected error occurred: ');
      reject('An unexpected error occurred');
    }
  });
}


export async function findIndexCandidates(
  tableColumns: { table: string; columnName: string }[],
  host: string,
  user: string,
  password: string,
  database: string
): Promise<{ [tableName: string]: { [columnName: string]: number } }> {
  return new Promise<{ [tableName: string]: { [columnName: string]: number } }>(async (resolve, reject) => {
    const pool = mysql.createPool({
      host,
      user,
      password,
      database,
      connectionLimit: 200,
    });

    pool.getConnection(async (err, connection) => {
      if (err) {
        console.error("Error connecting to MySQL: ", err.stack);
        reject("no connection to server");
      }

      console.log("Connected to MySQL as id ", connection.threadId);

      const cardinalityMap: { [tableName: string]: { [columnName: string]: number } } = {};

      // Collect unique table names and their respective column names
      const uniqueTableColumns: { [tableName: string]: Set<string> } = {};

      tableColumns.forEach(({ table, columnName }) => {
        if (uniqueTableColumns[table]) {
          uniqueTableColumns[table].add(columnName);
        } else {
          uniqueTableColumns[table] = new Set([columnName]);
        }
      });

      const queries: any[] = [];
      for (const table in uniqueTableColumns) {
        uniqueTableColumns[table].forEach((columnName) => {
          queries.push(
            new Promise((resolve, reject) => {
              connection.query(
                `SELECT '${table}' AS table_name, '${columnName}' AS column_name, COUNT(DISTINCT ${columnName}) AS cardinality
                FROM ${table}`,
                (err, res) => {
                  if (err) {
                    console.error(`Error fetching cardinality for table ${table}, column ${columnName}: `, err);
                    resolve(null);
                  } else {
                    res.forEach((row: { table_name: string; column_name: string; cardinality: number }) => {
                      const tableName = row.table_name;
                      const columnName = row.column_name;
                      const cardinality = row.cardinality;

                      if (cardinalityMap[tableName]) {
                        cardinalityMap[tableName][columnName] = cardinality;
                      } else {
                        cardinalityMap[tableName] = { [columnName]: cardinality };
                      }
                    });
                    resolve(null);
                  }
                }
              );
            })
          );
        });
      }

      try {
        await Promise.all(queries);
        resolve(cardinalityMap);
      } catch (err) {
        console.error("Error fetching column cardinalities: ", err);
        reject("no cardinalities found for columns");
      }
    });
  });
}


export async function checkExistingIndexes(
  tableName: string,
  columnName: string,
  host: string,
  user: string,
  password: string,
  database: string
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const pool = mysql.createPool({
      host,
      user,
      password,
      database,
      connectionLimit: 200,
    });

    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error connecting to MySQL: ", err.stack);
        reject("no connection to server");
      }

      console.log("Connected to MySQL as id ", connection.threadId);

      connection.query(
        `SHOW INDEXES FROM \`${tableName}\` WHERE Column_name = ?;`,
        [columnName],
        (err, rows, fields) => {
          if (err) {
            console.error("Error fetching indexes: ", err);
            reject("error fetching indexes");
          }

          resolve(rows.length > 0);
        }
      );
    });
  });
}