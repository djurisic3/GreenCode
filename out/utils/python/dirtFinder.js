"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markCsvPy = exports.markMiscellaneousPy = exports.markForLoopsPy = void 0;
const vscode = require("vscode");
function markForLoopsPy(document) {
    if (document.languageId !== "python") {
        return [];
    }
    let decorations = [];
    let text = document.getText();
    const regex = /for\s+(\w+)\s+in\s+range\(len\((\w+)\)\):/gmi;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const startIndexFor = match.index;
        const loopVar = match[1];
        const listVar = match[2];
        const remainingText = text.slice(startIndexFor + match[0].length);
        const lines = remainingText.split("\n");
        for (const line of lines) {
            const indentedPattern = new RegExp(`^\\s{3,}.*?${listVar}\\[.*?${loopVar}.*?\\].*$`);
            if (indentedPattern.test(line)) {
                let start = document.positionAt(startIndexFor);
                let end = document.positionAt(startIndexFor + 3);
                decorations.push({
                    range: new vscode.Range(start, end),
                    hoverMessage: "Found a for loop with the desired pattern.",
                });
                break;
            }
        }
    }
    if (text.includes("for")) {
        let match;
        const regex = /for.*:\s*(\w+)\.(\w+)\((.*)\)/g;
        while ((match = regex.exec(text)) !== null) {
            let start = document.positionAt(match.index);
            let end = document.positionAt(match.index + 3);
            decorations.push({
                range: new vscode.Range(start, end),
                hoverMessage: "The function append in a for loop is much more energy-consuming than a list comprehension",
            });
        }
        let matchString;
        const regexString = /(\w+)\s*=\s*""\s*[\s\S]*for\s*(\w+)\s*in\s*(\w+):\s*\1\s*(\+\=|=)\s*\1\s*\+\s*\2\s*/gim;
        while ((matchString = regexString.exec(text)) !== null) {
            let startIndexFor = matchString.index + matchString[0].indexOf("for");
            let start = document.positionAt(startIndexFor);
            let end = document.positionAt(startIndexFor + 3);
            decorations.push({
                range: new vscode.Range(start, end),
                hoverMessage: "String concatenation is eco-friendlier with the join function.",
            });
        }
        let matchForIf;
        const regexForIf = /for\s*(\w+)\s*(\w+)\s*(\w\S*):\s*if\s*(\1)\s*(not|\s*)\s*in\s*(\w+):\s*(\6)\.(\w+)\((\1)\)/gim;
        while ((matchForIf = regexForIf.exec(text)) !== null) {
            let start = document.positionAt(matchForIf.index);
            let end = document.positionAt(matchForIf.index + 3);
            decorations.push({
                range: new vscode.Range(start, end),
                hoverMessage: "Using the in operator to check if an item is/is not in a list is slower than using a set.",
            });
        }
        let matchForDictLoop;
        const regexForDict = /for\s+(\w+)\s+in\s+(\w+)\.keys\(\)\s*:[\s\S]*(\w+)\s*=\s*\2\[\1\]/gim;
        while ((matchForDictLoop = regexForDict.exec(text)) !== null) {
            let start = document.positionAt(matchForDictLoop.index);
            let end = document.positionAt(matchForDictLoop.index + 3);
            decorations.push({
                range: new vscode.Range(start, end),
                hoverMessage: "Looping a dictionary is eco-friendier with items() than keys()",
            });
        }
    }
    return decorations;
}
exports.markForLoopsPy = markForLoopsPy;
function markMiscellaneousPy(document) {
    if (document.languageId !== "python") {
        return [];
    }
    let decorations = [];
    let text = document.getText();
    if (text.includes("sort()")) {
        let match;
        const regex = /(\w+)\.sort\(\)/g;
        while ((match = regex.exec(text)) !== null) {
            let startIndexSort = match.index + match[0].indexOf(".") + 1;
            let endIndexSort = startIndexSort + match.length + 2;
            let start = document.positionAt(startIndexSort);
            let end = document.positionAt(endIndexSort);
            decorations.push({
                range: new vscode.Range(start, end),
                hoverMessage: "*list*.sort() is eco-friendlier than sorted(*list*).",
            });
        }
    }
    return decorations;
}
exports.markMiscellaneousPy = markMiscellaneousPy;
function markCsvPy(document) {
    if (document.languageId !== "python") {
        return [];
    }
    let decorations = [];
    let text = document.getText();
    if (text.includes("csv")) {
        let match;
        const regex = /read_csv/g;
        while ((match = regex.exec(text)) !== null) {
            let start = document.positionAt(match.index);
            let end = document.positionAt(match.index + 8);
            decorations.push({
                range: new vscode.Range(start, end),
                hoverMessage: "Reading a csv file is most efficient with the csv library. \n Additional data processing can be done with other libraries upon the csv library data format.",
            });
        }
    }
    return decorations;
}
exports.markCsvPy = markCsvPy;
//# sourceMappingURL=dirtFinder.js.map