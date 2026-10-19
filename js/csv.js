window.MLC = window.MLC || {};

MLC.csv = {
  detectDelimiter(text) {
    const first = text.split(/\r?\n/, 1)[0];
    let best = ';', max = -1;
    for (const d of [';', ',', '\t']) {
      const n = first.split(d).length - 1;
      if (n > max) { max = n; best = d; }
    }
    return best;
  },

  // Parseur RFC 4180 (guillemets, retours à la ligne dans les champs)
  parse(text) {
    text = text.replace(/^﻿/, '');
    const delim = this.detectDelimiter(text);
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return { delim, rows: rows.filter((r) => r.some((v) => v.trim() !== '')) };
  },

  // Séparateur ";" + BOM : s'ouvre directement dans Excel en français
  stringify(rows, delim = ';') {
    const esc = (v) => {
      v = v == null ? '' : String(v);
      return /["\n\r;,\t]/.test(v) || v !== v.trim() ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    return '﻿' + rows.map((r) => r.map(esc).join(delim)).join('\r\n');
  },
};
