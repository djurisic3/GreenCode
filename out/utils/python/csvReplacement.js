"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csvReplacement = void 0;
const vscode = require("vscode");
const conversions = require("./conversions");
function csvReplacement(currentCsvHover) {
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
exports.csvReplacement = csvReplacement;
//# sourceMappingURL=csvReplacement.js.map