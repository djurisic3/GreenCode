"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csvHoverReplacement = exports.forHoverReplacement = exports.csvCursorReplacement = exports.miscellaneousReplacement = exports.forCursorReplacement = void 0;
const vscode = require("vscode");
const conversions = require("./conversions");
const cursor = require("./cursorHelper");
function forCursorReplacement(currentForHover) {
    let replacedCode;
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
    let forLoopRange = new vscode.Range(document.positionAt(start), document.positionAt(end));
    // Replace the for loop with the list comprehension
    if (forLoopRange.contains(position)) {
        editor.edit((editBuilder) => {
            editBuilder.replace(forLoopRange, replacedCode);
            currentForHover.currentForLoop = undefined;
        });
    }
}
exports.forCursorReplacement = forCursorReplacement;
function miscellaneousReplacement(currentMiscHover) {
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
    let sortString;
    sortString = conversions.convertMiscellaneous(sortCursor);
    // Find the start and end position of the for loop
    let startSort = text.indexOf(sortCursor);
    let endSort = startSort + sortCursor.length;
    let sortCursorRange = new vscode.Range(document.positionAt(startSort), document.positionAt(endSort));
    // Replace the for loop with the list comprehension
    if (sortCursorRange.contains(positionSort)) {
        editor.edit((editBuilder) => {
            editBuilder.replace(sortCursorRange, sortString);
            currentMiscHover.currentMisc = undefined;
        });
    }
}
exports.miscellaneousReplacement = miscellaneousReplacement;
function csvCursorReplacement(currentCsvHover) {
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
    let csvOldRange = new vscode.Range(document.positionAt(start), document.positionAt(end));
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
exports.csvCursorReplacement = csvCursorReplacement;
function forHoverReplacement(currentForHover) {
    if (!currentForHover.currentForLoop) {
        return;
    }
    let forLoop = currentForHover.currentForLoop;
    let listComprehension;
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
    let forLoopRange = new vscode.Range(document.positionAt(start), document.positionAt(end));
    // Replace the for loop with the list comprehension
    editor.edit((editBuilder) => {
        editBuilder.replace(forLoopRange, listComprehension);
        currentForHover.currentForLoop = undefined;
    });
}
exports.forHoverReplacement = forHoverReplacement;
function csvHoverReplacement(currentCsvHover) {
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
        let csvOldRange = new vscode.Range(document.positionAt(start), document.positionAt(end));
        // Replace the csv read with the csv library read
        editBuilder.replace(csvOldRange, csvNew);
        currentCsvHover.currentCsv = undefined;
    });
}
exports.csvHoverReplacement = csvHoverReplacement;
//# sourceMappingURL=codeReplacement.js.map