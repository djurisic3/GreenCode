"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoginDataPlSql = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
let connectionStrings = [];
function loadConnectionStrings() {
    const file = path.join(__dirname, "connections.json");
    if (fs.existsSync(file)) {
        try {
            const data = fs.readFileSync(file, "utf8");
            connectionStrings = JSON.parse(data);
        }
        catch (error) {
            console.error("Error reading connectionStrings.json:", error);
            vscode.window.showErrorMessage("Error loading connection strings.");
        }
    }
}
async function saveConnectionString(newConnectionString) {
    connectionStrings.push(newConnectionString);
    const file = path.join(__dirname, "connections.json");
    fs.writeFileSync(file, JSON.stringify(connectionStrings, null, 2));
}
let loginData;
async function getLoginDataPlSql() {
    if (loginData) {
        return loginData;
    }
    loadConnectionStrings();
    let connectionString;
    if (connectionStrings.length === 0) {
        // Directly prompt for a new connection string if none exist
        connectionString = await vscode.window.showInputBox({
            prompt: "Enter PL/SQL server and port",
        });
        if (connectionString) {
            const label = await vscode.window.showInputBox({
                prompt: "Enter a label for this connection",
            });
            if (label) {
                await saveConnectionString({ connectionString, label });
            }
        }
    }
    else {
        // Offer to choose from existing strings or add a new one
        const pickOptions = connectionStrings.map((c) => ({
            label: c.label,
            connectionString: c.connectionString,
        }));
        pickOptions.push({
            label: "Enter a new connection string",
            connectionString: "",
        });
        const choice = await vscode.window.showQuickPick(pickOptions, {
            placeHolder: "Choose a connection string or enter a new one",
        });
        if (choice) {
            if (choice.connectionString === "") {
                // New connection string
                connectionString = await vscode.window.showInputBox({
                    prompt: "Enter PL/SQL server and port",
                });
                if (connectionString) {
                    const label = await vscode.window.showInputBox({
                        prompt: "Enter a label for this connection",
                    });
                    if (label) {
                        await saveConnectionString({ connectionString, label });
                    }
                }
            }
            else {
                connectionString = choice.connectionString;
            }
        }
    }
    if (!connectionString) {
        return undefined; // Exit if no connection string is selected or entered
    }
    const user = await vscode.window.showInputBox({
        prompt: "Enter PL/SQL user",
    });
    if (!user) {
        return undefined; // User cancelled the user input
    }
    const password = await vscode.window.showInputBox({
        prompt: "Enter PL/SQL password",
        password: true,
    });
    if (!password) {
        return undefined; // User cancelled the password input
    }
    loginData = { user, password, connectionString };
    return loginData;
}
exports.getLoginDataPlSql = getLoginDataPlSql;
//# sourceMappingURL=loginManager.js.map