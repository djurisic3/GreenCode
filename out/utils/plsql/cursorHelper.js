"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCursorOnExpJoin = exports.isCursorOnImpJoin = void 0;
const vscode = require("vscode");
function isCursorOnImpJoin(positionSql) {
    let currentSql;
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    let text = document.getText();
    let matches = text.matchAll(/\bSELECT\b\s+((?:(?!SELECT|UPDATE|DELETE|INSERT)[\s\S])*?)\bFROM\b\s+((\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*)\s+(WHERE\s+((\w+(\.\w+)?\s*(!=|=|LIKE|NOT LIKE|IN|NOT IN|>|<|>=|<=|<>|AND|OR|NOT|EXISTS|NOT EXISTS|BETWEEN|NOT BETWEEN|IS NULL|IS NOT NULL)\s*(\([^)]*\)|[\s\S]+?))(?:\s*(AND|OR)\s+(\w+(\.\w+)?\s*(!=|=|LIKE|NOT LIKE|IN|NOT IN|>|<|>=|<=|<>|AND|OR|NOT|EXISTS|NOT EXISTS|BETWEEN|NOT BETWEEN|IS NULL|IS NOT NULL)\s*(\([^)]*\)|[\s\S]+?)))*))?(?:\s*;)?[^\S\r\n]*$/gim);
    for (const match of matches) {
        let start = match.index;
        let end = start + match[0].length;
        let range = new vscode.Range(document.positionAt(start), document.positionAt(end));
        if (range.contains(positionSql)) {
            currentSql = match[0];
            return [currentSql, range];
        }
    }
}
exports.isCursorOnImpJoin = isCursorOnImpJoin;
function isCursorOnExpJoin(positionSql) {
    let currentSql;
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    let text = document.getText();
    let matches = text.matchAll(/\bSELECT\b\s*(?:(?!\bFROM\b).)*(?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+)((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))*)+(?=;\s*$)/gim);
    for (const match of matches) {
        let start = match.index;
        let end = start + match[0].length;
        let range = new vscode.Range(document.positionAt(start), document.positionAt(end));
        if (range.contains(positionSql)) {
            currentSql = match[0];
            return [currentSql.trim(), range];
        }
    }
}
exports.isCursorOnExpJoin = isCursorOnExpJoin;
//# sourceMappingURL=cursorHelper.js.map