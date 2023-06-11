import * as vscode from "vscode";
import * as primKeysHelper from "./primaryKeyHelper";

let loginData:
  | { user: string; password: string; connectionString: string }
  | undefined;

loginData = {
  user: "system",
  password: "m1d2e3j4",
  connectionString: "localhost:1521",
};

export class sqlImplicitJoinHover implements vscode.HoverProvider {
  currentImplicitSql: string | undefined;
  currentImplicitSqlRange: vscode.Range | undefined;

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    let text = document.getText();
    let matches = text.matchAll(
      /\bSELECT\b\s+((?:(?!SELECT|UPDATE|DELETE|INSERT)[\s\S])*?)\bFROM\b\s+((\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*)(\s+(WHERE\s+((\w+(\.\w+)?\s*=\s*\w+(\.\w+)?)(\s+(AND|OR)\s+(\w+(\.\w+)?\s*=\s*\w+(\.\w+)?))*))?)(\s*;)?\s*$/gim
    );

    for (const match of matches) {
      let implicitJoinStart = match.index!;
      let implicitJoinEnd = implicitJoinStart + match[0].length;
      let range = new vscode.Range(
        document.positionAt(implicitJoinStart),
        document.positionAt(implicitJoinEnd)
      );
      if (range.contains(position)) {
        this.currentImplicitSql = match[0];
        this.currentImplicitSqlRange = range;
        let markdownString = new vscode.MarkdownString(
          `Click [here](command:greencode.cleanMarkedCode) to make your code greener or press ctrl + space.`
        );
        markdownString.isTrusted = true;
        return new vscode.Hover(markdownString);
      }
    }
  }
}

export class sqlExplicitJoinHover implements vscode.HoverProvider {
  currentExplicitSql: string | undefined;
  currentExplicitSqlRange: vscode.Range | undefined;

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    let text = document.getText();
    let matches = text.matchAll(
      /\bSELECT\b\s*(?:(?!\bFROM\b).)*(?:\bFROM\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?(\s*,\s*(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?)*\s+)((?:\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))(?:\s*\b(?:INNER\s+)?JOIN\b\s+(\w+(\.\w+)?)(\s+(AS\s+)?\w+)?\s+\bON\b\s+(((\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+'))(\s*(AND|OR)\s*(\w+(\.\w+)?\s*=\s*(?:\w+(\.\w+)?|'(?:\s|\w)+')))*)))*)+(\s*;)?\s*$/gim
    );

    for (const match of matches) {
      if (match.index !== undefined && match.input !== undefined) {
        let implicitJoinStart = match.index;
        let implicitJoinEnd = implicitJoinStart + match[0].length;
        let range = new vscode.Range(
          document.positionAt(implicitJoinStart),
          document.positionAt(implicitJoinEnd)
        );

        if (range.contains(position)) {
          this.currentExplicitSql = match[0];
          this.currentExplicitSqlRange = range;
          let matchJoinOn = match[10] === undefined ? "" : match[10].toString();

          return primKeysHelper
            .checkExplicitPrimKeys(
              loginData!,
              match as RegExpExecArray,
              matchJoinOn
            )
            .then(
              ([
                tablePrimKeys,
                isPrimaryKeyAbsentExplicit,
                isValidExplicitSql,
              ]) => {
                if (isValidExplicitSql && isPrimaryKeyAbsentExplicit) {
                  let markdownString = new vscode.MarkdownString(
                    `Click [here](command:greencode.cleanMarkedCode) to make your code greener or press ctrl + space.`
                  );
                  markdownString.isTrusted = true;
                  return new vscode.Hover(markdownString);
                }
                return undefined;
              }
            );
        }
      }
    }
    return undefined;
  }
}
