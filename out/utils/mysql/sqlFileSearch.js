"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showRecommendations = exports.searchFiles = void 0;
const path = require("path");
const util_1 = require("util");
const vscode = require("vscode");
const queryHelper = require("./tableIndexesHelper");
const loginManager_1 = require("./loginManager");
let credentials;
let loginData;
const outputChannel = vscode.window.createOutputChannel("WebView Console");
//izbaci tablesList ovdje ako hoces report o svim tablicama napravit
async function findSqlQueries(uri) {
    try {
        let tableAndAlias = new Map();
        const tablesAndColumns = new Map();
        const fileContentBytes = await vscode.workspace.fs.readFile(uri);
        const fileContent = new util_1.TextDecoder().decode(fileContentBytes);
        const sqlPattern = /(?:SELECT|INSERT|UPDATE|DELETE)(?:[\s\S]+?)(?=(?:SELECT|INSERT|UPDATE|DELETE|$))/gi;
        const matches = fileContent.match(sqlPattern);
        const readWriteCount = new Map();
        const columnOccurrences = new Map();
        if (matches) {
            console.log(`\nFound ${matches.length} query(ies) in ${uri.fsPath}:`);
            matches.forEach((query, index) => {
                tableAndAlias = new Map();
                console.log(`\nQuery ${index + 1}:`);
                console.log(query);
                const operationType = query.trim().split(/\s+/)[0].toUpperCase();
                console.log(operationType);
                const tablePattern = /(?:FROM|INTO|UPDATE|,|JOIN)\s+((?:\w+\.)*\w+)(?:\s+(?:AS\s+)?(?!INNER\b|ON\b|WHERE\b|--|SELECT\b|SET)([^\s.,]+))?/gi;
                const joinWhereOrderByPattern = /(?:ON|WHERE|ORDER BY)(?:\s+)([^;]*?)(?=(?:\s+ON|\s+WHERE|\s+ORDER BY|;|$))/gi;
                const columnNamePattern = /(?:\w+\s+)?(?:(\w+)\.)?(\w+)\s*=\s*(?:(\w+)\.)?(\w+)|(?:\b(?:AND|OR|,)\b\s*(?:(\w+)\.)?(\w+))/gi;
                let tableMatches;
                // const tablesAndColumns = new Map<string, Set<string>>();
                while ((tableMatches = tablePattern.exec(query)) !== null) {
                    const table = tableMatches[1].includes(".")
                        ? tableMatches[1].split(".")[1]
                        : tableMatches[1];
                    const alias = tableMatches[2] || table;
                    tableAndAlias.set(alias, table);
                    tablesAndColumns.set(alias, new Set());
                    if (!readWriteCount.has(table)) {
                        readWriteCount.set(table, {
                            read: 0,
                            write: 0,
                            columns: new Set(),
                        });
                    }
                }
                for (const [, table] of tableAndAlias) {
                    console.log(`Processing operation: ${operationType}, table: ${table}`);
                    if (operationType === "SELECT") {
                        readWriteCount.get(table).read++;
                    }
                    else if (["INSERT", "UPDATE", "DELETE"].includes(operationType)) {
                        readWriteCount.get(table).write++;
                    }
                }
                let joinWhereOrderByMatches;
                while ((joinWhereOrderByMatches = joinWhereOrderByPattern.exec(query)) !==
                    null) {
                    let columnMatches;
                    while ((columnMatches = columnNamePattern.exec(joinWhereOrderByMatches[1])) !== null) {
                        const alias1 = columnMatches[1];
                        const column1 = columnMatches[2];
                        const alias2 = columnMatches[3];
                        const column2 = columnMatches[4];
                        if (tablesAndColumns.has(alias1)) {
                            tablesAndColumns.get(alias1).add(column1);
                            const table = tableAndAlias.get(alias1);
                            const tableColumnOccurrences = columnOccurrences.get(table) || new Map();
                            tableColumnOccurrences.set(column1, (tableColumnOccurrences.get(column1) || 0) + 1);
                            columnOccurrences.set(table, tableColumnOccurrences);
                        }
                        if (tablesAndColumns.has(alias2)) {
                            tablesAndColumns.get(alias2).add(column2);
                            const table = tableAndAlias.get(alias2);
                            const tableColumnOccurrences = columnOccurrences.get(table) || new Map();
                            tableColumnOccurrences.set(column2, (tableColumnOccurrences.get(column2) || 0) + 1);
                            columnOccurrences.set(table, tableColumnOccurrences);
                        }
                    }
                }
                tablesAndColumns.forEach((columns, alias) => {
                    const table = tableAndAlias.get(alias);
                    if (table === alias) {
                        alias = "--";
                    }
                    console.log(`Table: ${table}, Columns: ${Array.from(columns).join(", ")}`);
                });
            });
            return [
                tableAndAlias,
                tablesAndColumns,
                readWriteCount,
                columnOccurrences,
            ];
        }
    }
    catch (err) {
        console.error(`Error reading file ${uri.fsPath}:`, err);
        return undefined;
    }
}
async function searchFiles(folderUri, recursive, connectDB) {
    if (!connectDB) {
    }
    else {
        credentials = await (0, loginManager_1.getLoginDataMySql)();
        if (!credentials) {
            return {
                tableAndAlias: new Map(),
                tablesAndColumns: new Map(),
                readWriteCount: new Map(),
                columnOccurrences: new Map(),
            };
        }
    }
    const aggregatedResults = {
        tableAndAlias: new Map(),
        tablesAndColumns: new Map(),
        readWriteCount: new Map(),
        columnOccurrences: new Map(),
    };
    async function traverseFiles(folderUri, recursive) {
        const files = await vscode.workspace.fs.readDirectory(folderUri);
        const extensions = [".sql"];
        for (const [file, fileType] of files) {
            const fileUri = folderUri.with({
                path: path.posix.join(folderUri.path, file),
            });
            if (fileType === vscode.FileType.Directory) {
                if (recursive) {
                    await traverseFiles(fileUri, recursive);
                }
            }
            else if (fileType === vscode.FileType.File &&
                extensions.includes(path.extname(file))) {
                const result = await findSqlQueries(fileUri);
                if (result) {
                    const [tableAndAlias, tablesAndColumns, readWriteCount, columnOccurrences,] = result;
                    aggregateResults(aggregatedResults, tableAndAlias, tablesAndColumns, readWriteCount, columnOccurrences);
                }
            }
        }
    }
    await traverseFiles(folderUri, recursive);
    return aggregatedResults;
}
exports.searchFiles = searchFiles;
function aggregateResults(aggResults, tableAndAlias, tablesAndColumns, readWriteCount, columnOccurrences) {
    // Aggregate tableAndAlias
    tableAndAlias.forEach((table, alias) => {
        if (!aggResults.tableAndAlias.has(alias)) {
            aggResults.tableAndAlias.set(alias, table);
        }
    });
    // Aggregate tablesAndColumns
    tablesAndColumns.forEach((columns, alias) => {
        if (!aggResults.tablesAndColumns.has(alias)) {
            aggResults.tablesAndColumns.set(alias, new Set(columns));
        }
        else {
            const aggColumns = aggResults.tablesAndColumns.get(alias);
            columns.forEach((column) => {
                aggColumns.add(column);
            });
        }
    });
    // Aggregate readWriteCount
    readWriteCount.forEach(({ read, write, columns }, table) => {
        if (!aggResults.readWriteCount.has(table)) {
            aggResults.readWriteCount.set(table, {
                read: read,
                write: write,
                columns: new Set(columns),
            });
        }
        else {
            const aggReadWrite = aggResults.readWriteCount.get(table);
            aggReadWrite.read += read;
            aggReadWrite.write += write;
            columns.forEach((column) => {
                aggReadWrite.columns.add(column);
            });
        }
    });
    // Aggregate columnOccurrences
    columnOccurrences.forEach((tableColumnOccurrences, table) => {
        const aggTableColumnOccurrences = aggResults.columnOccurrences.get(table) || new Map();
        tableColumnOccurrences.forEach((occurrences, columnName) => {
            const existingOccurrences = aggTableColumnOccurrences.get(columnName);
            aggTableColumnOccurrences.set(columnName, (existingOccurrences || 0) + occurrences);
        });
        aggResults.columnOccurrences.set(table, aggTableColumnOccurrences);
    });
}
async function getWebviewContent(scriptUri, cspSource, tableAndAlias, tablesAndColumns, readWriteCount, columnOccurrences, cardinalityMap) {
    // Generate the content using the tableAndAlias and tablesAndColumns maps
    let content = "";
    let contentReadWrites = "";
    let contentColumnOccurrences = "";
    let totalCardinalities = 0;
    // Convert columnOccurrences to the required format for findIndexCandidates
    const columnOccurrencesArray = [];
    columnOccurrences.forEach((tableColumnOccurrences, table) => {
        tableColumnOccurrences.forEach((occurrences, columnName) => {
            columnOccurrencesArray.push({ table, columnName });
        });
    });
    tablesAndColumns.forEach((columns, alias) => {
        const table = tableAndAlias.get(alias);
        const aliasText = table === alias ? "--" : alias;
        content += `<p>Table: ${table}, Alias: ${aliasText}, Columns: ${Array.from(columns).join(", ")}</p>`;
    });
    const sortedReadWriteCount = [...readWriteCount.entries()].sort((a, b) => {
        const [, { read: readA, write: writeA }] = a;
        const [, { read: readB, write: writeB }] = b;
        return writeB + readB - (writeA + readA);
    });
    sortedReadWriteCount.forEach(([table, { read, write }]) => {
        contentReadWrites += `<tr>
      <td>${table}</td>
      <td>${read}</td>
      <td>${write}</td>
      <td>${write !== 0 ? read / write : 0}</td>
    </tr>`;
    });
    const flattenedColumnOccurrences = [];
    if (typeof columnOccurrences !== "undefined") {
        columnOccurrences.forEach((tableColumnOccurrences, table) => {
            tableColumnOccurrences.forEach((occurrences, columnName) => {
                flattenedColumnOccurrences.push({ table, columnName, occurrences });
            });
        });
    }
    const sortedFlattenedColumnOccurrences = flattenedColumnOccurrences.sort((a, b) => b.occurrences - a.occurrences);
    // Calculate the total occurrences and cardinalities
    const totalOccurrences = sortedFlattenedColumnOccurrences.reduce((accumulator, { occurrences }) => accumulator + occurrences, 0);
    if (credentials) {
        totalCardinalities = sortedFlattenedColumnOccurrences.reduce((accumulator, { table, columnName }) => {
            const cardinality = cardinalityMap[table] && cardinalityMap[table][columnName]
                ? cardinalityMap[table][columnName] ?? 0
                : 0;
            return accumulator + cardinality;
        }, 0);
        sortedFlattenedColumnOccurrences.forEach(({ table, columnName, occurrences }) => {
            const cardinality = cardinalityMap[table] && cardinalityMap[table][columnName]
                ? cardinalityMap[table][columnName]
                : 0;
            console.log("table: " + table);
            console.log("column: " + columnName);
            console.log("cardinality: " + cardinality);
            contentColumnOccurrences += `<tr>
    <td>${table}</td>
    <td>${columnName}</td>
    <td>${occurrences}</td>
    <td>${cardinality}</td>
    <td>${Math.round(((cardinality / totalCardinalities) * 0.6 +
                (occurrences / totalOccurrences) * 0.4) *
                100)}%</td>
  </tr>`;
        });
    }
    else {
        contentColumnOccurrences = "";
        totalCardinalities = 0;
    }
    return {
        html: `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https:; script-src ${cspSource}; style-src ${cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SQL Performance Recommendations</title>
    <style>
      #suggestIndexesBtn {
        background-color: black;
        color: white;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        padding: 2rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 2rem;
      }
      th, td {
        border: 1px solid #ccc;
        padding: 12px 16px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      h1 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
      }
      caption {
        caption-side: top;
        font-size: 1.25rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
        text-align: left;
      }
    </style>
  </head>
  <body>
    <h1>SQL Performance Advisor</h1>
    <table>
      <h2>Read and Write Analysis</h2>
      <thead>
        <tr>
          <th>Table</th>
          <th>Read</th>
          <th>Write</th>
          <th>RW Ratio</th>
        </tr>
      </thead>
      <tbody>
        ${contentReadWrites}
      </tbody>
    </table>

    <table>
      <h2>Index analysis</h2>
      <thead>
        <tr>
          <th>Table</th>
          <th>Column</th>
          <th>Occurrences</th>
          <th>Cardinality</th>
          <th>Aptness for indexing</th>
        </tr>
      </thead>
      <tbody>
        ${contentColumnOccurrences}
      </tbody>
    </table>
    <button id="suggestIndexesBtn">Suggest Indexes</button>
    <script src=${scriptUri} nonce="nonce"></script>
  </body>
  </html>`,
        sortedFlattenedColumnOccurrences,
        totalOccurrences,
        totalCardinalities,
    };
}
let cardinalityMap;
async function createIndexScript(columnOccurrences) {
    let script = "/* SQL Index Creation Script */\n\n";
    for (const { table, columnName, aptness } of columnOccurrences) {
        if (aptness > 0.5) {
            const indexExists = await queryHelper.checkExistingIndexes(table, columnName, credentials.host, credentials.user, credentials.password, credentials.database);
            if (!indexExists) {
                script += `CREATE INDEX idx_${table}_${columnName} ON \`${table}\`(\`${columnName}\`);\n`;
            }
            else {
                script += `-- Index already exists for ${table}.${columnName}\n`;
            }
        }
    }
    return script;
}
async function showRecommendations(tableAndAlias, tablesAndColumns, readWriteCount, columnOccurrences, context) {
    const panel = vscode.window.createWebviewPanel("sqlRecommendations", "SQL Energy Savings Recommendations", vscode.ViewColumn.One, { enableScripts: true });
    if (credentials) {
        if (!cardinalityMap) {
            const columnOccurrencesArray = [];
            columnOccurrences.forEach((tableColumnOccurrences, table) => {
                tableColumnOccurrences.forEach((occurrences, columnName) => {
                    columnOccurrencesArray.push({ table, columnName });
                });
            });
            cardinalityMap = await queryHelper.findIndexCandidates(columnOccurrencesArray, credentials.host, credentials.user, credentials.password, credentials.database);
        }
    }
    if (!context.extensionPath) {
        vscode.window.showErrorMessage("Extension path not found.");
        return;
    }
    const scriptPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, "src", "utils", "mysql", "scriptUri.js"));
    const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);
    const cspSource = panel.webview.cspSource;
    const { html, sortedFlattenedColumnOccurrences, totalOccurrences, totalCardinalities, } = await getWebviewContent(scriptUri.toString(), cspSource, tableAndAlias, tablesAndColumns, readWriteCount, columnOccurrences, cardinalityMap);
    panel.webview.html = html;
    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case "log":
                outputChannel.appendLine(message.message);
                break;
            case "suggestIndexes":
                const columnsToIndex = sortedFlattenedColumnOccurrences
                    .filter(({ table, columnName, occurrences }) => {
                    const cardinality = cardinalityMap[table] && cardinalityMap[table][columnName]
                        ? cardinalityMap[table][columnName] ?? 0
                        : 0;
                    const aptness = (cardinality / totalCardinalities) * 0.6 +
                        (occurrences / totalOccurrences) * 0.4;
                    console.log("aptness: " + aptness);
                    return aptness > 0.5;
                })
                    .map(({ table, columnName, occurrences }) => {
                    const cardinality = cardinalityMap[table] && cardinalityMap[table][columnName]
                        ? cardinalityMap[table][columnName]
                        : 0;
                    const aptness = (cardinality / totalCardinalities) * 0.6 +
                        (occurrences / totalOccurrences) * 0.4;
                    console.log("aptness: " +
                        aptness +
                        " table: " +
                        table +
                        " columnName: " +
                        columnName);
                    return { table, columnName, aptness };
                });
                const indexScript = await createIndexScript(columnsToIndex);
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    throw new Error("No workspace folder found");
                }
                const scriptPath = path.join(workspaceFolder.uri.fsPath, "index_script.sql");
                const scriptUri = vscode.Uri.file(scriptPath);
                await vscode.workspace.fs.writeFile(scriptUri, Buffer.from(indexScript));
                const scriptDocument = await vscode.workspace.openTextDocument(scriptUri);
                const scriptEditor = await vscode.window.showTextDocument(scriptDocument);
                const scriptRange = new vscode.Range(scriptDocument.positionAt(0), scriptDocument.positionAt(scriptDocument.getText().length));
                await scriptEditor.edit((editBuilder) => {
                    editBuilder.replace(scriptRange, indexScript);
                });
                break;
        }
    });
}
exports.showRecommendations = showRecommendations;
//# sourceMappingURL=sqlFileSearch.js.map