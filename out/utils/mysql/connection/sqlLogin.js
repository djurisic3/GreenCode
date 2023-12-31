"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoginData = void 0;
const vscode = require("vscode");
let loginData;
async function getLoginData() {
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
exports.getLoginData = getLoginData;
//# sourceMappingURL=sqlLogin.js.map