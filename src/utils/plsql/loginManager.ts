import * as vscode from "vscode";

let loginData:
  | { user: string; password: string; connectionString: string }
  | undefined;

export async function getLoginDataPlSql() {
  if (loginData) {
    return loginData;
  }

  const user = await vscode.window.showInputBox({ prompt: "Enter PL/SQL user" });
  const password = await vscode.window.showInputBox({
    prompt: "Enter PL/SQL password",
    password: true,
  });
  const connectionString = await vscode.window.showInputBox({
    prompt: "Enter PL/SQL server and port",
  });

  if (!user || !password || !connectionString) {
    return undefined;
  }

  loginData = { user, password, connectionString };
  return loginData;
}