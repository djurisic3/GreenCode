"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoginData = void 0;
const vscode = require("vscode");
let loginData;
async function getLoginData() {
    if (loginData) {
        return loginData;
    }
    const user = await vscode.window.showInputBox({ prompt: "Enter PL/SQL user" });
    const password = await vscode.window.showInputBox({
        prompt: "Enter PL/SQL password",
        password: true,
    });
    const connectionString = await vscode.window.showInputBox({
        prompt: "Enter PL/SQL database",
    });
    if (!user || !password || !connectionString) {
        vscode.window.showErrorMessage("Missing input");
        return undefined;
    }
    loginData = { user, password, connectionString };
    return loginData;
}
exports.getLoginData = getLoginData;
//# sourceMappingURL=loginManager.js.map