
export function convertForLoopToComprehensionPy(text: string) {
  // Get the text within the current for loop

  // Convert for loop with range
  text = text.replace(
    /for (.*) in range\((\d+),(\d+)\):\s*(\w+)\.(\w+)\((.*)\)/g,
    "$4 += [$6 for $1 in range($2,$3)]"
  );

  // Convert for loop with extend
  text = text.replace(
    /for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*):\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\.extend\s*\(([^)]+)\)/g,
    "$3 += [$4 for $1 in $2]"
  );

  // Convert for loop with list
  text = text.replace(
    /for (.*) in (\[.*\]):\s*(\w+)\.(\w+)\((.*)\)/g,
    "$4 += [$5 for $1 in $2]"
  );

  // Convert for loop with string
  text = text.replace(
    /for (.*) in "(.*)":\s*(\w+)\.(\w+)\((.*)\)/g,
    '$4 += [$5 for $1 in "$2"]'
  );

  // Convert for loop with variable (append)
  text = text.replace(
    /for (.*) in (.*):\s*(\w+)\.append\((.*)\)/g,
    "$3 += [$4 for $1 in $2]"
  );

  text = text.replace(
    /for\s+(\w+)\sin\s+(\w+):\s+(\w+)\s*(\+\=|=)\s*(\3)\s*\+\s*(\1)/g,
    "$3 = ''.join($2)"
  );

  // Convert list.sort() to sorted(list)
  text = text.replace(/(\w+)\.sort\(\)/g, 
    "sorted($1)");

  // Convert for loop that checks if elements are in the list
  text = text.replace(
    /for\s*(\w+)\s*(\w+)\s*(\w\S*):\s*if\s*(\1)\s*(not|\s*)\s*in\s*(\w+):\s*(\6)\.(\w+)\((\1)\)/g,
    "$7 = list(set(($3)))"
  );

  //Convert for loop with dictionary
  text = text.replace(
    /for\s+(\w+)\s+in\s+(\w+)\.keys\(\)\s*:[\s\S]*(\w+)\s*=\s*\2\[\1\]/g,
    "for $1, $3 in $2.items():"
  );

  return text;
}

export function convertMiscellaneous(code: string) {
  code = code.replace(/(\w+)\.sort\(\)/g,
  "$1 = sorted($1)");
  return code;
}

export function convertCsv(code: string) {
  code = code.replace(/\b.*\.read_csv/g, "csv.reader");
  return code;
}

export function convertAndImportCsv(code: string) {
  if (code.includes("import csv")) {
    return code;
  } else {
    let importCsv = "import csv\n\n";
    code = code.replace(/\b.*\.read_csv/g, "csv.reader");
    code = importCsv.concat(code);
  }
  return code;
}

export function convertAllPy(text: string) {
  // Get the text within the current for loop
  let replacedText: string;
  replacedText = convertForLoopToComprehensionPy(text);
  replacedText = convertAndImportCsv(replacedText);

  return replacedText;
}
