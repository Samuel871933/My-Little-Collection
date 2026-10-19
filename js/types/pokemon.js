(() => {
  const { fetchJson, loadScript } = MLC.util;
  // TCGdex : API libre, gratuite, sans clé, avec prix Cardmarket (EUR)
  const BASE = 'https://api.tcgdex.net/v2';
  const API = `${BASE}/fr`;
  const LANGS = ['fr', 'en', 'de', 'it', 'es', 'pt'];

  let setsPromise;
  const sets = () => (setsPromise ||= fetchJson(`${API}/sets`)
    .then((a) => Object.fromEntries(a.map((s) => [s.id, s])))
    .catch(() => { setsPromise = null; return {}; }));

  const setIdOf = (card) => card.id.slice(0, card.id.length - String(card.localId).length - 1);

  function price(card, variante) {
    const cm = card.pricing && card.pricing.cardmarket;
    if (!cm) return null;
    const holo = /holo|reverse/i.test(variante || '') || (card.variants && !card.variants.normal && card.variants.holo);
    const p = holo ? (cm['trend-holo'] || cm['avg-holo'] || cm.trend) : (cm.trend || cm.avg);
    return p || null; // 0 = pas de cote connue
  }

  function defaultVariant(card) {
    const v = card.variants || {};
    if (v.normal) return 'Normale';
    if (v.holo) return 'Holo';
    if (v.reverse) return 'Reverse';
    if (v.firstEdition) return '1re édition';
    return '';
  }

  // Certaines cartes n'ont pas encore d'image en français : on se rabat sur l'anglais
  async function imageOf(c) {
    if (c.image) return `${c.image}/high.webp`;
    try {
      const en = await fetchJson(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(c.id)}`);
      return en.image ? `${en.image}/high.webp` : '';
    } catch (e) { return ''; }
  }

  async function detail(id, lang = 'fr') {
    const c = await fetchJson(`${BASE}/${lang}/cards/${encodeURIComponent(id)}`);
    const variante = defaultVariant(c);
    return {
      nom: c.name,
      extension: c.set ? c.set.name : '',
      numero: c.set && c.set.cardCount ? `${c.localId}/${c.set.cardCount.official}` : c.localId,
      rarete: c.rarity || '',
      variante,
      langue: lang.toUpperCase(),
      valeur_actuelle: price(c, variante),
      illustrateur: c.illustrator || '',
      image: await imageOf(c),
      tcgdex_id: c.id,
    };
  }

  // --- Index local de toutes les cartes (data/pokemon-cards.js, généré par tools/build_pokemon.py)
  // recherche instantanée, tolérante aux fautes, en 6 langues, avec rareté / extension / série / année
  const LANG_OF = { f: 'fr', e: 'en', d: 'de', i: 'it', s: 'es', p: 'pt' };
  let tcg = null, tcgPromise = null;
  function loadCards() {
    return (tcgPromise ||= loadScript('data/pokemon-cards.js', () => MLC.TCG).then(() => {
      const D = MLC.TCG;
      const cards = D.cards.map(([localId, si, ri, ci, langs, names]) => {
        const [setId, setName, serie, serieId, year] = D.sets[si];
        const per = {}; // langue → { name, image }
        let prev = '';
        [...langs].forEach((ch, i) => {
          prev = names[i] || prev;
          per[LANG_OF[ch.toLowerCase()]] = { name: prev, image: ch !== ch.toLowerCase() };
        });
        return { id: `${setId}-${localId}`, localId, setId, setName, serie, serieId, year, per,
          rarity: D.rarities[ri] || '', category: D.categories[ci] || '' };
      });
      const index = MLC.fuzzy.build(cards.map((c) => [...new Set(Object.values(c.per).map((p) => p.name))].join(' ')));
      tcg = { cards, index };
      return tcg;
    }).catch((e) => { tcgPromise = null; throw e; }));
  }

  const imgUrl = (c, lang, size) => `${MLC.TCG.img}${lang}/${c.serieId}/${c.setId}/${c.localId}/${size}.webp`;

  // le nom contient-il (phonétiquement) tous les mots tapés ?
  const keys = (s) => MLC.fuzzy.tokens(s).map(MLC.fuzzy.phon);
  const matches = (name, qk) => { const nk = keys(name); return qk.every((k) => nk.some((n) => n.startsWith(k))); };

  function fromCard(c, q) {
    const langs = Object.keys(c.per);
    const imgLang = ['fr', ...langs].find((l) => c.per[l]?.image);
    const fr = c.per.fr?.name;
    // nom tapé dans une autre langue (« Charizard ») : on l'affiche à côté du nom français
    const qk = keys(q);
    const typed = fr && !matches(fr, qk) && Object.values(c.per).map((p) => p.name).find((n) => matches(n, qk));
    const title = fr ? (typed ? `${fr} (${typed})` : fr) : Object.values(c.per)[0].name;
    return {
      title,
      subtitle: [c.setName, c.localId, c.rarity, c.year].filter(Boolean).join(' · '),
      image: imgLang ? imgUrl(c, imgLang, 'low') : null,
      facets: {
        extension: c.setName, serie: c.serie, rarete: c.rarity, categorie: c.category, annee: c.year,
        langue: langs.map((l) => l.toUpperCase()),
      },
      // langue choisie dans les filtres, sinon le français s'il existe
      load(filters) {
        const want = [...(filters?.langue || [])].map((l) => l.toLowerCase()).find((l) => c.per[l]);
        return detail(c.id, want || (c.per.fr ? 'fr' : langs[0]));
      },
    };
  }

  MLC.registerType({
    id: 'pokemon',
    label: 'Cartes Pokémon',
    icon: '⚡',
    description: 'Cartes, extensions, cote Cardmarket',
    ui: {
      theme: 'tcg',
      defaultName: 'Mon classeur Pokémon',
      mark: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 12h4M15 12h4"/>',
      noun: ['carte', 'cartes'],
      tagline: 'Le classeur, sans le classeur.',
      pitch: 'Toutes les cartes en français, avec image officielle et cote Cardmarket mise à jour en un clic.',
      source: 'catalogue TCGdex',
      searchPlaceholder: 'Chercher dans le classeur ou ajouter une carte…',
      examples: ['Dracaufeu', 'Pikachu', 'Mewtwo', 'Évoli'],
      facets: ['extension', 'rarete', 'langue'],
      sorts: [['_added', 'Ajout récent'], ['valeur_actuelle', 'Cote'], ['nom', 'Nom'], ['extension', 'Extension']],
      identity: ['tcgdex_id', 'nom', 'variante', 'langue', 'etat'],
      gridMin: '170px',
      cardClass: 'p-1.5',
      card(it, h) {
        const img = h.img(it.image, 'h-full w-full object-cover');
        const qty = h.num(it.quantite) ?? 0;
        return `
          <div class="holo relative aspect-[63/88] overflow-hidden rounded-[4.5%/3.2%] bg-ink shadow-[0_10px_24px_-14px_rgb(17_26_58/.55)] transition duration-300 group-hover:-translate-y-1.5 group-hover:rotate-[-0.6deg] group-hover:shadow-[0_22px_40px_-18px_rgb(17_26_58/.7)]">
            ${img || `
              <div class="grid h-full place-items-center p-4 text-center text-white">
                <div><div class="mx-auto mb-3 size-12 rounded-full border-[6px] border-accent"></div>
                <div class="text-sm font-medium leading-tight">${h.esc(it.nom || 'Carte')}</div></div>
              </div>`}
            ${qty > 1 ? `<span class="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink shadow">×${qty}</span>` : ''}
          </div>
          <div class="px-0.5 pt-2.5">
            <div class="flex items-baseline justify-between gap-2">
              <h3 class="truncate font-medium leading-tight">${h.esc(it.nom || 'Sans nom')}</h3>
              <span class="shrink-0 text-sm font-semibold tabular-nums">${h.money(it.valeur_actuelle)}</span>
            </div>
            <p class="mt-0.5 truncate text-xs text-muted">${[it.extension, it.numero, it.rarete].filter(Boolean).map(h.esc).join(' · ')}</p>
            <div class="mt-2 flex items-center justify-between">${h.stepper(it)}<span class="text-[11px] font-medium uppercase tracking-wide text-muted">${h.esc([it.variante, it.langue].filter(Boolean).join(' · '))}</span></div>
          </div>`;
      },
    },
    columns: [
      { key: 'image', label: 'Image', type: 'image', priority: 2 },
      { key: 'nom', label: 'Nom', type: 'text' },
      { key: 'extension', label: 'Extension', type: 'text', priority: 3 },
      { key: 'numero', label: 'Numéro', type: 'text', priority: 4 },
      { key: 'rarete', label: 'Rareté', type: 'text', priority: 4 },
      { key: 'variante', label: 'Variante', type: 'text', options: ['Normale', 'Reverse', 'Holo', '1re édition'], priority: 4 },
      { key: 'etat', label: 'État', type: 'text', options: ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'], priority: 4 },
      { key: 'langue', label: 'Langue', type: 'text', options: ['FR', 'EN', 'JP', 'DE', 'IT', 'ES', 'PT'], priority: 4 },
      { key: 'quantite', label: 'Quantité', type: 'number' },
      { key: 'valeur_achat', label: "Valeur d'achat", type: 'money', priority: 4 },
      { key: 'valeur_actuelle', label: 'Valeur actuelle', type: 'money', priority: 2 },
      { key: 'illustrateur', label: 'Illustrateur', type: 'text', hidden: true, priority: 4 },
      { key: 'tcgdex_id', label: 'ID TCGdex', type: 'text', hidden: true, priority: 4 },
    ],
    optionalColumns: [
      { key: 'notes', label: 'Notes', type: 'text', priority: 4 },
    ],
    provider: {
      placeholder: 'Nom de la carte en français (ex. « Dracaufeu ») ou ID (ex. « swsh3-136 »)',
      help: "24 000 cartes en 6 langues (français, anglais, allemand, italien, espagnol, portugais), filtrables par série, extension, rareté et année. Données et prix (tendance Cardmarket, en €) fournis par l'API libre TCGdex. Le bouton « Actualiser les prix » met à jour la valeur actuelle de toutes les cartes.",
      resultFacets: [['langue', 'Langue'], ['serie', 'Série'], ['extension', 'Extension'], ['rarete', 'Rareté'], ['categorie', 'Catégorie'], ['annee', 'Année']],
      prepare: () => loadCards().catch(() => {}),
      async search(q, signal) {
        q = q.trim();
        const local = await loadCards().catch(() => null);
        if (local) {
          const byId = local.cards.find((c) => c.id.toLowerCase() === q.toLowerCase());
          if (byId) return [fromCard(byId, q)];
          // cartes illustrées et récentes d'abord, à pertinence égale
          const hits = MLC.fuzzy.search(local.index, q, {
            limit: 400,
            boost: (id) => (Object.values(local.cards[id].per).some((p) => p.image) ? 1.1 : 1) * (1 + (Number(local.cards[id].year) || 1999) / 1e6),
          });
          return hits.map((h) => fromCard(local.cards[h.id], q));
        }
        // index indisponible : recherche en ligne (français, extension seule)
        const setMap = await sets();
        let list = [];
        if (/^[a-z0-9.]+-[a-z0-9]+$/i.test(q)) {
          try { list = [await fetchJson(`${API}/cards/${encodeURIComponent(q)}`, { signal })]; } catch (e) { /* pas un ID */ }
        }
        if (!list.length) list = await fetchJson(`${API}/cards?name=${encodeURIComponent(q)}`, { signal });
        // cartes illustrées d'abord
        list = [...list.filter((c) => c.image), ...list.filter((c) => !c.image)];
        return list.slice(0, 150).map((c) => {
          const s = setMap[setIdOf(c)];
          return {
            title: c.name,
            facets: { extension: s ? s.name : setIdOf(c) },
            subtitle: [s ? s.name : setIdOf(c), s && s.cardCount ? `${c.localId}/${s.cardCount.official}` : c.localId].join(' · '),
            image: c.image ? `${c.image}/low.webp` : null,
            load: () => detail(c.id),
          };
        });
      },
      async refresh(item) {
        if (!item.tcgdex_id) return null;
        // la cote Cardmarket est la même quelle que soit la langue (un produit = une cote) ;
        // on interroge la langue de la carte pour ne pas échouer sur une carte absente en français
        const lang = (item.langue || '').toLowerCase();
        let c;
        for (const l of [...new Set([lang, 'fr', 'en'])].filter((l) => LANGS.includes(l))) {
          try { c = await fetchJson(`${BASE}/${l}/cards/${encodeURIComponent(item.tcgdex_id)}`); break; } catch (e) { /* langue suivante */ }
        }
        if (!c) return null;
        const p = price(c, item.variante);
        return p == null ? null : { valeur_actuelle: p };
      },
    },
  });
})();
