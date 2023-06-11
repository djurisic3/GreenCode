import * as vscode from "vscode";

let loginData:
  | { host: string; user: string; password: string; database: string }
  | undefined;

export async function getLoginDataMySql() {
  if (loginData) {
    return loginData;
  }

  const host = await vscode.window.showInputBox({ prompt: "Enter MySQL host" });
  const user = await vscode.window.showInputBox({ prompt: "Enter MySQL user" });
  const password = await vscode.window.showInputBox({
    prompt: "Enter MySQL password",
    password: true,
  });
  const database = await vscode.window.showInputBox({
    prompt: "Enter MySQL database",
  });

  if (!host || !user || !password || !database) {
    vscode.window.showErrorMessage("Missing input");
    return undefined;
  }

  loginData = { host, user, password, database };
  return loginData;
}