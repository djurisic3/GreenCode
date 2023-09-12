import * as vscode from "vscode";
import * as conversions from "./utils/python/conversions";
import * as pythonFinder from "./utils/python/dirtFinder";
import * as sqlFinder from "./utils/mysql/dirtFinder";
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
import * as criticalDirt from "./utils/mysql/dirtFinderCritical";

let decorationTypeForLoop: vscode.TextEditorDecorationType;
let decorationTypeCsv: vscode.TextEditorDecorationType;
let decorationTypeSql: vscode.TextEditorDecorationType;
let decorationTypeSqlCritical: vscode.TextEditorDecorationType;
let decorationTypeMiscellaneous: vscode.TextEditorDecorationType;
let activeEditor: vscode.TextEditor | undefined;
let sqlDecorationLevel: number;

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

  activeEditor.setDecorations(decorationTypeSqlCritical,selectStarDecoration);

  let isLogged = false;
  let decorations = await sqlFinder.markSelectSQL(
    activeEditor.document,
    isLogged,
    loginData!
  );
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
  activeEditor.setDecorations(decorationTypeSql, []);
}

function deactivateDecorationsSqlCritical() {
  activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return;
  }
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

  if (activeEditor?.document.languageId !== "python") {
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
      if (!serverType && activeEditor?.document.languageId === "sql") {
        vscode.window.showErrorMessage(
          "Server type is not defined yet. Please wait a moment and try again."
        );
        return;
      }
      console.log("SERVER TYPE: " + serverType);
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
      } 
      else if (
        plsqlExplicitHoverProvider.currentExplicitSql !== undefined &&
        serverType === "Oracle (PL/SQL)"
      ) {
        plsqlCode.sqlExplicitJoinHoverReplacement(plsqlExplicitHoverProvider);
      }
      
      else {
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
    textDecoration: "underline dashed red"
  })
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
        activeEditor?.document.languageId === "sql"
      ) {
        vscode.window.showErrorMessage(
          "Missing server type or login data. Please provide this information and try again."
        );
      } else {
        updateDecorationsSql();
        
      }
      updateDecorationsForLoop(),
        updateDecorationsCsv(),
        updateDecorationsMiscellaneous();
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
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor;
      if (editor) {
        updateDecorationsForLoop();
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorationsForLoop();
      }
    })
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor;
      if (editor) {
        updateDecorationsCsv();
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorationsCsv();
      }
    })
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor;
      if (editor) {
        updateDecorationsSql();
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorationsSql();
      }
    })
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor;
      if (editor) {
        updateDecorationsMiscellaneous();
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorationsMiscellaneous();
      }
    })
  );
}
