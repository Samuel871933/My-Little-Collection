(() => {
  const { norm, fetchJson, loadScript } = MLC.util;
  const COLORS = MLC.WINE_COLORS;
  const SWATCH = { R: '#7f1d2d', B: '#e9d98b', Ro: '#f4a6a6', E: '#f3e7b3', L: '#d99a2b' };

  // Illustration vectorielle locale : les données restent dans le navigateur.
  function bottleImage(it = {}) {
    const color = norm(it.couleur || '');
    const palette = /rose|rosado/.test(color) ? ['#e9b2a0', '#b96869', '#733f48']
      : /blanc|white/.test(color) ? ['#e8d995', '#9caa67', '#59653e']
      : /effervescent|mousseux|champagne/.test(color) ? ['#a6ae6b', '#455b39', '#a48a4f']
      : /liquoreux|moelleux|orange/.test(color) ? ['#edbe63', '#b77c30', '#835728']
      : /rouge|red/.test(color) ? ['#614039', '#252d24', '#7a293e']
      : ['#a8afa1', '#4b594f', '#657368'];
    const [light, dark, accent] = palette;
    const xml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[c]));
    const wrap = (value, max, limit) => {
      const words = String(value || '').trim().split(/\s+/), lines = [];
      let line = '';
      for (let word of words) {
        if (word.length > max) word = word.slice(0, max - 1) + '…';
        if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; }
        else line = line ? line + ' ' + word : word;
      }
      if (line) lines.push(line);
      if (lines.length > limit) lines[limit - 1] = lines[limit - 1].replace(/…$/, '').slice(0, max - 1) + '…';
      return lines.slice(0, limit);
    };
    const textLines = (value, y, size, max, limit) => wrap(value, max, limit).map((line, i) => `<text x="160" y="${y + i * (size + 4)}" text-anchor="middle" font-family="Georgia, serif" font-size="${size}" fill="#38332d">${xml(line)}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 440">
      <defs>
        <linearGradient id="glass"><stop stop-color="${dark}"/><stop offset=".25" stop-color="${light}"/><stop offset=".48" stop-color="${dark}"/><stop offset=".8" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient>
        <linearGradient id="foil"><stop stop-color="${accent}"/><stop offset=".35" stop-color="${light}"/><stop offset=".65" stop-color="${accent}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
        <linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fffcf2"/><stop offset="1" stop-color="#e9dfc8"/></linearGradient>
        <radialGradient id="shadow"><stop stop-color="#29231b" stop-opacity=".25"/><stop offset="1" stop-color="#29231b" stop-opacity="0"/></radialGradient>
      </defs>
      <ellipse cx="160" cy="416" rx="100" ry="15" fill="url(#shadow)"/>
      <path d="M137 44h46v80c0 23 45 35 45 76v192q0 19-19 19h-98q-19 0-19-19V200c0-41 45-53 45-76Z" fill="url(#glass)" stroke="${dark}" stroke-width="2"/>
      <path d="M106 207v178" stroke="#fff" stroke-opacity=".19" stroke-width="7" stroke-linecap="round"/>
      <rect x="136" y="37" width="48" height="87" rx="4" fill="url(#foil)"/>
      <path d="M139 69h42m-42 5h42" stroke="#fff" stroke-opacity=".25"/>
      <rect x="100" y="217" width="120" height="148" rx="2" fill="url(#paper)"/>
      <rect x="106" y="223" width="108" height="136" rx="1" fill="none" stroke="${accent}" stroke-opacity=".45"/>
      <path d="M148 239h24m-12-6v12" stroke="${accent}" stroke-width="1"/>
      ${textLines(it.producteur || 'Domaine à préciser', 258, 9, 22, 2)}
      <path d="M135 283h50" stroke="${accent}" stroke-opacity=".5"/>
      ${textLines(it.nom || 'Cuvée à préciser', 300, 12, 17, 2)}
      <text x="160" y="344" text-anchor="middle" font-family="Georgia, serif" font-size="19" fill="${accent}">${xml(it.millesime || '—')}</text>
      <text x="160" y="385" text-anchor="middle" font-family="sans-serif" font-size="8" letter-spacing="2" fill="#fff" fill-opacity=".65">${xml(it.couleur || 'VIN')}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Version "comparable" d'un texte : sans accents, tirets → espaces
  const key = (s) => ' ' + norm(s).replace(/[-'’_]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim() + ' ';

  const APPS = MLC.WINE_APPELLATIONS
    .map(([name, region, colors]) => ({ name, region, colors, k: key(name) }))
    .sort((a, b) => b.k.length - a.k.length); // les plus longues d'abord (« Saint-Émilion Grand Cru » avant « Saint-Émilion »)

  const findAppellation = (text) => {
    const k = key(text);
    return APPS.find((a) => k.includes(a.k)) || null;
  };

  const COLOR_WORDS = /\b(rouge|blanc|rose|red|white|tinto|rosso|bianco|blanco|rosado|rosato)\b/g;

  function detectColor(text) {
    const k = key(text);
    if (/ (rouge|red|tinto|rosso) /.test(k)) return 'R';
    if (/ (rose|rosado|rosato) /.test(k)) return 'Ro';
    if (/ (champagne|cremant|brut|petillant|mousseux|cava|prosecco|sparkling) /.test(k)) return 'E';
    if (/ (liquoreux|moelleux|vendanges tardives|grains nobles|sauternes|porto) /.test(k)) return 'L';
    if (/ (blanc|white|bianco|blanco) /.test(k)) return 'B';
    return null;
  }

  const yearOf = (text) => {
    const m = String(text).match(/\b(19[0-9]{2}|20[0-9]{2})\b/);
    return m ? Number(m[1]) : null;
  };

  const gardeOf = (app, c) => (app && app.colors[c]) || MLC.WINE_DEFAULT_GARDE[c];
  const gardeLabel = (app, c) => {
    const g = gardeOf(app, c);
    return g ? `garde ${g[0]}–${g[1]} ans` : '';
  };

  // Valeurs pré-remplies à partir d'une appellation + couleur
  function fill(app, colorCode) {
    const v = {};
    if (app) { v.appellation = app.name; v.region = app.region; }
    if (colorCode) {
      v.couleur = COLORS[colorCode];
      const g = gardeOf(app, colorCode);
      if (g) v.garde = g[1];
    }
    return v;
  }

  // --- Base X-Wines (100 000 vins, CC0), chargée à la demande ---------------
  let countryName;
  try { countryName = new Intl.DisplayNames(['fr'], { type: 'region' }); } catch (e) { /* navigateur ancien */ }

  let xw = null, xwPromise = null;
  function loadXWines() {
    return (xwPromise ||= loadScript('data/xwines.js', () => MLC.XWINES).then(() => {
      const D = MLC.XWINES;
      const perWinery = new Uint32Array(D.wineries.length); // nombre de vins par domaine
      D.wines.forEach((w) => { perWinery[w[1]]++; });
      xw = { D, perWinery, index: MLC.fuzzy.build(D.wines.map((w) => `${w[0]} ${D.wineries[w[1]]}`)) };
      return xw;
    }).catch((e) => { xwPromise = null; throw e; }));
  }

  // --- Index Open Food Facts (≈ 10 000 vins avec photo d'étiquette) --------
  // [code, nom, marque, chemin photo, couleur, catégories] — voir tools/build_off_wines.py
  const brandKey = (s) => key(s).replace(/ (chateau|domaine|maison|clos|cave|caves|vignobles|famille|les|de|du|des|la|le) /g, ' ').replace(/\s+/g, ' ').trim();
  // mots qui ne désignent aucun vin en particulier (« Vin rouge », « Vino tinto AOP »…)
  const GENERIC = / (vins?|wines?|vino|rouge|blanc|rose|red|white|tinto|blanco|rosso|bianco|rosado|rosato|brut|sec|aop|aoc|igp|doc|docg|pays|appellation|controlee|protegee|origine|bouteille|\d+ ?cl|de|du|des|la|le|les|d|l|et)(?= )/g;
  const isGenericName = (name) => !key(name).replace(/ (19|20)\d{2} /g, ' ').replace(GENERIC, ' ').trim();
  // sans marque et sans nom de cuvée, une fiche n'apporte rien de plus que l'appellation seule
  // (mot à mot, au singulier : « Cote du rhone » = appellation « Côtes du Rhône »)
  function isAnonymous([, name, brand, , , cats]) {
    const text = `${name} ${brand}`; // la marque est parfois l'appellation (« Champagne »)
    const words = (s) => key(s).replace(GENERIC, ' ').trim().split(' ').filter(Boolean).map((w) => w.replace(/s$/, ''));
    const app = findAppellation(text);
    const known = new Set(words(`${app ? app.name : ''} ${cats.join(' ')}`));
    return words(text).every((w) => known.has(w) || /^\d+$/.test(w));
  }
  let off = null, offPromise = null;
  function loadOffWines() {
    return (offPromise ||= loadScript('data/off-wines.js', () => MLC.OFFWINES).then(() => {
      const D = MLC.OFFWINES;
      const byBrand = new Map(); // marque normalisée → bouteilles (pour illustrer les vins X-Wines)
      const byCode = new Map();
      D.wines.forEach((w) => {
        byCode.set(w[0], w);
        const b = brandKey(w[2]);
        if (b.length < 4) return;
        if (!byBrand.has(b)) byBrand.set(b, []);
        byBrand.get(b).push(w);
      });
      const searchable = D.wines.filter((w) => !isAnonymous(w)); // les autres restent trouvables par code-barres
      off = { D, byBrand, byCode, searchable, index: MLC.fuzzy.build(searchable.map((w) => `${w[1]} ${w[2]}`)) };
      return off;
    }).catch((e) => { offPromise = null; throw e; }));
  }
  function fromOff(w) {
    const [code, name, brand, , color, cats] = w;
    let app = null;
    for (const c of cats) { app = APPS.find((a) => a.k === key(c)); if (app) break; }
    app = app || findAppellation(`${name} ${brand}`);
    const single = app && Object.keys(app.colors).length === 1 ? Object.keys(app.colors)[0] : null;
    const c = color || detectColor(name) || single;
    const year = yearOf(name);
    const brandInName = brand && key(name).includes(key(brand));
    const generic = brand && isGenericName(name); // « Vin rouge » de la marque X → « X »
    const title = !name || generic ? brand : brand && !brandInName ? `${name} – ${brand}` : name;
    return {
      title,
      subtitle: [app && app.name, c && COLORS[c], c && gardeLabel(app, c)].filter(Boolean).join(' · '),
      badge: 'Open Food Facts',
      values: {
        nom: !name || generic ? brand : name,
        producteur: brand,
        ...(year ? { millesime: year } : {}),
        ...fill(app, c),
        ...(app ? { pays: 'France' } : {}), // la base d'appellations est française
        ean: code,
      },
    };
  }

  function fromXWine(w) {
    const { D } = xw;
    const [name, wi, ri, type, grapes, abv] = w;
    const winery = D.wineries[wi];
    const [regionName, cc] = D.regions[ri];
    // l'appellation française se trouve souvent dans la région X-Wines ou dans le nom
    const app = (cc === 'FR' || !cc ? findAppellation(regionName) : null) || findAppellation(name) || findAppellation(regionName);
    const color = type || detectColor(name);
    const country = cc ? (countryName ? countryName.of(cc) : cc) : '';
    const cepages = grapes.map((g) => D.grapes[g]).join(', ');
    // beaucoup de cuvées s'appellent juste « Sauternes (Grand Cru Classé) » : le domaine fait partie du nom
    const wineryWords = key(winery).trim().split(' ').filter((w) => w.length > 3 && !['chateau', 'domaine'].includes(w));
    const fullName = !winery || wineryWords.some((w) => key(name).includes(` ${w} `)) ? name : `${winery} – ${name}`;
    const result = {
      title: fullName,
      subtitle: [app ? app.name : regionName, country, color && COLORS[color], color && gardeLabel(app, color)].filter(Boolean).join(' · '),
      badge: 'X-Wines',
      swatch: SWATCH[color],
      values: {
        nom: fullName,
        producteur: winery,
        appellation: app ? app.name : regionName,
        region: app ? app.region : regionName,
        pays: country,
        cepages,
        degre: abv || null,
        ...(color ? { couleur: COLORS[color], garde: (gardeOf(app, color) || [])[1] } : {}),
      },
    };
    return result;
  }

  // les mots tapés se suivent dans le nom du domaine ou du vin (« cheval blanc »)
  function phraseBoost(q, winery, name) {
    const phrase = key(q).trim();
    if (phrase.split(' ').length < 2) return 1;
    if (key(winery).includes(` ${phrase} `)) return 1.6;
    if (key(name).includes(` ${phrase} `)) return 1.35;
    return 1;
  }

  // X-Wines et Open Food Facts, fusionnés par score de pertinence
  async function catalogSearch(q) {
    const [, o] = await Promise.all([loadXWines(), loadOffWines().catch(() => null)]);
    const { D } = xw;
    xw.fr ||= D.regions.map((r) => r[1] === 'FR');
    const FLAGSHIP = / (premier grand cru|grand cru classe|grand vin|1er grand cru) /;
    const xwHits = MLC.fuzzy.search(xw.index, q, {
      limit: 150,
      boost: (id) => {
        const w = D.wines[id];
        return (xw.fr[w[2]] ? 1.05 : 1) * phraseBoost(q, D.wineries[w[1]], w[0]) * (FLAGSHIP.test(key(w[0])) ? 1.1 : 1);
      },
    }).map((h) => ({ score: h.score, get: () => fromXWine(D.wines[h.id]) }));
    // une bouteille précise passe devant à pertinence égale ; on écarte
    // celles qui ne correspondent qu'à une partie des mots quand X-Wines fait mieux
    const floor = (xwHits[0]?.score || 0) * 0.6;
    const offHits = o ? MLC.fuzzy.search(o.index, q, {
      limit: 40,
      boost: (id) => 1.02 * phraseBoost(q, o.searchable[id][2], o.searchable[id][1]),
    }).filter((h) => h.score >= floor).map((h) => ({ score: h.score, get: () => fromOff(o.searchable[h.id]) })) : [];
    return [...xwHits, ...offHits].sort((a, b) => b.score - a.score).map((h) => h.get());
  }

  // Suggestion générique issue de la base d'appellations (ex. « Sancerre blanc »)
  function appellationSuggestions(q) {
    const app = findAppellation(q);
    if (!app) return [];
    const color = detectColor(q);
    const year = yearOf(q);
    const codes = color && app.colors[color] ? [color] : Object.keys(app.colors);
    return codes.map((c) => ({
      title: `${app.name} ${COLORS[c].toLowerCase()}`,
      subtitle: [app.region, gardeLabel(app, c)].join(' · '),
      badge: 'Appellation',
      swatch: SWATCH[c],
      values: { ...(year ? { millesime: year } : {}), ...fill(app, c) },
    }));
  }

  // --- Open Food Facts (code-barres) ----------------------------------------
  const OFF_FIELDS = 'code,product_name,brands,quantity,categories_tags';

  function colorFromTags(tags = []) {
    const t = tags.join(' ');
    if (/en:(champagnes|sparkling-wines|cremants)/.test(t)) return 'E';
    if (/en:(sweet-wines|dessert-wines|fortified-wines)/.test(t)) return 'L';
    if (/en:rose-wines/.test(t)) return 'Ro';
    if (/en:white-wines/.test(t)) return 'B';
    if (/en:red-wines/.test(t)) return 'R';
    return null;
  }

  async function offByBarcode(code, signal) {
    const d = await fetchJson(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, { signal });
    if (d.status !== 1 || !d.product) return [];
    const p = d.product;
    const brands = String(p.brands || '').split(',').map((s) => s.trim()).filter(Boolean);
    const name = p.product_name || brands[0] || '';
    let app = null;
    for (const t of p.categories_tags || []) {
      app = APPS.find((a) => a.k === key(t.replace(/^[a-z]{2}:/, '')));
      if (app) break;
    }
    app = app || findAppellation(`${name} ${brands.join(' ')}`);
    const single = app && Object.keys(app.colors).length === 1 ? Object.keys(app.colors)[0] : null;
    const color = colorFromTags(p.categories_tags) || detectColor(name) || single;
    const year = yearOf(name);
    return [{
      title: name || '(sans nom)',
      subtitle: [brands.join(', '), p.quantity, app && app.name, color && COLORS[color]].filter(Boolean).join(' · '),
      badge: 'Open Food Facts',
      values: {
        nom: name,
        producteur: brands[0] || '',
        ...(year ? { millesime: year } : {}),
        ...fill(app, color),
        ean: code,
      },
    }];
  }

  const SWATCH_BY_NAME = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [v, SWATCH[k]]));

  MLC.registerType({
    id: 'wine',
    label: 'Cave à vin',
    icon: '🍷',
    description: 'Bouteilles, millésimes, potentiel de garde',
    ui: {
      theme: 'cellar',
      placeholder: bottleImage,
      defaultName: 'Ma cave',
      mark: '<path d="M8 3h8l-.4 5.6a3.6 3.6 0 0 1-7.2 0L8 3z"/><path d="M12 12.2V20M8.5 20h7"/>',
      noun: ['bouteille', 'bouteilles'],
      tagline: 'Votre cave, millésime par millésime.',
      pitch: "100 000 vins reconnus, même mal orthographiés, et 10 000 bouteilles du commerce. Appellation, cépages et potentiel de garde se remplissent seuls.",
      source: 'catalogue X-Wines & Open Food Facts',
      searchPlaceholder: 'Chercher dans la cave ou ajouter un vin…',
      examples: ['Rayne Vigneau 2015', 'Lynch Bages 2016', 'Sancerre blanc 2022', 'Dom Pérignon'],
      facets: ['couleur', 'statut', 'region'],
      sorts: [['_added', 'Ajout récent'], ['millesime', 'Millésime'], ['boire_avant', 'À boire avant'], ['nom', 'Nom'], ['valeur_actuelle', 'Valeur']],
      identity: ['nom', 'producteur', 'millesime'],
      gridMin: '230px',
      cardClass: 'overflow-hidden rounded-[3px] border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgb(43_20_24/.45)]',
      // fiche : liens vers les sites de cote, recherche pré-remplie (aucune donnée récupérée ici)
      links(it) {
        const name = [it.producteur && !norm(it.nom || '').includes(norm(it.producteur)) ? it.producteur : '', it.nom]
          .filter(Boolean).join(' ').replace(/[–—]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!name) return [];
        const year = /^\d{4}$/.test(String(it.millesime || '')) ? String(it.millesime) : '';
        const ws = norm(name).replace(/[^a-z0-9]+/g, '+').replace(/^\+|\+$/g, '');
        return [
          { label: 'Wine-Searcher', hint: 'prix chez les cavistes', url: `https://www.wine-searcher.com/find/${ws}${year ? `/${year}` : ''}` },
          { label: 'Vivino', hint: 'prix et notes', url: `https://www.vivino.com/search/wines?q=${encodeURIComponent([name, year].filter(Boolean).join(' '))}` },
        ];
      },
      extraStats(items, h) {
        const soon = items.filter((it) => /bientôt|cette année/.test(h.computed('statut_garde', it))).length;
        const over = items.filter((it) => h.computed('statut_garde', it) === 'Dépassé').length;
        return [{ value: soon, label: 'à boire bientôt' }, ...(over ? [{ value: over, label: 'garde dépassée' }] : [])];
      },
      card(it, h) {
        const sw = SWATCH_BY_NAME[it.couleur] || 'var(--line)';
        // bouteilles et étiquettes sont en portrait : affichées entières, fond blanc fondu dans le papier
        const img = h.img(it.image && it.image !== 'img/vin-placeholder.svg' ? it.image : bottleImage(it), 'h-full w-full object-contain p-3 mix-blend-multiply transition duration-700 group-hover:scale-[1.04] dark:mix-blend-normal');
        const place = it.appellation || it.region || '';
        return `
          <div class="relative aspect-[5/4] overflow-hidden bg-paper">
            ${img || `
              <div class="absolute inset-3 grid place-items-center border border-ink/15 px-4 text-center outline outline-1 -outline-offset-[6px] outline-ink/10">
                <div>
                  ${it.millesime
                    ? `<div class="text-[2.5rem] leading-none font-light tabular-nums">${h.esc(it.millesime)}</div>`
                    : `<svg class="mx-auto size-10 text-ink/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8l-.4 5.6a3.6 3.6 0 0 1-7.2 0L8 3z"/><path d="M12 12.2V20M8.5 20h7"/></svg>`}
                  ${place ? `<div class="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted">${h.esc(place)}</div>` : ''}
                </div>
              </div>`}
            <span class="absolute inset-y-0 left-0 w-1" style="background:${sw}"></span>
          </div>
          <div class="flex flex-1 flex-col gap-1 p-4">
            ${place || it.couleur ? `
            <p class="flex items-center gap-1.5 truncate text-[10.5px] uppercase tracking-[0.16em] text-muted">
              <span class="size-2 shrink-0 rounded-full ring-1 ring-ink/10" style="background:${sw}"></span>${[place, it.couleur].filter(Boolean).map(h.esc).join(' · ')}
            </p>` : ''}
            <h3 class="font-medium leading-snug">${h.esc(it.nom || 'Sans nom')}</h3>
            <p class="truncate text-sm italic text-muted">${h.esc(it.producteur || '')}</p>
            <div class="mt-auto flex items-end justify-between gap-2 pt-3">
              <div class="flex flex-col items-start gap-1">
                ${img && it.millesime ? `<span class="text-lg leading-none font-medium tabular-nums">${h.esc(it.millesime)}</span>` : ''}
                ${h.status(h.computed('statut_garde', it))}
              </div>
              ${h.stepper(it)}
            </div>
          </div>`;
      },
    },
    columns: [
      { key: 'image', label: 'Photo', type: 'image', priority: 2 },
      { key: 'nom', label: 'Nom du vin', type: 'text' },
      { key: 'millesime', label: 'Millésime', type: 'year', priority: 2 },
      { key: 'quantite', label: 'Quantité', type: 'number' },
      { key: 'valeur_achat', label: "Valeur d'achat", type: 'money', priority: 3 },
      { key: 'valeur_actuelle', label: 'Valeur actuelle', type: 'money', priority: 2 },
      { key: 'garde', label: 'Potentiel de garde (ans)', type: 'number', priority: 3 },
    ],
    // proposées dans « Colonnes », ajoutables en un clic (pré-remplies par la recherche)
    optionalColumns: [
      { key: 'producteur', label: 'Producteur / Domaine', type: 'text', priority: 3 },
      { key: 'couleur', label: 'Couleur', type: 'text', options: Object.values(COLORS), priority: 4 },
      { key: 'appellation', label: 'Appellation', type: 'text', priority: 3 },
      { key: 'region', label: 'Région', type: 'text', priority: 4 },
      { key: 'pays', label: 'Pays', type: 'text', priority: 4 },
      { key: 'cepages', label: 'Cépages', type: 'text', priority: 4 },
      { key: 'degre', label: 'Degré (% vol.)', type: 'number', priority: 4 },
      { key: 'boire_avant', label: 'À boire avant', type: 'year', computed: 'boire_avant', priority: 3 },
      { key: 'statut', label: 'Statut', type: 'status', computed: 'statut_garde', priority: 3 },
      { key: 'emplacement', label: 'Emplacement', type: 'text', priority: 4 },
      { key: 'notes', label: 'Notes', type: 'text', priority: 4 },
      { key: 'ean', label: 'Code-barres', type: 'text', priority: 4 },
    ],
    provider: {
      placeholder: 'Ex. « Rayne Vigneau 2015 », « Lynch Bages », « Sancerre blanc » ou un code-barres',
      help: "Recherche tolérante aux fautes dans 100 000 vins (base libre X-Wines) et 10 000 bouteilles du commerce (Open Food Facts) : domaine, appellation, couleur, cépages et potentiel de garde estimé. Un code-barres est d'abord cherché localement, puis sur Open Food Facts. Aucune source gratuite ne donne la cote : la fiche propose des liens Wine-Searcher et Vivino pour la retrouver.",
      prepare: () => Promise.all([loadXWines(), loadOffWines()]).catch(() => {}),
      // pastilles de filtre proposées dans la liste de résultats
      resultFacets: [['couleur', 'Couleur'], ['appellation', 'Appellation'], ['pays', 'Pays']], // préchargement à l'ouverture de la fiche
      async search(q, signal) {
        q = q.trim();
        if (/^\d{8,14}$/.test(q)) {
          const local = await loadOffWines().then((o) => o.byCode.get(q.padStart(13, '0')) || o.byCode.get(q)).catch(() => null);
          return local ? [fromOff(local)] : offByBarcode(q, signal);
        }
        const year = yearOf(q);
        const color = detectColor(q);
        // tous les mots comptent (« Cheval Blanc ») ; sans résultat, on retente sans les mots de couleur
        const words = norm(q).replace(/\b(19|20)\d{2}\b/g, ' ');
        let results = await catalogSearch(words);
        if (!results.length && color) results = await catalogSearch(words.replace(COLOR_WORDS, ' '));
        // couleur demandée explicitement : on la privilégie, sauf si le mot fait partie
        // d'un nom (« Cheval Blanc » est un domaine, pas une couleur)
        const phrase = ` ${key(words).trim()} `;
        const isName = results.some((r) => key(r.values.producteur || '').includes(phrase) || key(r.values.nom || '').includes(phrase));
        if (color && !isName) results = [...results.filter((r) => r.values.couleur === COLORS[color]), ...results.filter((r) => r.values.couleur !== COLORS[color])];
        results = [...results, ...appellationSuggestions(q)];
        if (year) results.forEach((r) => { // load() réutilise r.values
          r.values.millesime = year;
          r.title = r.title.replace(/\s*\b(19|20)\d{2}\b/g, '') + ` ${year}`;
        });
        return results;
      },
    },
  });
})();
