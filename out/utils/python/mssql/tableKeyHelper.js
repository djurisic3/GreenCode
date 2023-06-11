"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const sql = require("mssql");
async function findTableKeysInSql(selectQuery) {
    // Parse the select query and extract the table name
    const regex = /FROM\s+([^\s;]+)/i;
    const match = regex.exec(selectQuery);
    if (!match) {
        vscode.window.showErrorMessage('Could not find table name in SELECT query');
        return;
    }
    const tableName = match[1];
    // Set up a SQL connection
    const config = {
        user: "DJ\\dario",
        password: '...',
        server: 'localhost',
        database: 'GreenCode'
    };
    let cnn = await sql.connect(config);
    try {
        // Retrieve primary key information for the table
        const primaryKeysQuery = `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + CONSTRAINT_NAME), 'IsPrimaryKey') = 1
        AND TABLE_NAME = '${tableName}'
    `;
        const result = await sql.query(primaryKeysQuery);
        if (result.recordset.length > 0) {
            // The table has primary key(s)
            const primaryKeys = result.recordset.map(row => row.COLUMN_NAME);
            vscode.window.showInformationMessage(`Primary key(s) for ${tableName}: ${primaryKeys.join(', ')}`);
        }
        else {
            // The table does not have a primary key, check for unique key(s)
            const uniqueKeysQuery = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE
        WHERE CONSTRAINT_NAME IN (
          SELECT CONSTRAINT_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
          WHERE CONSTRAINT_TYPE = 'UNIQUE'
            AND TABLE_NAME = '${tableName}'
        )
      `;
            const result = await sql.query(uniqueKeysQuery);
            if (result.recordset.length > 0) {
                // The table has unique key(s)
                const uniqueKeys = result.recordset.map(row => row.COLUMN_NAME);
                vscode.window.showInformationMessage(`Unique key(s) for ${tableName}: ${uniqueKeys.join(', ')}`);
            }
            else {
                // The table does not have a primary key or unique key
                vscode.window.showInformationMessage(`Table ${tableName} does not have a primary key or unique key`);
            }
        }
    }
    catch (err) {
        vscode.window.showErrorMessage(`Error retrieving keys for ${tableName}: ${err.message}`);
    }
    finally {
        cnn.close();
    }
}
// Example usage:
const selectQuery = 'SELECT * FROM MyTable WHERE Column1 = 123';
findTableKeysInSql(selectQuery);
//# sourceMappingURL=tableKeyHelper.js.map