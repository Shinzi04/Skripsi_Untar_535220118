const parseCSV = (text) => {
  const rows = [];
  let i = 0,
    field = "",
    row = [],
    inQuotes = false;
  const pushField = () => {
    row.push(field.trim());
    field = "";
  };

  const pushRow = () => {
    if (row.length) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === ",") {
        pushField();
      } else if (c === "\n") {
        pushField();
        pushRow();
      } else if (c === "\r") {
        if (text[i + 1] === "\n") i++;
        pushField();
        pushRow();
      } else if (c === '"') {
        inQuotes = true;
      } else {
        field += c;
      }
    }
    i++;
  }

  if (field.length || row.length) {
    pushField();
    pushRow();
  }

  if (!rows.length) return { header: [], data: [] };
  const header = rows[0].map((h) => h.trim());
  const data = rows.slice(1).filter((r) => r.some((x) => x !== ""));
  return { header, data };
};


const pick = (obj, keys) => {
  const out = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
}

export { parseCSV, pick };  

