"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCursorOnForLoop = void 0;
const vscode = require("vscode");
function isCursorOnForLoop(positionFor) {
    let currentForLoop;
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    let text = document.getText();
    let matches = text.matchAll(/for.*:\s*(\w+)\.(\w+)\((.*)\)/g); // promijenuti da bude append petlja
    for (const match of matches) {
        let start = match.index;
        let end = start + match[0].length;
        let range = new vscode.Range(document.positionAt(start), document.positionAt(end));
        if (range.contains(positionFor)) {
            currentForLoop = match[0];
            return currentForLoop;
        }
    }
}
exports.isCursorOnForLoop = isCursorOnForLoop;
//# sourceMappingURL=cursorPosition.js.map