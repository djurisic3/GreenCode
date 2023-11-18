import * as vscode from "vscode";
import * as conversions from "./utils/python/conversions";
import * as pythonFinder from "./utils/python/dirtFinder";
import * as sqlFinder from "./utils/helper/dirtFinder";
import * as hover from "./utils/python/hoverProvider";
import * as pyCode from "./utils/python/codeReplacement";
import * as mysqlCode from "./utils/mysql/codeReplacement";
import * as plsqlCode from "./utils/plsql/codeReplacement";
import { getLoginDataPlSql } from "./utils/plsql/loginManager";
import { getLoginDataMySql } from "./utils/mysql/loginManager";
import {
  sqlImplicitJoinHover,
  sqlExplicitJoinHover,
} from "./utils/mysql/hoverProvider";
import {
  sqlExplicitJoinHover as plsqlExplicitJoinHover,
  sqlImplicitJoinHover as plsqlImplicitJoinHover,
} from "./utils/plsql/hoverProvider";
import * as sqlFileSearch from "./utils/mysql/sqlFileSearch";
import * as criticalDirt from "./utils/helper/dirtFinderCritical";
import * as counter from "./utils/helper/counter";
import {
  addLocation,
  getLocations,
  removeLocation,
} from "./utils/plsql/codeLocationStorage";

let decorationTypeForLoop: vscode.TextEditorDecorationType;
let decorationTypeCsv: vscode.TextEditorDecorationType;
let decorationTypeSql: vscode.TextEditorDecorationType;
let decorationTypeSqlCritical: vscode.TextEditorDecorationType;
let decorationTypeMiscellaneous: vscode.TextEditorDecorationType;
let activeEditor: vscode.TextEditor | undefined;
let statusBarMessageMedium: vscode.StatusBarItem;
let statusBarMessageHigh: vscode.StatusBarItem;

let isUpdateDecorationsSqlRun = false;

function updateStatusBarMessages() {
  const highCount = counter.getCounterCritical();
  const mediumCount = counter.getCounter();

  if (highCount > 0) {
    statusBarMessageHigh.text = `High Severity: ${highCount} spots need eco-efficient optimization.`;
    statusBarMessageHigh.command = "greencode.navigateToNextHighSeverity";
    statusBarMessageHigh.show();
  }

  if (mediumCount > 0) {
    statusBarMessageMedium.text = `Medium Severity: ${mediumCount} spots need eco-efficient optimization.`;
    statusBarMessageMedium.command = "greencode.navigateToNextMediumSeverity";
    statusBarMessageMedium.show();
  }
}

function navigateToNextHighSeverity(): void {
  navigateToNextSeverity("high");
}

function navigateToNextMediumSeverity(): void {
  navigateToNextSeverity("medium");
}

function navigateToNextSeverity(severity: "high" | "medium"): void {
  let locations = getLocations(severity);
  if (locations.length === 0) {
    if (severity === "medium") {
      statusBarMessageMedium.text = `Medium Severity: 0 spots need eco-efficient optimization.`;
      statusBarMessageMedium.show();
    } else if (severity === "high") {
      statusBarMessageMedium.text = `High Severity: 0 spots need eco-efficient optimization.`;
      statusBarMessageMedium.show();
    }
    vscode.window.showInformationMessage(
      `No more ${severity} severity spots to navigate to.`
    );
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    // Always navigate to the first location in the list
    const nextLocation = locations[0];
    editor.selection = new vscode.Selection(
      nextLocation.start,
      nextLocation.end
    );
    editor.revealRange(nextLocation, vscode.TextEditorRevealType.InCenter);

    // Remove the navigated location from the list
    removeLocation(nextLocation, severity);

    addLocation(nextLocation, severity);
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

  const selectStarDecoration = criticalDirt.findSelectAsteriskStatements(
    activeEditor.document
  );

  activeEditor.setDecorations(decorationTypeSqlCritical, selectStarDecoration);

  let isLogged = false;
  let decorations = await sqlFinder.markSelectSQL(
    activeEditor.document,
    isLogged,
    loginData!
  );

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

let serverType: string | undefined;
let loginData:
  | { host: string; user: string; password: string; database: string }
  | { user: string; password: string; connectionString: string }
  | undefined;

export async function activate(context: vscode.ExtensionContext) {
  let forHoverProvider = new hover.ForLoopHover();
  let csvHoverProvider = new hover.CsvHover();
  let miscHoverProvider = new hover.MiscHover();
  let sqlImplicitHoverProvider = new sqlImplicitJoinHover();
  let sqlExplicitHoverProvider = new sqlExplicitJoinHover();
  let plsqlExplicitHoverProvider = new plsqlExplicitJoinHover();
  let plsqlImplicitHoverProvider = new plsqlImplicitJoinHover();

  statusBarMessageHigh = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarMessageMedium = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "greencode.navigateToNextHighSeverity",
      navigateToNextHighSeverity
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "greencode.navigateToNextMediumSeverity",
      navigateToNextMediumSeverity
    )
  );

  context.subscriptions.push(statusBarMessageHigh, statusBarMessageMedium);

  const disposableFindAllQueries = vscode.commands.registerCommand(
    "greencode.findSqlQueries",
    async () => {
      const options: vscode.OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Select Folder",
      };

      const folderUris = await vscode.window.showOpenDialog(options);
      if (folderUris && folderUris.length > 0) {
        const folderUri = folderUris[0];
        const searchRecursively = await vscode.window.showQuickPick(
          ["Yes", "No"],
          {
            placeHolder:
              "Search for SQL queries recursively in all subfolders?",
          }
        );

        const connectDB = await vscode.window.showQuickPick(["Yes", "No"], {
          placeHolder: "Connect to database (for detailed analysis)?",
        });

        if (searchRecursively && connectDB) {
          const results = await sqlFileSearch.searchFiles(
            folderUri,
            searchRecursively === "Yes",
            connectDB === "Yes"
          );
          if (results) {
            sqlFileSearch.showRecommendations(
              results.tableAndAlias,
              results.tablesAndColumns,
              results.readWriteCount,
              results.columnOccurrences,
              context
            );
          }
        }
      }
    }
  );

  activeEditor = vscode.window.activeTextEditor;

  if (activeEditor?.document.languageId.includes("sql")) {
    serverType = await vscode.window.showQuickPick(
      ["Oracle (PL/SQL)", "MySQL"],
      {
        placeHolder: "Choose the server type:",
      }
    );

    if (!serverType) {
      await vscode.window
        .showErrorMessage(
          "Missing server type. Extension activation aborted. Please reload to retry.",
          "Reload Window"
        )
        .then((selection) => {
          if (selection === "Reload Window") {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
          }
        });
      return;
    }

    if (serverType === "Oracle (PL/SQL)") {
      context.subscriptions.push(
        vscode.languages.registerHoverProvider(
          "sql",
          plsqlExplicitHoverProvider
        )
      );
      context.subscriptions.push(
        vscode.languages.registerHoverProvider(
          "sql",
          plsqlImplicitHoverProvider
        )
      );
      loginData = await getLoginDataPlSql();
      if (!loginData || loginData === undefined) {
        await vscode.window
          .showErrorMessage(
            "Missing login data. Extension activation aborted. Please reload to retry.",
            "Reload Window"
          )
          .then((selection) => {
            if (selection === "Reload Window") {
              vscode.commands.executeCommand("workbench.action.reloadWindow");
            }
          });
        context.subscriptions.push(
          vscode.languages.registerHoverProvider(
            "sql",
            plsqlExplicitHoverProvider
          )
        );
        return;
      }
    } else if (serverType === "MySQL") {
      context.subscriptions.push(
        vscode.languages.registerHoverProvider("sql", sqlImplicitHoverProvider)
      );

      context.subscriptions.push(
        vscode.languages.registerHoverProvider("sql", sqlExplicitHoverProvider)
      );
      loginData = await getLoginDataMySql();
      if (!loginData || loginData === undefined) {
        await vscode.window
          .showErrorMessage(
            "Missing login data. Extension activation aborted. Please reload to retry.",
            "Reload Window"
          )
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

  context.subscriptions.push(
    vscode.languages.registerHoverProvider("python", forHoverProvider)
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider("python", csvHoverProvider)
  );

  context.subscriptions.push(
    vscode.languages.registerHoverProvider("python", miscHoverProvider)
  );

  let disposableCleanCompleteCode = vscode.commands.registerCommand(
    "greencode.cleanCompleteCode",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const document = editor.document;
      let text = document.getText();
      let listComprehension: string;

      listComprehension = conversions.convertAllPy(text);

      editor.edit((editBuilder) => {
        let fullRange = editor.document.validateRange(
          new vscode.Range(
            0,
            0,
            document.lineCount,
            document.lineAt(document.lineCount - 1).text.length
          )
        );
        editBuilder.replace(fullRange, listComprehension);
      });
    }
  );

  let disposableCleanMarkedCode = vscode.commands.registerCommand(
    "greencode.cleanMarkedCode",
    () => {
      if (!serverType && activeEditor?.document.languageId.includes("sql")) {
        vscode.window.showErrorMessage(
          "Server type is not defined yet. Please wait a moment and try again."
        );
        return;
      }
      console.log("Server type: " + serverType);
      plsqlImplicitHoverProvider.currentImplicitSql = undefined;
      plsqlExplicitHoverProvider.currentExplicitSql = undefined;
      if (forHoverProvider.currentForLoop !== undefined) {
        pyCode.forHoverReplacement(forHoverProvider);
      } else if (csvHoverProvider.currentCsv !== undefined) {
        pyCode.csvHoverReplacement(csvHoverProvider);
      } else if (miscHoverProvider.currentMisc !== undefined) {
        pyCode.miscellaneousReplacement(miscHoverProvider);
      } else if (
        sqlImplicitHoverProvider.currentImplicitSql !== undefined &&
        serverType === "MySQL"
      ) {
        mysqlCode.sqlImplicitJoinHoverReplacement(sqlImplicitHoverProvider);
      } else if (
        sqlExplicitHoverProvider.currentExplicitSql !== undefined &&
        serverType === "MySQL"
      ) {
        mysqlCode.sqlExplicitJoinHoverReplacement(sqlExplicitHoverProvider);
      } else if (
        plsqlImplicitHoverProvider.currentImplicitSql !== undefined &&
        serverType === "Oracle (PL/SQL)"
      ) {
        plsqlCode.sqlImplicitJoinHoverReplacement(plsqlImplicitHoverProvider);
      } else if (
        plsqlExplicitHoverProvider.currentExplicitSql !== undefined &&
        serverType === "Oracle (PL/SQL)"
      ) {
        plsqlCode.sqlExplicitJoinHoverReplacement(plsqlExplicitHoverProvider);
      } else {
        pyCode.csvCursorReplacement(csvHoverProvider);
        pyCode.forCursorReplacement(forHoverProvider);
        pyCode.miscellaneousReplacement(miscHoverProvider);
        if (serverType === "MySQL") {
          mysqlCode.sqlImplicitJoinCursorReplacement(sqlImplicitHoverProvider);
          mysqlCode.sqlExplicitJoinCursorReplacement(sqlExplicitHoverProvider);
        } else if (serverType === "Oracle (PL/SQL)") {
          plsqlCode.sqlExplicitJoinCursorReplacement(sqlExplicitHoverProvider);
          plsqlCode.sqlImplicitJoinCursorReplacement(sqlImplicitHoverProvider);
        }
      }
    }
  );

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

  let disposableMarkDirtyCode = vscode.commands.registerCommand(
    "greencode.markDirtyCode",
    () => {
      if (
        (!serverType || !loginData) &&
        activeEditor?.document.languageId.includes("sql")
      ) {
        vscode.window.showErrorMessage(
          "Missing server type or login data. Please provide this information and try again."
        );
      } else {
        initialSqlDecorationSetup();
      }
      //updateDecorationsForLoop(),
      //  updateDecorationsCsv(),
      //  updateDecorationsMiscellaneous();
    }
  );

  context.subscriptions.push(disposableMarkDirtyCode);

  let disposableDeactivateMarkDirtyCode = vscode.commands.registerCommand(
    "greencode.deactivateMarkDirtyCode",
    () => {
      deactivateDecorationsForLoop(),
        deactivateDecorationsCsv(),
        deactivateDecorationsMiscellaneous(),
        deactivateDecorationsSql();
      deactivateDecorationsSqlCritical();
    }
  );

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
  let timeout: string | number | NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor;
      if (editor) {
        initialSqlDecorationSetup();
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (activeEditor && event.document === activeEditor.document) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          initialSqlDecorationSetup();
        }, 650)
        counter.resetCounter();
        counter.resetCounterCritical();
        initialSqlDecorationSetup();
      }
    })
  );
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
