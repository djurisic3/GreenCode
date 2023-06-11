import * as hover from "./hoverProvider";
import * as vscode from "vscode";
import * as conversions from "./conversions";
import * as cursor from "./cursorHelper";

export function forCursorReplacement(currentForHover: hover.ForLoopHover) {
  let replacedCode: string;
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const position = editor.selection.active;
  let forCursor = cursor.isCursorOnForLoop(position);

  if (!forCursor) {
    return;
  }

  replacedCode = conversions.convertForLoopToComprehensionPy(forCursor);
  const document = editor.document;
  const text = document.getText();

  // Find the start and end position of the for loop
  let start = text.indexOf(forCursor);
  let end = start + forCursor.length;
  let forLoopRange = new vscode.Range(
    document.positionAt(start),
    document.positionAt(end)
  );
  // Replace the for loop with the list comprehension
  if (forLoopRange.contains(position)) {
    editor.edit((editBuilder) => {
      editBuilder.replace(forLoopRange, replacedCode);
      currentForHover.currentForLoop = undefined;
    });
  }
}

export function miscellaneousReplacement(currentMiscHover: hover.MiscHover) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const document = editor.document;
  const text = document.getText();

  const positionSort = editor.selection.active;
  let sortCursor = cursor.isCursorOnMiscellaneous(positionSort);
  if (!sortCursor) {
    return;
  }
  let sortString: string;

  sortString = conversions.convertMiscellaneous(sortCursor);

  // Find the start and end position of the for loop
  let startSort = text.indexOf(sortCursor);
  let endSort = startSort + sortCursor.length;
  let sortCursorRange = new vscode.Range(
    document.positionAt(startSort),
    document.positionAt(endSort)
  );
  // Replace the for loop with the list comprehension
  if (sortCursorRange.contains(positionSort)) {
    editor.edit((editBuilder) => {
      editBuilder.replace(sortCursorRange, sortString);
      currentMiscHover.currentMisc = undefined;
    });
  }
}

export function csvCursorReplacement(currentCsvHover: hover.CsvHover) {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }
  const position = editor.selection.active;
  let csvCursor = cursor.isCursorOnCsv(position);

  const document = editor.document;
  let text = document.getText();
  if (!csvCursor) {
    return;
  }

  let csvNew = conversions.convertCsv(csvCursor);

  let start = text.indexOf(csvCursor);
  let end = start + csvCursor.length;
  let csvOldRange = new vscode.Range(
    document.positionAt(start),
    document.positionAt(end)
  );

  if (csvOldRange.contains(position)) {
    if (!text.includes("import csv")) {
      editor.edit((editBuilder) => {
        // Insert "import csv" at the first line
        let firstLineRange = new vscode.Range(0, 0, 0, 0);
        editBuilder.insert(firstLineRange.start, "import csv\n\n");
        currentCsvHover.currentCsv = undefined;
      });
    }

    editor.edit((editBuilder) => {
      // Find the start and end position of the csv read function
      // Replace the csv read with the csv library read
      editBuilder.replace(csvOldRange, csvNew);
      currentCsvHover.currentCsv = undefined;
    });
  }
}

export function forHoverReplacement(currentForHover: hover.ForLoopHover) {
  if (!currentForHover.currentForLoop) {
    return;
  }

  let forLoop = currentForHover.currentForLoop;
  let listComprehension: string;
  // Perform the conversion on the for loop
  listComprehension = conversions.convertForLoopToComprehensionPy(forLoop);

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const text = document.getText();

  // Find the start and end position of the for loop
  let start = text.indexOf(forLoop);
  let end = start + forLoop.length;
  let forLoopRange = new vscode.Range(
    document.positionAt(start),
    document.positionAt(end)
  );
  // Replace the for loop with the list comprehension

  editor.edit((editBuilder) => {
    editBuilder.replace(forLoopRange, listComprehension);
    currentForHover.currentForLoop = undefined;
  });
}

export function csvHoverReplacement(currentCsvHover: hover.CsvHover) {
  if (!currentCsvHover.currentCsv) {
    return;
  }
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  let text = document.getText();

  let csvOld = currentCsvHover.currentCsv;
  let csvNew = conversions.convertCsv(csvOld);

  if (!text.includes("import csv")) {
    editor.edit((editBuilder) => {
      // Insert "import csv" at the first line
      let firstLineRange = new vscode.Range(0, 0, 0, 0);
      editBuilder.insert(firstLineRange.start, "import csv\n\n");
      currentCsvHover.currentCsv = undefined;
    });
  }

  editor.edit((editBuilder) => {
    // Find the start and end position of the csv read function
    let start = text.indexOf(csvOld);
    let end = start + csvOld.length;
    let csvOldRange = new vscode.Range(
      document.positionAt(start),
      document.positionAt(end)
    );
    // Replace the csv read with the csv library read
    editBuilder.replace(csvOldRange, csvNew);
    currentCsvHover.currentCsv = undefined;
  });
}
