window.MLC = window.MLC || {};

/*
 * Recherche approximative "à l'oreille" (orthographe française approximative,
 * fautes de frappe, mots incomplets). Index inversé sur des clés phonétiques.
 *   const idx = MLC.fuzzy.build(['Château de Rayne Vigneau', ...]);
 *   MLC.fuzzy.search(idx, 'reine vignaux') → [{ id, score }]
 */
MLC.fuzzy = (() => {
  const STOP = new Set(['chateau', 'chateaux', 'ch', 'domaine', 'dom', 'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'en', 'the', 'of', 'y', 'a', 'au', 'aux', 'di', 'del', 'della', 'da', 'do', 'dos', 'das', 'von', 'van', 'and']);
  const ABBR = { st: 'saint', ste: 'sainte' };

  // Clé phonétique simplifiée (français) : rayne / reine → "ren", vigneau / vignaux → "vino"
  function phon(t) {
    let s = t
      .replace(/ch/g, 'x').replace(/ph/g, 'f').replace(/qu/g, 'k').replace(/gu(?=[eiy])/g, 'g')
      .replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k')
      .replace(/gn/g, 'n').replace(/eaux|eau|aux|au/g, 'o').replace(/ai|ei|ay|ey/g, 'e')
      .replace(/y/g, 'i').replace(/z/g, 's').replace(/w/g, 'v').replace(/h/g, '')
      .replace(/[ae]n|[ae]m(?=[bp])/g, 'an')
      .replace(/(.)\1+/g, '$1');
    const stripped = s.replace(/[estxd]+$/, '');
    return stripped.length >= 2 ? stripped : s;
  }

  function tokens(text) {
    return MLC.util.norm(text)
      .replace(/['’`]/g, ' ').split(/[^a-z0-9]+/)
      .map((t) => ABBR[t] || t)
      .filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t));
  }

  // Distance de Levenshtein bornée (renvoie max + 1 au-delà)
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let rowMin = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  const tolerance = (len) => (len <= 3 ? 0 : len <= 5 ? 1 : 2);

  function build(texts) {
    const postings = new Map(); // clé phonétique → [ids]
    const lens = new Uint8Array(texts.length);
    texts.forEach((text, id) => {
      const keys = new Set(tokens(text).map(phon));
      lens[id] = Math.min(keys.size, 255);
      for (const k of keys) {
        let p = postings.get(k);
        if (!p) postings.set(k, (p = []));
        p.push(id);
      }
    });
    return { postings, vocab: [...postings.keys()], lens };
  }

  function search(index, query, { limit = 30, boost } = {}) {
    const qkeys = [...new Set(tokens(query).map(phon))];
    if (!qkeys.length) return [];
    // pour chaque mot de la requête : meilleure qualité de correspondance par document
    const perDoc = new Map(); // id → { hits, quality }
    for (const q of qkeys) {
      const tol = tolerance(q.length);
      const best = new Map();
      for (const v of index.vocab) {
        let quality = 0;
        if (v === q) quality = 1;
        else if (q.length >= 3 && v.startsWith(q)) quality = 0.75; // mot en cours de frappe
        else {
          const d = lev(q, v, tol);
          if (d <= tol) quality = 1 - 0.2 * d;
        }
        if (!quality) continue;
        for (const id of index.postings.get(v)) if ((best.get(id) || 0) < quality) best.set(id, quality);
      }
      for (const [id, quality] of best) {
        const e = perDoc.get(id);
        if (e) { e.hits++; e.quality += quality; } else perDoc.set(id, { hits: 1, quality });
      }
    }
    // tous les mots doivent correspondre ; à défaut on accepte le meilleur recouvrement partiel
    let maxHits = 0;
    for (const e of perDoc.values()) if (e.hits > maxHits) maxHits = e.hits;
    if (maxHits < Math.ceil(qkeys.length / 2)) return [];
    const res = [];
    for (const [id, e] of perDoc) {
      if (e.hits < maxHits) continue;
      // la qualité (exact > faute de frappe) prime ; la part du nom couverte départage
      const q = e.quality / qkeys.length;
      const coverage = e.hits / Math.max(index.lens[id], e.hits);
      res.push({ id, score: q * q * (0.85 + 0.15 * coverage) * (boost ? boost(id) : 1) });
    }
    res.sort((a, b) => b.score - a.score);
    return res.slice(0, limit);
  }

  return { phon, tokens, lev, build, search };
})();
