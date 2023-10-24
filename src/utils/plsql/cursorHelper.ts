import * as vscode from "vscode";

export function isCursorOnImpJoin(positionSql: vscode.Position) {
  let currentSql: string | undefined;
  const editor = vscode.window.activeTextEditor;
  const document = editor!.document;
  let text = document.getText();

  let matches = text!.matchAll(
    /\bSELECT\b\s+((?:(?!SELECT|UPDATE|DELETE|INSERT)[\s\S])*?)\bFROM\b\s+((\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*)(\s+(WHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*))?)(?=\s*;|\s*\))/gim
  );

  for (const match of matches) {
    let start = match.index!;
    let end = start + match[0].length;
    let range = new vscode.Range(
      document.positionAt(start),
      document.positionAt(end)
    );

    if (range.contains(positionSql)) {
      currentSql = match[0];
      return [currentSql, range];
    }
  }
}

export function isCursorOnStarForLoop(
  positionSql: vscode.Position
): [string, vscode.Range, vscode.Range] | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  const document = editor.document;
  const text = document.getText();

  let matches = text.matchAll(
    /for\s+([a-zA-Z0-9_]+)\s+in\s*\(\s*(select\s+(?:[a-zA-Z0-9_]+\.\*)?\s*\*?\s+from\s+[a-zA-Z0-9_]+.*?)(?=\s*\)\s+loop)/gim
  );

  for (const match of matches) {
    const loopStart = match.index!; // Start of the 'select' statement
    const loopEnd = loopStart + match[0].length; // End of the 'select' statement
    const loopRange = new vscode.Range(
      document.positionAt(loopStart),
      document.positionAt(loopEnd)
    );

    const selectStart = loopStart + match[0].indexOf(match[2]);
    const selectEnd = selectStart + match[2].length;
    const selectRange = new vscode.Range(
      document.positionAt(selectStart),
      document.positionAt(selectEnd)
    );

    if (loopRange.contains(positionSql)) {
      return [match[2], loopRange, selectRange]; // Return only the 'select' statement and its range
    }
  }

  return undefined;
}

export function isCursorOnExpJoin(positionSql: vscode.Position) {
  let currentSql: string | undefined;
  const editor = vscode.window.activeTextEditor;
  const document = editor!.document;
  let text = document.getText();

  let matches = text!.matchAll(
    /\bSELECT\b\s*(?:(?!\bFROM\b).)*(?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+)((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))*)+(\s*;)?\s*$/gim
  );

  for (const match of matches) {
    let start = match.index!;
    let end = start + match[0].length;
    let range = new vscode.Range(
      document.positionAt(start),
      document.positionAt(end)
    );

    if (range.contains(positionSql)) {
      currentSql = match[0];
      return [currentSql.trim(), range];
    }
  }
}
