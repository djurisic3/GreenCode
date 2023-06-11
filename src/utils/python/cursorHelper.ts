import * as vscode from "vscode";

export function isCursorOnForLoop(positionFor: vscode.Position) {
  let currentForLoop: string | undefined;
  const editor = vscode.window.activeTextEditor;
  const document = editor!.document;
  let text = document.getText();

  let matches = text!.matchAll(/for.*:\s*(\w+)\.(\w+)\((.*)\)/g); // promijenuti da bude append petlja
  let matchesDict = text!.matchAll(
    /for\s+(\w+)\s+in\s+(\w+)\.keys\(\)\s*:[\s\S]*(\w+)\s*=\s*\2\[\1\]/g
  );
  let matchesString = text!.matchAll(
    /(\w+)\s*=\s*""\s*[\s\S]*for\s*(\w+)\s*in\s*(\w+):\s*\1\s*(\+\=|=)\s*\1\s*\+\s*\2\s*/gim
  );
  let matchesForIn = text!.matchAll(
    /for\s*(\w+)\s*(\w+)\s*(\w\S*):\s*if\s*(\1)\s*(not|\s*)\s*in\s*(\w+):\s*(\6)\.(\w+)\((\1)\)/gim
  );

  for (const match of matches) {
    let start = match.index!;
    let end = start + match[0].length;
    let range = new vscode.Range(
      document.positionAt(start),
      document.positionAt(end)
    );

    if (range.contains(positionFor)) {
      currentForLoop = match[0];
      return currentForLoop;
    }
  }

  for (const match of matchesDict) {
    let start = match.index!;
    let end = start + match[0].length;
    let range = new vscode.Range(
      document.positionAt(start),
      document.positionAt(end)
    );

    if (range.contains(positionFor)) {
      currentForLoop = match[0];
      return currentForLoop;
    }
  }

  for (const match of matchesString) {
    let startIndex = match.index! + match[0].indexOf("for");
    let start = startIndex;
    let end = start + match[0].length;
    let range = new vscode.Range(
      document.positionAt(start),
      document.positionAt(end)
    );
    if (range.contains(positionFor)) {
      currentForLoop = match[0];
      return currentForLoop;
    }
  }

  for (const match of matchesForIn) {
    let start = match.index!;
    let end = start + match[0].length;
    let range = new vscode.Range(
      document.positionAt(start),
      document.positionAt(end)
    );
    if (range.contains(positionFor)) {
      currentForLoop = match[0];
      return currentForLoop;
    }
  }
}

export function isCursorOnCsv(positionCsv: vscode.Position) {
  let currentCsv: string | undefined;
  const editor = vscode.window.activeTextEditor;
  const document = editor!.document;
  let text = document.getText();

  let matches = text!.matchAll(/\b.*\.read_csv/g);

  for (const match of matches) {
    let start = match.index!;
    let end = start + match[0].length;
    let range = new vscode.Range(
      document.positionAt(start),
      document.positionAt(end)
    );

    if (range.contains(positionCsv)) {
      currentCsv = match[0];
      return currentCsv;
    }
  }
}

export function isCursorOnMiscellaneous(positionFor: vscode.Position) {
  let currentForLoop: string | undefined;
  const editor = vscode.window.activeTextEditor;
  const document = editor!.document;
  let text = document.getText();

  let matches = text!.matchAll(/(\w+)\.sort\(\)/g); // promijenuti da bude append petlja

  for (const match of matches) {
    let start = match.index!;
    let end = start + match[0].length;
    let range = new vscode.Range(
      document.positionAt(start),
      document.positionAt(end)
    );

    if (range.contains(positionFor)) {
      currentForLoop = match[0];
      return currentForLoop;
    }
  }
}
