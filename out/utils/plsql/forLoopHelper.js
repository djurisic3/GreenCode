"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractLoopBody = exports.replaceSelectStar = exports.findUsedColumns = exports.extractSelectStarQueries = void 0;
const extractSelectStarQueries = (code) => {
    const loopPattern = /for\s+([a-zA-Z0-9_]+)\s+in\s*\(\s*(select\s+(?:[a-zA-Z0-9_]+\.\*)?\s*\*?\s+from\s+[a-zA-Z0-9_]+.*?)(?=\s*\)\s+loop)/gim;
    const matches = Array.from(code.matchAll(loopPattern));
    return matches.map((match) => ({
        query: match[2],
        variableName: match[1],
    }));
};
exports.extractSelectStarQueries = extractSelectStarQueries;
const findUsedColumns = (loopBody, variableName) => {
    const columnPattern = new RegExp(`${variableName}\.([a-zA-Z0-9_]+)`, "gmi");
    const matches = Array.from(loopBody.matchAll(columnPattern));
    // Using map to directly extract the desired column names.
    const columns = matches.map((match) => match[1]);
    return [...new Set(columns)]; // Deduplicate using a Set.
};
exports.findUsedColumns = findUsedColumns;
const replaceSelectStar = (query, columns) => {
    // Extract the table identifier
    const identifierMatch = query.match(/select\s+([a-zA-Z0-9_]+)\.\*/);
    const identifier = identifierMatch ? identifierMatch[1] : null;
    // If an identifier exists, prepend it to each column name.
    const columnsString = columns.map(col => (identifier ? `${identifier}.${col}` : col)).join(', ');
    // Replace the select * or identifier.* part in the query with the column names
    return query.replace(/select\s+((?:[a-zA-Z0-9_]+\.\*)|\*)/gmi, `select ${columnsString}`);
};
exports.replaceSelectStar = replaceSelectStar;
const extractLoopBody = (code, variableName, query) => {
    const modifiedQuery = query.replace(/\*/g, "[*]");
    const patternStr = `for\\s+${variableName}\\s+in\\s*\\(\\s*${modifiedQuery}\\s*\\)\\s+loop`;
    const startPattern = new RegExp(patternStr, "gmi");
    const matches = Array.from(code.matchAll(startPattern));
    if (!matches.length) {
        return null;
    }
    // Capturing the loop body
    const loopPattern = new RegExp(`for\\s+${variableName}\\s+in\\s*\\(\\s*${modifiedQuery}\\s*\\)\\s+loop([\\s\\S]*?)end\\s+loop;`, "gim");
    const loopMatches = Array.from(code.matchAll(loopPattern));
    if (loopMatches.length) {
        return loopMatches[0][1]; // The captured loop body
    }
    return null;
};
exports.extractLoopBody = extractLoopBody;
//# sourceMappingURL=forLoopHelper.js.map