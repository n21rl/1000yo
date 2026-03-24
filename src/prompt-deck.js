const cleanPromptText = (value = "") => String(value).replace(/\s+/g, " ").trim();

export const parseCsv = (csvText = "") => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const source = String(csvText).replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char === "\r") continue;
    field += char;
  }

  row.push(field);
  rows.push(row);
  return rows.filter((candidate) => candidate.some((value) => String(value).trim()));
};

export const parsePromptDeck = (csvText = "") => {
  const rows = parseCsv(csvText);
  if (!rows.length) return [];
  const [firstRow, ...remainingRows] = rows;
  const hasHeader = firstRow.slice(0, 3).map((value) => cleanPromptText(value).toLowerCase()).join("|") === "a|b|c";
  const dataRows = hasHeader ? remainingRows : rows;
  return dataRows
    .map((row) => ({ a: cleanPromptText(row[0] ?? ""), b: cleanPromptText(row[1] ?? ""), c: cleanPromptText(row[2] ?? "") }))
    .filter((prompt) => Boolean(prompt.a || prompt.b || prompt.c));
};

export const getPromptEntry = (prompt, visitCount) => {
  if (!prompt) return "";
  if (visitCount === 1) return prompt.a;
  if (visitCount === 2) return prompt.b;
  if (visitCount === 3) return prompt.c;
  return "";
};

export const hasPromptEntryForVisit = (prompt, visitCount) => Boolean(getPromptEntry(prompt, visitCount));

export const clampPromptIndex = (index, deckLength) => {
  if (!deckLength) return 1;
  return Math.max(1, Math.min(index, deckLength));
};
