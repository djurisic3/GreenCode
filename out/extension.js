"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const conversions = require("./utils/python/conversions");
const pythonFinder = require("./utils/python/dirtFinder");
const sqlFinder = require("./utils/helper/dirtFinder");
const hover = require("./utils/python/hoverProvider");
const pyCode = require("./utils/python/codeReplacement");
const mysqlCode = require("./utils/mysql/codeReplacement");
const plsqlCode = require("./utils/plsql/codeReplacement");
const loginManager_1 = require("./utils/plsql/loginManager");
const loginManager_2 = require("./utils/mysql/loginManager");
const hoverProvider_1 = require("./utils/mysql/hoverProvider");
const hoverProvider_2 = require("./utils/plsql/hoverProvider");
const sqlFileSearch = require("./utils/mysql/sqlFileSearch");
const criticalDirt = require("./utils/helper/dirtFinderCritical");
const counter = require("./utils/helper/counter");
const codeLocationStorage_1 = require("./utils/plsql/codeLocationStorage");
const openai_1 = require("openai");
let decorationTypeForLoop;
let decorationTypeCsv;
let decorationTypeSql;
let decorationTypeSqlCritical;
let decorationTypeMiscellaneous;
let activeEditor;
let statusBarMessageMedium;
let statusBarMessageHigh;
let isUpdateDecorationsSqlRun = false;
function updateStatusBarMessages() {
    const highCount = counter.getCounterCritical();
    const mediumCount = counter.getCounter();
    if (highCount >= 0) {
        statusBarMessageHigh.text = `High Severity: ${highCount} spots need eco-efficient optimization.`;
        statusBarMessageHigh.command = "greencode.navigateToNextHighSeverity";
        statusBarMessageHigh.show();
    }
    if (mediumCount >= 0) {
        statusBarMessageMedium.text = `Medium Severity: ${mediumCount} spots need eco-efficient optimization.`;
        statusBarMessageMedium.command = "greencode.navigateToNextMediumSeverity";
        statusBarMessageMedium.show();
    }
}
function navigateToNextHighSeverity() {
    navigateToNextSeverity("high");
}
function navigateToNextMediumSeverity() {
    navigateToNextSeverity("medium");
}
function navigateToNextSeverity(severity) {
    let locations = (0, codeLocationStorage_1.getLocations)(severity);
    if (locations.length === 0) {
        if (severity === "medium") {
            statusBarMessageMedium.text = `Medium Severity: 0 spots need eco-efficient optimization.`;
            statusBarMessageMedium.show();
        }
        else if (severity === "high") {
            statusBarMessageMedium.text = `High Severity: 0 spots need eco-efficient optimization.`;
            statusBarMessageMedium.show();
        }
        vscode.window.showInformationMessage(`No more ${severity} severity spots to navigate to.`);
        return;
    }
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        // Always navigate to the first location in the list
        const nextLocation = locations[0];
        editor.selection = new vscode.Selection(nextLocation.start, nextLocation.end);
        editor.revealRange(nextLocation, vscode.TextEditorRevealType.InCenter);
        // Remove the navigated location from the list
        (0, codeLocationStorage_1.removeLocation)(nextLocation, severity);
        (0, codeLocationStorage_1.addLocation)(nextLocation, severity);
        updateStatusBarMessages();
    }
}
function initialSqlDecorationSetup() {
    updateDecorationsSql();
}
function updateDecorationsForLoop() {
    activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    let decorations = pythonFinder.markForLoopsPy(activeEditor.document);
    activeEditor.setDecorations(decorationTypeForLoop, decorations);
}
function updateDecorationsCsv() {
    activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    let decorations = pythonFinder.markCsvPy(activeEditor.document);
    activeEditor.setDecorations(decorationTypeCsv, decorations);
}
function updateDecorationsMiscellaneous() {
    activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    let decorations = pythonFinder.markMiscellaneousPy(activeEditor.document);
    activeEditor.setDecorations(decorationTypeMiscellaneous, decorations);
}
async function updateDecorationsSql() {
    activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    const selectStarDecoration = criticalDirt.findSelectAsteriskStatements(activeEditor.document);
    activeEditor.setDecorations(decorationTypeSqlCritical, selectStarDecoration);
    let isLogged = false;
    let decorations = await sqlFinder.markSelectSQL(activeEditor.document, isLogged, loginData);
    if (!isUpdateDecorationsSqlRun) {
        updateStatusBarMessages();
    }
    if (selectStarDecoration || decorations) {
        isUpdateDecorationsSqlRun = true;
    }
    activeEditor.setDecorations(decorationTypeSql, decorations);
}
function deactivateDecorationsForLoop() {
    activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    activeEditor.setDecorations(decorationTypeForLoop, []);
}
function deactivateDecorationsCsv() {
    activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    activeEditor.setDecorations(decorationTypeCsv, []);
}
function deactivateDecorationsMiscellaneous() {
    activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    activeEditor.setDecorations(decorationTypeMiscellaneous, []);
}
function deactivateDecorationsSql() {
    activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    counter.resetCounter();
    isUpdateDecorationsSqlRun = false;
    activeEditor.setDecorations(decorationTypeSql, []);
}
function deactivateDecorationsSqlCritical() {
    activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    counter.resetCounterCritical();
    isUpdateDecorationsSqlRun = false;
    activeEditor.setDecorations(decorationTypeSqlCritical, []);
    activeEditor.setDecorations(decorationTypeSql, []);
}
let serverType;
let loginData;
async function activate(context) {
    let forHoverProvider = new hover.ForLoopHover();
    let csvHoverProvider = new hover.CsvHover();
    let miscHoverProvider = new hover.MiscHover();
    let sqlImplicitHoverProvider = new hoverProvider_1.sqlImplicitJoinHover();
    let sqlExplicitHoverProvider = new hoverProvider_1.sqlExplicitJoinHover();
    let plsqlExplicitHoverProvider = new hoverProvider_2.sqlExplicitJoinHover();
    let plsqlImplicitHoverProvider = new hoverProvider_2.sqlImplicitJoinHover();
    let disposableAI = vscode.commands.registerCommand("greencode.activateAI", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("No editor is active");
            return;
        }
        const text = editor.document.getText(editor.selection);
        if (!text) {
            vscode.window.showInformationMessage("No text is selected");
            return;
        }
        const queries = splitSqlQueries(text);
        // Limit the processing to the first 3 queries
        const maxQueriesToProcess = 3;
        for (let i = 0; i < Math.min(queries.length, maxQueriesToProcess); i++) {
            const query = queries[i];
            const optimizationSuggestions = await getOptimizationSuggestions(query);
            vscode.window.showInformationMessage(optimizationSuggestions);
        }
    });
    function splitSqlQueries(text) {
        // Basic splitting logic, can be enhanced for more complex SQL scripts
        return text
            .split(";")
            .map((query) => query.trim())
            .filter((query) => query.length > 0);
    }
    async function getOptimizationSuggestions(sqlQuery) {
        // Initialize OpenAI API
        const openAIConfiguration = new openai_1.Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        const openai = new openai_1.OpenAIApi(openAIConfiguration);
        try {
            const prompt = `Given the SQL query: \n\n${sqlQuery}\n\nProvide optimization suggestions as code, focusing on green coding practices, without repeating the original query:`;
            const response = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: prompt,
                max_tokens: 150,
            });
            return (response.data.choices[0]?.text.trim() || "No suggestions available.");
        }
        catch (error) {
            console.error("Error while fetching suggestions from OpenAI:", error);
            return "An error occurred while fetching suggestions.";
        }
    }
    context.subscriptions.push(disposableAI);
    statusBarMessageHigh = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarMessageMedium = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(vscode.commands.registerCommand("greencode.navigateToNextHighSeverity", navigateToNextHighSeverity));
    context.subscriptions.push(vscode.commands.registerCommand("greencode.navigateToNextMediumSeverity", navigateToNextMediumSeverity));
    context.subscriptions.push(statusBarMessageHigh, statusBarMessageMedium);
    const disposableFindAllQueries = vscode.commands.registerCommand("greencode.findSqlQueries", async () => {
        const options = {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "Select Folder",
        };
        const folderUris = await vscode.window.showOpenDialog(options);
        if (folderUris && folderUris.length > 0) {
            const folderUri = folderUris[0];
            const searchRecursively = await vscode.window.showQuickPick(["Yes", "No"], {
                placeHolder: "Search for SQL queries recursively in all subfolders?",
            });
            const connectDB = await vscode.window.showQuickPick(["Yes", "No"], {
                placeHolder: "Connect to database (for detailed analysis)?",
            });
            if (searchRecursively && connectDB) {
                const results = await sqlFileSearch.searchFiles(folderUri, searchRecursively === "Yes", connectDB === "Yes");
                if (results) {
                    sqlFileSearch.showRecommendations(results.tableAndAlias, results.tablesAndColumns, results.readWriteCount, results.columnOccurrences, context);
                }
            }
        }
    });
    activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.languageId.includes("sql")) {
        serverType = await vscode.window.showQuickPick(["Oracle (PL/SQL)", "MySQL"], {
            placeHolder: "Choose the server type:",
        });
        if (!serverType) {
            await vscode.window
                .showErrorMessage("Missing server type. Extension activation aborted. Please reload to retry.", "Reload Window")
                .then((selection) => {
                if (selection === "Reload Window") {
                    vscode.commands.executeCommand("workbench.action.reloadWindow");
                }
            });
            return;
        }
        if (serverType === "Oracle (PL/SQL)") {
            context.subscriptions.push(vscode.languages.registerHoverProvider("sql", plsqlExplicitHoverProvider));
            context.subscriptions.push(vscode.languages.registerHoverProvider("sql", plsqlImplicitHoverProvider));
            loginData = await (0, loginManager_1.getLoginDataPlSql)();
            if (!loginData || loginData === undefined) {
                await vscode.window
                    .showErrorMessage("Missing login data. Extension activation aborted. Please reload to retry.", "Reload Window")
                    .then((selection) => {
                    if (selection === "Reload Window") {
                        vscode.commands.executeCommand("workbench.action.reloadWindow");
                    }
                });
                context.subscriptions.push(vscode.languages.registerHoverProvider("sql", plsqlExplicitHoverProvider));
                return;
            }
        }
        else if (serverType === "MySQL") {
            context.subscriptions.push(vscode.languages.registerHoverProvider("sql", sqlImplicitHoverProvider));
            context.subscriptions.push(vscode.languages.registerHoverProvider("sql", sqlExplicitHoverProvider));
            loginData = await (0, loginManager_2.getLoginDataMySql)();
            if (!loginData || loginData === undefined) {
                await vscode.window
                    .showErrorMessage("Missing login data. Extension activation aborted. Please reload to retry.", "Reload Window")
                    .then((selection) => {
                    if (selection === "Reload Window") {
                        vscode.commands.executeCommand("workbench.action.reloadWindow");
                    }
                });
                return;
            }
        }
    }
    context.subscriptions.push(disposableFindAllQueries);
    context.subscriptions.push(vscode.languages.registerHoverProvider("python", forHoverProvider));
    context.subscriptions.push(vscode.languages.registerHoverProvider("python", csvHoverProvider));
    context.subscriptions.push(vscode.languages.registerHoverProvider("python", miscHoverProvider));
    let disposableCleanCompleteCode = vscode.commands.registerCommand("greencode.cleanCompleteCode", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const document = editor.document;
        let text = document.getText();
        let listComprehension;
        listComprehension = conversions.convertAllPy(text);
        editor.edit((editBuilder) => {
            let fullRange = editor.document.validateRange(new vscode.Range(0, 0, document.lineCount, document.lineAt(document.lineCount - 1).text.length));
            editBuilder.replace(fullRange, listComprehension);
        });
    });
    let disposableCleanMarkedCode = vscode.commands.registerCommand("greencode.cleanMarkedCode", () => {
        if (!serverType && activeEditor?.document.languageId.includes("sql")) {
            vscode.window.showErrorMessage("Server type is not defined yet. Please wait a moment and try again.");
            return;
        }
        console.log("Server type: " + serverType);
        plsqlImplicitHoverProvider.currentImplicitSql = undefined;
        plsqlExplicitHoverProvider.currentExplicitSql = undefined;
        if (forHoverProvider.currentForLoop !== undefined) {
            pyCode.forHoverReplacement(forHoverProvider);
        }
        else if (csvHoverProvider.currentCsv !== undefined) {
            pyCode.csvHoverReplacement(csvHoverProvider);
        }
        else if (miscHoverProvider.currentMisc !== undefined) {
            pyCode.miscellaneousReplacement(miscHoverProvider);
        }
        else if (sqlImplicitHoverProvider.currentImplicitSql !== undefined &&
            serverType === "MySQL") {
            mysqlCode.sqlImplicitJoinHoverReplacement(sqlImplicitHoverProvider);
        }
        else if (sqlExplicitHoverProvider.currentExplicitSql !== undefined &&
            serverType === "MySQL") {
            mysqlCode.sqlExplicitJoinHoverReplacement(sqlExplicitHoverProvider);
        }
        else if (plsqlImplicitHoverProvider.currentImplicitSql !== undefined &&
            serverType === "Oracle (PL/SQL)") {
            plsqlCode.sqlImplicitJoinHoverReplacement(plsqlImplicitHoverProvider);
        }
        else if (plsqlExplicitHoverProvider.currentExplicitSql !== undefined &&
            serverType === "Oracle (PL/SQL)") {
            plsqlCode.sqlExplicitJoinHoverReplacement(plsqlExplicitHoverProvider);
        }
        else {
            pyCode.csvCursorReplacement(csvHoverProvider);
            pyCode.forCursorReplacement(forHoverProvider);
            pyCode.miscellaneousReplacement(miscHoverProvider);
            if (serverType === "MySQL") {
                mysqlCode.sqlImplicitJoinCursorReplacement(sqlImplicitHoverProvider);
                mysqlCode.sqlExplicitJoinCursorReplacement(sqlExplicitHoverProvider);
            }
            else if (serverType === "Oracle (PL/SQL)") {
                plsqlCode.sqlExplicitJoinCursorReplacement(sqlExplicitHoverProvider);
                plsqlCode.sqlImplicitJoinCursorReplacement(sqlImplicitHoverProvider);
            }
        }
    });
    decorationTypeForLoop = vscode.window.createTextEditorDecorationType({
        textDecoration: "underline dashed red",
    });
    context.subscriptions.push(decorationTypeForLoop);
    decorationTypeSql = vscode.window.createTextEditorDecorationType({
        textDecoration: "underline dashed orange",
    });
    context.subscriptions.push(decorationTypeSql);
    decorationTypeSqlCritical = vscode.window.createTextEditorDecorationType({
        textDecoration: "underline dashed red",
    });
    context.subscriptions.push(decorationTypeSqlCritical);
    decorationTypeCsv = vscode.window.createTextEditorDecorationType({
        textDecoration: "underline wavy orange",
    });
    context.subscriptions.push(decorationTypeCsv);
    decorationTypeMiscellaneous = vscode.window.createTextEditorDecorationType({
        textDecoration: "underline dashed red",
    });
    context.subscriptions.push(decorationTypeMiscellaneous);
    let disposableMarkDirtyCode = vscode.commands.registerCommand("greencode.markDirtyCode", () => {
        if ((!serverType || !loginData) &&
            activeEditor?.document.languageId.includes("sql")) {
            vscode.window.showErrorMessage("Missing server type or login data. Please provide this information and try again.");
        }
        else {
            initialSqlDecorationSetup();
        }
        //updateDecorationsForLoop(),
        //  updateDecorationsCsv(),
        //  updateDecorationsMiscellaneous();
    });
    context.subscriptions.push(disposableMarkDirtyCode);
    let disposableDeactivateMarkDirtyCode = vscode.commands.registerCommand("greencode.deactivateMarkDirtyCode", () => {
        deactivateDecorationsForLoop(),
            deactivateDecorationsCsv(),
            deactivateDecorationsMiscellaneous(),
            deactivateDecorationsSql();
        deactivateDecorationsSqlCritical();
    });
    // context.subscriptions.push(disposableMarkDirtyCode);
    context.subscriptions.push(disposableDeactivateMarkDirtyCode);
    context.subscriptions.push(disposableCleanMarkedCode);
    context.subscriptions.push(disposableCleanCompleteCode);
    // context.subscriptions.push(
    //   vscode.window.onDidChangeActiveTextEditor((editor) => {
    //     activeEditor = editor;
    //     if (editor) {
    //       updateDecorationsForLoop();
    //     }
    //   }),
    //   vscode.workspace.onDidChangeTextDocument((event) => {
    //     if (activeEditor && event.document === activeEditor.document) {
    //       updateDecorationsForLoop();
    //     }
    //   })
    // );
    // context.subscriptions.push(
    //   vscode.window.onDidChangeActiveTextEditor((editor) => {
    //     activeEditor = editor;
    //     if (editor) {
    //       updateDecorationsCsv();
    //     }
    //   }),
    //   vscode.workspace.onDidChangeTextDocument((event) => {
    //     if (activeEditor && event.document === activeEditor.document) {
    //       updateDecorationsCsv();
    //     }
    //   })
    // );
    let timeout;
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        activeEditor = editor;
        if (editor) {
            deactivateDecorationsSql();
            deactivateDecorationsSqlCritical();
            counter.resetCounter();
            counter.resetCounterCritical();
            initialSqlDecorationSetup();
        }
    }), vscode.workspace.onDidChangeTextDocument((event) => {
        if (activeEditor &&
            event.document === activeEditor.document &&
            isUpdateDecorationsSqlRun) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                initialSqlDecorationSetup();
            }, 650);
            counter.resetCounter();
            counter.resetCounterCritical();
        }
    }));
    // context.subscriptions.push(
    //   vscode.window.onDidChangeActiveTextEditor((editor) => {
    //     activeEditor = editor;
    //     if (editor) {
    //       updateDecorationsMiscellaneous();
    //     }
    //   }),
    //   vscode.workspace.onDidChangeTextDocument((event) => {
    //     if (activeEditor && event.document === activeEditor.document) {
    //       updateDecorationsMiscellaneous();
    //     }
    //   })
    // );
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map