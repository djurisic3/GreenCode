"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertJoinToJoinWithPrimKeys = void 0;
function convertJoinToJoinWithPrimKeys(text) {
    // Get the text within the current for loop
    // Convert for loop with range
    text = text.replace(/\bSELECT\b\s+([\s\S]*?)\bFROM\b\s+((\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*)(\s+(WHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*))?)(\s*;)?\s*$/gim, "works idiot");
    return text;
}
exports.convertJoinToJoinWithPrimKeys = convertJoinToJoinWithPrimKeys;
//# sourceMappingURL=conversions.js.map