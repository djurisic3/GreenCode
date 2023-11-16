"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlExplicitJoinHover = exports.sqlImplicitJoinHover = void 0;
const vscode = require("vscode");
const primKeysHelper = require("./primaryKeyHelper");
const loginManager_1 = require("./loginManager");
class sqlImplicitJoinHover {
    provideHover(document, position, token) {
        let text = document.getText();
        let matches = text.matchAll(/\bSELECT\b\s+((?:(?!SELECT|UPDATE|DELETE|INSERT)[\s\S])*?)\bFROM\b\s+((\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*)(\s+(WHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*))?)(?=\s*;|\s*\))/gim);
        for (const match of matches) {
            if (match.index !== undefined && match.input !== undefined) {
                let implicitJoinStart = match.index;
                let implicitJoinEnd = implicitJoinStart + match[0].length;
                let range = new vscode.Range(document.positionAt(implicitJoinStart), document.positionAt(implicitJoinEnd));
                if (range.contains(position)) {
                    this.currentImplicitSql = match[0];
                    this.currentImplicitSqlRange = range;
                    let matchWhere = match[13] === undefined ? "" : match[13].toString();
                    return (0, loginManager_1.getLoginDataMySql)().then((loginData) => {
                        if (!loginData)
                            return undefined;
                        return primKeysHelper
                            .checkImplicitPrimKeys(loginData, match, matchWhere)
                            .then(([tablePrimKeys, isPrimaryKeyAbsent, isValidSql]) => {
                            if (isValidSql && isPrimaryKeyAbsent) {
                                let markdownString = new vscode.MarkdownString(`Press ctrl + space to add primary key columns`);
                                markdownString.isTrusted = true;
                                return new vscode.Hover(markdownString);
                            }
                            return undefined;
                        });
                    });
                }
            }
        }
        return undefined;
    }
}
exports.sqlImplicitJoinHover = sqlImplicitJoinHover;
class sqlExplicitJoinHover {
    provideHover(document, position, token) {
        let text = document.getText();
        let matches = text.matchAll(/\bSELECT\b\s*(?:(?!\bFROM\b).)*(?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+)((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))*)(?=\s*;|\s*\))\s*/gim);
        for (const match of matches) {
            if (match.index !== undefined && match.input !== undefined) {
                let implicitJoinStart = match.index;
                let implicitJoinEnd = implicitJoinStart + match[0].length;
                let range = new vscode.Range(document.positionAt(implicitJoinStart), document.positionAt(implicitJoinEnd));
                if (range.contains(position)) {
                    this.currentExplicitSql = match[0];
                    this.currentExplicitSqlRange = range;
                    let matchJoinOn = match[10] === undefined ? "" : match[10].toString();
                    return (0, loginManager_1.getLoginDataMySql)().then((loginData) => {
                        if (!loginData)
                            return undefined;
                        return primKeysHelper
                            .checkExplicitPrimKeys(loginData, match, matchJoinOn)
                            .then(([tablePrimKeys, isPrimaryKeyAbsentExplicit, isValidExplicitSql,]) => {
                            if (isValidExplicitSql && isPrimaryKeyAbsentExplicit) {
                                let markdownString = new vscode.MarkdownString(`Press ctrl + space to add primary key columns`);
                                markdownString.isTrusted = true;
                                return new vscode.Hover(markdownString);
                            }
                            return undefined;
                        });
                    });
                }
            }
        }
        return undefined;
    }
}
exports.sqlExplicitJoinHover = sqlExplicitJoinHover;
//# sourceMappingURL=hoverProvider.js.map