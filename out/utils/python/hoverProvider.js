"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvHover = exports.MiscHover = exports.ForLoopHover = void 0;
const vscode = require("vscode");
class ForLoopHover {
    provideHover(document, position, token) {
        let text = document.getText();
        let matches = text.matchAll(/for.*:\s*(\w+)\.(\w+)\((.*)\)|for\s+(\w+)\s+in\s+(\w+)\.keys\(\)\s*:[\s\S]*(\w+)\s*=\s*\5\[\4\]|for (.*) in range\((\d+),(\d+)\):\s*(\w+)\.(\w+)\((.*)\)|for\s*(\w+)\s*(\w+)\s*(\w\S*):\s*if\s*(\13)\s*(not|\s*)\s*in\s*(\w+):\s*(\18)\.(\w+)\((\13)\)|for\s+(\w+)\sin\s+(\w+):\s+(\w+)\s*(\+\=|=)\s*(\24)\s*\+\s*(\22)/g); // promijenuti da bude append petlja
        for (const match of matches) {
            let forLoopStart = match.index;
            let forLoopEnd = forLoopStart + match[0].length;
            let range = new vscode.Range(document.positionAt(forLoopStart), document.positionAt(forLoopEnd));
            if (range.contains(position)) {
                this.currentForLoop = match[0];
                let markdownString = new vscode.MarkdownString(`Click [here](command:greencode.cleanMarkedCode) to make your code greener or press ctrl + space.`);
                markdownString.isTrusted = true;
                return new vscode.Hover(markdownString);
            }
        }
    }
}
exports.ForLoopHover = ForLoopHover;
class MiscHover {
    provideHover(document, position, token) {
        let text = document.getText();
        let matches = text.matchAll(/(\w+)\.sort\(\)/g);
        for (const match of matches) {
            let sortStart = match.index;
            let sortEnd = sortStart + match[0].length;
            let range = new vscode.Range(document.positionAt(sortStart), document.positionAt(sortEnd));
            if (range.contains(position)) {
                this.currentMisc = match[0];
                let markdownString = new vscode.MarkdownString(`Click [here](command:greencode.cleanMarkedCode) to make your code greener or press ctrl + space.`);
                markdownString.isTrusted = true;
                return new vscode.Hover(markdownString);
            }
        }
    }
}
exports.MiscHover = MiscHover;
class CsvHover {
    provideHover(document, position, token) {
        let text = document.getText();
        let matches = text.matchAll(/\b.*\.read_csv/g);
        for (const match of matches) {
            let csvStart = match.index;
            let csvEnd = csvStart + match[0].length;
            let range = new vscode.Range(document.positionAt(csvStart), document.positionAt(csvEnd));
            if (range.contains(position)) {
                if (text.includes("import csv")) {
                    this.currentCsv = match[0];
                    let markdownString = new vscode.MarkdownString(`Click [here](command:greencode.cleanMarkedCode) to make your code greener or press ctrl + space`);
                    markdownString.isTrusted = true;
                    return new vscode.Hover(markdownString);
                }
                else {
                    this.currentCsv = match[0];
                    let markdownString = new vscode.MarkdownString(`[Import](command:greencode.importLibraries) csv library.  \nClick [here](command:greencode.cleanMarkedCode) to make your code greener or press ctrl + space`);
                    markdownString.isTrusted = true;
                    return new vscode.Hover(markdownString);
                }
            }
        }
    }
}
exports.CsvHover = CsvHover;
//# sourceMappingURL=hoverProvider.js.map