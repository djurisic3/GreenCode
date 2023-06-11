document.getElementById("suggestIndexesBtn").addEventListener("click", () => {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      command: "suggestIndexes"
    });
  });