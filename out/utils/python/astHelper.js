"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const document = vscode.window.activeTextEditor.document;
const documentText = document.getText();
// Use a regular expression to search for all instances of variables in the document text
const variableRegex = /\b(\w+)\b/g;
let match;
const asd = '123';
asd + 2;
while ((match = variableRegex.exec(documentText)) !== null) {
    // Get the name of the variable
    const variableName = match[1];
    // Use the 'vscode.commands.executeCommand' method to retrieve information about the symbol
    vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri, new vscode.Position(document.positionAt(match.index).line, document.positionAt(match.index).character)).then(symbols => {
        if (symbols && symbols.length > 0) {
            const symbol = symbols[0];
            // Get the data type of the symbol
            const dataType = symbol.type;
            // Check if the data type is a string
            if (dataType === 'string') {
                console.log(`Variable '${variableName}' is a string.`);
            }
        }
        else {
            console.log(`No symbol found for variable '${variableName}'.`);
        }
    });
}
//# sourceMappingURL=astHelper.js.map