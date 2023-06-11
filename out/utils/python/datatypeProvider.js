"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataTypes = void 0;
const vscode = require("vscode");
async function getDataTypes(document) {
    const pythonExtension = vscode.extensions.getExtension('ms-python.python');
    const client = pythonExtension.exports.getApi(1).getLanguageClient('python');
    const sourceCode = document.getText();
    const lines = sourceCode.split('\n');
    let loopVariables = [];
    // Find the line containing the for loop
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const loopMatch = line.match(/for.*in.*:/);
        if (loopMatch) {
            // Extract the variables used in the for loop
            const loopVariablesMatch = line.match(/for (.*) in (.*):/);
            if (loopVariablesMatch) {
                loopVariables = [loopVariablesMatch[1], loopVariablesMatch[2]];
                break;
            }
        }
    }
    if (loopVariables.length === 0) {
        return {};
    }
    // Get the data types of the variables
    const result = await client.sendRequest('python/hover', { source: sourceCode, line: 1, col: 1 });
    let dataTypes = {};
    for (const variable of loopVariables) {
        dataTypes[variable] = result[variable];
    }
    return dataTypes;
}
exports.getDataTypes = getDataTypes;
//# sourceMappingURL=datatypeProvider.js.map