"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceWithCsv = exports.importCSV = exports.convertForToListComprehension = void 0;
function convertForToListComprehension(text) {
    // Convert for loop with range
    text = text.replace(/for i in range\((\d+),(\d+)\):\s*(\w+)\.(\w+)\((.*)\)/g, "$3 += [$5 for i in range($1,$2)]");
    // Convert for loop with extend
    text = text.replace(/for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*):\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\.extend\s*\(([^)]+)\)/, "$3 += [$4 for $1 in $2]");
    // Convert for loop with list
    text = text.replace(/for i in (\[.*\]):\s*(\w+)\.(\w+)\((.*)\)/g, "$3 += [$4 for i in $1]");
    // Convert for loop with string
    text = text.replace(/for c in "(.*)":\s*(\w+)\.(\w+)\((.*)\)/g, '$3 += [$4 for c in "$1"]');
    // Convert for loop with variable
    text = text.replace(/for (.*) in (.*):\s*(\w+)\.(\w+)\((.*)\)/g, "$3 += [$5 for $1 in $2]");
    return text;
}
exports.convertForToListComprehension = convertForToListComprehension;
function importCSV(code) {
    let lines = code.split("\n");
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("import")) {
            lastImportIndex = i;
        }
    }
    if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, "import csv");
    }
    return lines.join("\n");
}
exports.importCSV = importCSV;
function replaceWithCsv(code) {
    code = code.replace(/.*\.read_csv/g, "csv.reader");
    return code;
}
exports.replaceWithCsv = replaceWithCsv;
// 3 - 1, 5 - 1, 4 - 1, 2 - 1;
//# sourceMappingURL=conversions.js.map