(() => {
  const { norm, slug, parseNum, fmtMoney, fmtNum, esc, uid, debounce, download, pool, isNumericType } = MLC.util;
  const store = MLC.store;
  const $ = (s, root = document) => root.querySelector(s);
  const app = $('#app');
  const drawer = $('#drawer');
  const scrim = $('#scrim');

  // ------------------------------------------------------------------ icônes
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    rows: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    upload: '<path d="M12 15V4m0 0-4 4m4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    download: '<path d="M12 4v11m0 0-4-4m4 4 4-4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    chevUp: '<path d="m6 15 6-6 6 6"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    chevUpDown: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    cloudOff: '<path d="M3 3l18 18"/><path d="M8 7.5A5.5 5.5 0 0 1 17.5 10H18a4 4 0 0 1 2.8 6.8M16 19H7a5 5 0 0 1-2.1-9.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    arrowRight: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  };
  const icon = (name, cls = 'size-4') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  const mark = (t, cls = 'size-5') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${t.ui?.mark || ICONS.grid}</svg>`;

  // ------------------------------------------------------------------ helpers
  const cur = () => store.current();
  const typeOf = (c) => MLC.types[c.type] || MLC.types.generic;
  const uiOf = (c) => typeOf(c).ui || {};
  const view = (c) => (c.view ||= {});
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const saveSoon = debounce(() => store.save(), 300);
  const safeUrl = (u) => (/^(https?:\/\/|data:image\/|img\/[\w.-]+$)/i.test(String(u || '').trim()) ? String(u).trim() : '');
  const plural = (n, [one, many]) => `${n > 1 ? many : one}`;

  function getVal(it, col) {
    if (col.computed) { const f = MLC.computed[col.computed]; return f ? f(it) : null; }
    return it[col.key];
  }
  const colOf = (c, key) => c.columns.find((x) => x.key === key);
  const valOf = (c, it, key) => { const col = colOf(c, key); return col ? getVal(it, col) : it[key]; };
  const textOf = (v, col) => (v == null ? '' : isNumericType(col.type) ? String(parseNum(v) ?? v) : String(v));

  function uniqueKey(columns, base) {
    let k = base, i = 2;
    while (columns.some((c) => c.key === k)) k = `${base}_${i++}`;
    return k;
  }

  function coerce(col, raw) {
    if (raw == null) return raw;
    if (isNumericType(col.type)) { const s = String(raw).trim(); return s === '' ? null : parseNum(s) ?? s; }
    return typeof raw === 'string' ? raw.trim() : raw;
  }

  // image d'un objet, sinon l'image de remplacement de son type (ex. bouteille de la cave)
  const imgOr = (u, c, item = {}) => {
    const placeholder = uiOf(c).placeholder;
    return (u !== 'img/vin-placeholder.svg' && safeUrl(u)) || (typeof placeholder === 'function' ? placeholder(item) : placeholder) || '';
  };

  // Aides passées aux gabarits de cartes des types
  const cardHelpers = {
    esc,
    num: (v) => parseNum(v),
    money: (v) => { const n = parseNum(v); return n == null ? '' : fmtMoney(n); },
    img: (u, cls = '') => (safeUrl(u) ? `<img src="${esc(safeUrl(u))}" class="${cls}" loading="lazy" alt="">` : ''),
    computed: (name, it) => (MLC.computed[name] ? MLC.computed[name](it) ?? '' : ''),
    status: (s) => (s ? `<span class="badge s-${slug(s)}">${esc(s)}</span>` : ''),
    stepper: (it) => `<span class="stepper" data-stop="1"><button type="button" data-act="dec" aria-label="Retirer un">−</button><span>${fmtNum(parseNum(it.quantite) ?? 0)}</span><button type="button" data-act="inc" aria-label="Ajouter un">+</button></span>`,
  };

  // ------------------------------------------------------------------ sélection
  let selected = new Set(), lastSelId = null, lastItems = [];

  // ------------------------------------------------------------------ toast
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg, action) {
    toastEl.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
    if (action) toastEl.querySelector('button').onclick = () => { toastEl.classList.remove('show'); action.run(); };
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), action ? 5000 : 2600);
  }

  // ------------------------------------------------------------------ routage
  // #/c/<id> collection · #/new création · #/about à propos · # → dernière collection
  const go = (id) => { location.hash = id ? `#/c/${id}` : '#/new'; };
  function route() {
    closeDrawer(true);
    renderShell();
    sideOpen(false);
    const h = location.hash;
    const m = h.match(/^#\/c\/(.+)$/);
    const c = m && store.state.collections.find((x) => x.id === m[1]);
    if (c) {
      store.state.currentId = c.id;
      store.save();
      renderCollection();
    } else if (h === '#/about') {
      renderAbout();
    } else if (h === '#/new' || !store.state.collections.length) {
      renderNew();
    } else {
      const last = cur() || store.state.collections[0];
      location.replace(`#/c/${last.id}`);
      return;
    }
    renderSidebar();
    renderSelBar();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  function setTheme(theme) { document.documentElement.dataset.theme = theme || 'home'; }
  const page = () => $('#page');

  // ------------------------------------------------------------------ collections
  function createCollection(typeId, name) {
    const t = MLC.types[typeId] || MLC.types.generic;
    const base = name || t.ui?.defaultName || t.label;
    let n = base, i = 2;
    while (store.state.collections.some((c) => c.name === n)) n = `${base} ${i++}`;
    const c = {
      id: uid(), name: n, type: t.id, columns: clone(t.columns), items: [], createdAt: Date.now(),
      view: { mode: 'table', sort: { key: '_added', dir: 'desc' }, facets: {}, filters: {}, q: '' },
    };
    store.state.collections.push(c);
    store.save();
    return c;
  }

  function collectionTotals(c) {
    const has = (k) => c.columns.some((x) => x.key === k);
    const qty = (it) => (has('quantite') ? parseNum(it.quantite) ?? 1 : 1);
    let units = 0, buy = 0, now = 0, valued = false;
    for (const it of c.items) {
      const b = parseNum(it.valeur_achat), a = parseNum(it.valeur_actuelle);
      units += has('quantite') ? parseNum(it.quantite) ?? 0 : 1;
      buy += (b ?? 0) * qty(it);
      now += (a ?? b ?? 0) * qty(it); // sans cote : on retient le prix d'achat
      if (a != null || b != null) valued = true;
    }
    return { refs: c.items.length, units, buy, now, valued };
  }

  // ================================================================== STRUCTURE
  // Barre latérale (collections) + zone de travail
  function renderShell() {
    if ($('#page')) return;
    app.innerHTML = `
      <div class="flex min-h-dvh">
        <div id="side-scrim" class="fixed inset-0 z-40 hidden bg-black/30 lg:hidden"></div>
        <aside id="side" class="fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r border-line bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0">
          <a href="#/" class="flex h-14 shrink-0 items-center gap-2.5 px-4 text-[15px] font-medium">
            <img src="img/mlc-logo.svg" width="32" height="32" class="size-8 shrink-0" alt="MLC">
            My Little Collection
          </a>
          <div class="px-3 pb-2">
            <a href="#/new" class="btn btn-primary w-full justify-start">${icon('plus')} Nouvelle collection</a>
          </div>
          <p class="px-5 pt-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">Mes collections</p>
          <nav id="side-list" class="min-h-0 flex-1 overflow-y-auto px-3"></nav>
          <div class="border-t border-line p-3 text-sm">
            <button type="button" class="pop-item text-muted" data-act="import">${icon('upload')} Importer un CSV</button>
            <a href="#/about" class="pop-item text-muted">${icon('lock')} À propos · confidentialité</a>
            <p class="px-2.5 pt-2 text-[11px] leading-snug text-muted">Données stockées dans ce navigateur uniquement.</p>
          </div>
        </aside>
        <div class="min-w-0 flex-1">
          <div class="flex h-12 items-center gap-2 border-b border-line px-3 lg:hidden">
            <button type="button" class="btn btn-quiet btn-icon" data-act="side" aria-label="Collections">${icon('rows', 'size-5')}</button>
            <span id="mobile-title" class="truncate text-sm font-medium"></span>
          </div>
          <div id="page"></div>
        </div>
      </div>`;
  }

  function sideOpen(open) {
    $('#side')?.classList.toggle('-translate-x-full', !open);
    $('#side-scrim')?.classList.toggle('hidden', !open);
  }

  function renderSidebar() {
    const list = $('#side-list');
    if (!list) return;
    const curId = location.hash.startsWith('#/c/') ? store.state.currentId : null;
    list.innerHTML = store.state.collections.map((c) => {
      const t = typeOf(c), tot = collectionTotals(c);
      return `
        <a href="#/c/${esc(c.id)}" class="mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${c.id === curId ? 'bg-ink/[0.07] font-medium' : 'hover:bg-ink/[0.04]'}">
          <span data-theme="${t.ui?.theme || 'archive'}" class="text-accent">${mark(t, 'size-4')}</span>
          <span class="min-w-0 flex-1 leading-tight">
            <span class="block truncate">${esc(c.name)}</span>
            <span class="block truncate text-[11px] font-normal text-muted">${esc(t.label)}</span>
          </span>
          <span class="font-mono text-[11px] text-muted">${fmtNum(tot.units)}</span>
        </a>`;
    }).join('') || '<p class="px-2.5 text-sm text-muted">Aucune collection.</p>';
    const mt = $('#mobile-title');
    if (mt) mt.textContent = curId ? cur().name : location.hash === '#/about' ? 'À propos' : 'Nouvelle collection';
  }

  // ================================================================== NOUVELLE COLLECTION
  function renderNew() {
    setTheme('home');
    document.title = 'Nouvelle collection — My Little Collection';
    const types = Object.values(MLC.types);
    page().innerHTML = `
      <div class="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
        <h1 class="text-2xl font-medium">Nouvelle collection</h1>
        <p class="mt-1 max-w-2xl text-sm text-muted">Une collection est la liste de ce que vous possédez. Le modèle définit ses colonnes de départ et le catalogue utilisé pour pré-remplir les fiches ; tout reste modifiable ensuite.</p>

        <label class="field mt-8 max-w-md"><span>Nom (facultatif)</span><input id="new-name" placeholder="Ex. Cave de Paris, Classeur de Léo…" autocomplete="off"></label>

        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          ${types.map((t) => {
            const ui = t.ui || {};
            return `
              <button type="button" data-create="${t.id}" data-theme="${ui.theme || 'archive'}"
                class="group flex cursor-pointer flex-col rounded-lg border border-line bg-paper p-4 text-left text-ink transition hover:border-ink/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-accent">
                <span class="flex items-center gap-2.5">
                  <span class="grid size-8 place-items-center rounded-md bg-accent text-accent-ink">${mark(t, 'size-4')}</span>
                  <span class="font-medium">${esc(t.label)}</span>
                </span>
                <span class="mt-3 text-sm leading-snug text-muted">${esc(ui.pitch || t.description || '')}</span>
                <span class="mt-4 flex flex-wrap gap-1">${t.columns.filter((c) => !c.hidden && c.type !== 'image').slice(0, 6).map((c) => `<span class="rounded bg-ink/5 px-1.5 py-0.5 text-[11px] text-muted">${esc(c.label)}</span>`).join('')}</span>
                <span class="mt-4 inline-flex items-center gap-1 text-sm font-medium">Créer ${icon('arrowRight', 'size-4 transition group-hover:translate-x-0.5')}</span>
              </button>`;
          }).join('')}
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line p-4 text-sm">
          <span class="text-muted">${icon('file', 'size-5')}</span>
          <span class="flex-1 text-muted">Vous avez déjà un fichier (Excel, export d'une autre appli) ?</span>
          <button type="button" class="btn" data-act="import">${icon('upload')} Importer un CSV</button>
        </div>

        <p class="mt-10 flex items-center gap-2 text-xs text-muted">${icon('lock', 'size-3.5')} Aucun compte, aucun serveur : tout reste dans ce navigateur. <a href="#/about" class="underline underline-offset-2 hover:text-ink">En savoir plus</a></p>
      </div>`;
    setTimeout(() => $('#new-name')?.focus(), 0);
  }

  // ================================================================== À PROPOS
  function renderAbout() {
    setTheme('home');
    document.title = 'À propos — My Little Collection';
    const block = (title, body) => `<section class="border-t border-line py-6"><h2 class="font-medium">${title}</h2><div class="mt-2 space-y-2 text-sm leading-relaxed text-muted">${body}</div></section>`;
    page().innerHTML = `
      <div class="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-12">
        <h1 class="text-2xl font-medium">À propos</h1>
        <p class="mt-2 text-muted">My Little Collection est un outil d'inventaire qui tient dans une page web statique : pas de compte, pas de serveur, pas de traitement de données.</p>
        <div class="mt-8">
          ${block('Où sont mes données ?', `<p>Dans le stockage local (IndexedDB) de ce navigateur, sur cet appareil. Rien n'est envoyé à un serveur : le site n'en a pas. Aucun cookie, aucun traceur, aucune statistique.</p><p>Conséquence : vider les données du navigateur efface vos collections. Faites régulièrement une sauvegarde : bouton <strong>Exporter</strong> d'une collection, puis <strong>Sauvegarde complète</strong>.</p>`)}
          ${block('Sauvegardes et exports', "<p>La sauvegarde complète (.json) et l'export CSV sont fabriqués par votre navigateur et téléchargés directement sur votre appareil. À la restauration, le fichier est lu sur place. Aucun de ces fichiers ne transite par un serveur.</p><p>Une sauvegarde contient toutes vos collections, photos comprises : rangez-la où vous voulez (disque, clé USB, votre propre cloud).</p>")}
          ${block('Changer d\'appareil', '<p>Faites une sauvegarde complète, puis, sur l\'autre appareil, <strong>Exporter › Restaurer une sauvegarde</strong>. Pour une seule collection, l\'export CSV s\'importe aussi, et s\'ouvre dans Excel, LibreOffice ou Google Sheets.</p>')}
          ${block('Que voient les catalogues ?', '<p>Pour pré-remplir une fiche, le texte que vous tapez est envoyé au catalogue concerné, et à lui seul : <a class="underline" href="https://tcgdex.dev" target="_blank" rel="noopener">TCGdex</a> pour les cartes, <a class="underline" href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> pour les codes-barres. La base des vins (<a class="underline" href="https://github.com/rogerioxavier/X-Wines" target="_blank" rel="noopener">X-Wines</a>, licence CC0) est livrée avec le site : la recherche de vins se fait sans aucun appel réseau.</p><p>Les images des cartes et l\'actualisation des cotes viennent aussi de TCGdex. Les photos que vous ajoutez à une fiche restent dans ce navigateur.</p>')}
          ${block('Et en dehors de ça ?', '<p>Rien d\'autre. La police (Roboto) et la feuille de style (Tailwind CSS) sont livrées avec le site : ouvrir la page ne contacte aucun service tiers. Comme pour toute page web, l\'hébergeur du site voit votre adresse IP quand il vous envoie les fichiers, mais jamais le contenu de vos collections.</p><p>Les liens « Wine-Searcher » et « Vivino » d\'une fiche ouvrent ces sites dans un nouvel onglet, seulement si vous cliquez dessus.</p>')}
          ${block('Raccourcis', '<p><kbd>/</kbd> rechercher ou ajouter · <kbd>↑</kbd><kbd>↓</kbd> choisir · <kbd>Entrée</kbd> ajouter et ouvrir la fiche · <kbd>Échap</kbd> fermer.</p>')}
          ${block('Code source', '<p>HTML et JavaScript sans étape de build. Tailwind CSS et la police Roboto sont inclus dans le dossier <code>vendor/</code>. Le site est statique et peut être hébergé gratuitement, par exemple sur GitHub Pages.</p>')}
        </div>
      </div>`;
  }

  // ================================================================== COLLECTION
  function renderCollection() {
    const c = cur(), t = typeOf(c), ui = uiOf(c), v = view(c);
    v.mode ||= 'grid';
    v.sort ||= { key: '_added', dir: 'desc' };
    v.facets ||= {};
    v.filters ||= {};
    setTheme(ui.theme || 'archive');
    document.title = `${c.name} — My Little Collection`;
    cmdCtrl?.abort();
    cmdAll = cmdResults = [];
    cmdFilters = {};
    cmdStale = cmdPendingEnter = false;
    cmdQuery = (v.q || '').trim();
    selected = new Set();
    lastSelId = null;
    renderSelBar();

    page().innerHTML = `
      <header class="relative z-40 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-5 pb-3 sm:px-6">
        <div class="flex min-w-0 items-center gap-2.5">
          <span class="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-accent-ink" title="${esc(t.label)}">${mark(t, 'size-4')}</span>
          <h1 id="coll-name" contenteditable="plaintext-only" spellcheck="false" title="Cliquer pour renommer"
            class="truncate rounded px-1 text-xl font-medium outline-none hover:bg-ink/5 focus:bg-ink/5">${esc(c.name)}</h1>
        </div>
        <dl id="stats" class="order-last flex w-full flex-wrap items-baseline gap-x-5 gap-y-1 text-sm sm:order-none sm:w-auto"></dl>
        <span class="flex-1"></span>
        <details class="pop" id="export-menu">
          <summary class="btn" title="Exporter ou sauvegarder">${icon('download')}<span class="hidden sm:inline">Exporter</span></summary>
          <div class="pop-panel right-0 w-72">
            <button type="button" class="pop-item" data-act="export">${icon('file')}<span><span class="block">Cette collection en CSV</span><span class="block text-xs text-muted">Pour Excel ou une autre appli</span></span></button>
            <button type="button" class="pop-item" data-act="backup">${icon('download')}<span><span class="block">Sauvegarde complète</span><span class="block text-xs text-muted">Toutes les collections et les photos</span></span></button>
            <div class="my-1 border-t border-line"></div>
            <button type="button" class="pop-item" data-act="restore">${icon('upload')} Restaurer une sauvegarde…</button>
            <p class="px-2.5 pt-1 pb-1.5 text-xs text-muted">Dernière sauvegarde : ${backupAge() ?? 'jamais'}</p>
            <p class="mx-1 mt-1 mb-0.5 flex gap-2 rounded-md bg-paper px-2.5 py-2 text-[11px] leading-snug text-muted">${icon('lock', 'mt-px size-3.5 shrink-0')}<span>Vos données restent dans ce navigateur. Les fichiers sont créés et lus sur votre appareil, rien n'est envoyé à un serveur. <a href="#/about" class="underline underline-offset-2 hover:text-ink">Confidentialité</a></span></p>
          </div>
        </details>
        <details class="pop" id="menu">
          <summary class="btn btn-quiet btn-icon" title="Plus d'actions">${icon('more', 'size-5')}</summary>
          <div class="pop-panel right-0">
            <button type="button" class="pop-item" data-act="import">${icon('upload')} Importer un CSV</button>
            <button type="button" class="pop-item" data-act="columns">${icon('columns')} Colonnes</button>
            ${t.provider?.refresh ? `<button type="button" class="pop-item" data-act="refresh">${icon('refresh')} Actualiser les cotes</button>` : ''}
            <div class="my-1 border-t border-line"></div>
            <button type="button" class="pop-item danger" data-act="delete-collection">${icon('trash')} Supprimer la collection</button>
          </div>
        </details>
      </header>
      <div id="backup-nag"></div>

      <div class="sticky top-0 z-30 border-b border-line bg-paper/90 px-4 pb-3 backdrop-blur-md sm:px-6">
        <div class="flex items-center gap-2 pt-1">
        <div class="relative min-w-0 flex-1" id="cmd">
          <label class="flex h-11 items-center gap-3 rounded-lg border border-line bg-surface px-3.5 transition focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/10">
            <span class="text-muted">${icon('search', 'size-[18px]')}</span>
            <input id="q" type="text" autocomplete="off" spellcheck="false" placeholder="${esc(ui.searchPlaceholder || 'Rechercher ou ajouter…')}"
              class="bare h-full min-w-0 flex-1 text-[15px]" value="${esc(v.q || '')}">
            <button type="button" id="q-clear" class="btn btn-quiet btn-icon size-7 ${v.q ? '' : 'hidden'}" aria-label="Effacer">${icon('x')}</button>
            <kbd class="hidden sm:inline">/</kbd>
          </label>
          <div id="cmd-pop" class="absolute inset-x-0 top-full z-40 mt-2 hidden max-h-[65vh] overflow-auto rounded-lg border border-line bg-surface p-2 shadow-[0_24px_60px_-24px_rgb(0_0_0/.5)]"></div>
        </div>
        <button type="button" class="btn h-11" data-act="add-column" title="Ajouter ou gérer les colonnes">${icon('columns')}<span class="hidden md:inline">Colonnes</span></button>
        <div id="viewtoggle" class="flex h-11 shrink-0 items-center rounded-lg border border-line bg-surface p-1"></div>
        </div>
        <div id="toolbar" class="mt-2.5 flex items-center gap-2"></div>
      </div>

      <main class="px-4 py-5 sm:px-6"><div id="content"></div></main>`;

    renderStats();
    renderBackupNag();
    renderToolbar();
    renderContent();
  }

  function renderStats() {
    const c = cur(), ui = uiOf(c), tot = collectionTotals(c);
    const stats = [{ value: fmtNum(tot.units), label: plural(tot.units, ui.noun || ['élément', 'éléments']) }];
    if (tot.refs !== tot.units) stats.push({ value: fmtNum(tot.refs), label: plural(tot.refs, ['référence', 'références']) });
    if (tot.valued) {
      if (tot.buy > 0) stats.push({ value: fmtMoney(tot.buy), label: 'payé' });
      stats.push({ value: fmtMoney(tot.now), label: 'valeur estimée' });
      if (tot.buy > 0 && Math.abs(tot.now - tot.buy) > 0.005) {
        const p = ((tot.now - tot.buy) / tot.buy) * 100;
        stats.push({ value: `${p >= 0 ? '+' : ''}${fmtNum(p)} %`, label: 'depuis l\'achat', tone: p >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400' });
      }
    }
    renderSidebar();
    if (ui.extraStats) stats.push(...ui.extraStats(c.items, cardHelpers).map((s) => ({ ...s, value: fmtNum(s.value) })));
    $('#stats').innerHTML = stats.map((s) => `
      <div class="flex items-baseline gap-1.5">
        <dd class="font-medium tabular-nums ${s.tone || ''}">${esc(s.value)}</dd>
        <dt class="text-muted">${esc(s.label)}</dt>
      </div>`).join('');
  }

  // ------------------------------------------------------------------ filtres
  function facetKeys(c) {
    const ui = uiOf(c);
    const keys = ui.facets || [];
    return keys.filter((k) => colOf(c, k));
  }

  function facetValues(c, key) {
    const counts = new Map();
    for (const it of c.items) {
      const v = String(valOf(c, it, key) ?? '').trim();
      if (v) counts.set(v, (counts.get(v) || 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));
  }

  // Libellés de tri explicites (le sens est dans le libellé, pas de bouton séparé)
  function sortOptions(c) {
    const ui = uiOf(c);
    const keys = (ui.sorts || [['_added', 'Ajout'], ['nom', 'Nom']]).filter(([k]) => k === '_added' || colOf(c, k));
    const opts = [];
    for (const [k, label] of keys) {
      const col = colOf(c, k);
      const name = k === '_added' ? 'Ajout' : col.label;
      let asc, desc;
      if (k === '_added') { desc = 'Ajouts récents d\'abord'; asc = 'Ajouts anciens d\'abord'; }
      else if (col.type === 'year') { desc = `${name} : plus récent d'abord`; asc = `${name} : plus ancien d'abord`; }
      else if (isNumericType(col.type)) { desc = `${name} : décroissant`; asc = `${name} : croissant`; }
      else { asc = `${name} : A → Z`; desc = `${name} : Z → A`; }
      // sens « naturel » en premier
      if (k === '_added' || isNumericType(col.type)) opts.push([`${k}:desc`, desc], [`${k}:asc`, asc]);
      else opts.push([`${k}:asc`, asc], [`${k}:desc`, desc]);
    }
    return opts;
  }

  function renderToolbar() {
    const c = cur(), v = view(c);
    $('#viewtoggle').innerHTML = [['table', 'rows', 'Tableau'], ['grid', 'grid', 'Galerie']].map(([m, ic, title]) => `
      <button type="button" class="grid h-full w-9 cursor-pointer place-items-center rounded-md ${v.mode === m ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}" data-mode="${m}" title="${title}" aria-pressed="${v.mode === m}">${icon(ic)}</button>`).join('');

    const facets = facetKeys(c).map((k) => [k, facetValues(c, k)]).filter(([k, vals]) => vals.length > 1 || (v.facets[k] || []).length);
    const active = Object.values(v.facets).some((a) => a?.length) || Object.values(v.filters).some(Boolean);
    const showSort = v.mode === 'grid' && c.items.length > 1; // en tableau, on trie via les en-têtes
    const opts = showSort ? sortOptions(c) : [];
    const curVal = `${v.sort.key}:${v.sort.dir}`;
    const bar = $('#toolbar');
    bar.hidden = !facets.length && !active && !showSort;
    bar.innerHTML = `
      <div class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none]">
        ${facets.map(([k, vals]) => {
          const sel = v.facets[k] || [];
          const label = colOf(c, k).label;
          return `
            <details class="pop" data-facet="${esc(k)}">
              <summary class="chip" data-on="${sel.length ? 1 : 0}">${esc(label)}${sel.length ? ` · ${sel.length === 1 ? esc(sel[0]) : sel.length}` : ''} ${icon('chevron', 'size-3.5 opacity-60')}</summary>
              <div class="pop-panel left-0 max-h-80 overflow-auto">
                ${vals.map(([val, n]) => `
                  <label class="pop-item"><input type="checkbox" data-facet-val="${esc(val)}" ${sel.includes(val) ? 'checked' : ''}><span class="flex-1">${esc(val)}</span><span class="font-mono text-[11px] text-muted">${n}</span></label>`).join('')}
              </div>
            </details>`;
        }).join('')}
        ${active ? `<button type="button" class="chip border-transparent bg-transparent text-muted" data-act="clear-filters">${icon('x', 'size-3.5')} Réinitialiser les filtres</button>` : ''}
      </div>
      ${showSort ? `
        <label class="flex shrink-0 items-center gap-2 text-sm text-muted">
          <span class="hidden sm:inline">Trier</span>
          <select id="sort" class="h-8 py-0 pr-8 pl-2.5 text-sm">
            ${opts.map(([val, l]) => `<option value="${esc(val)}" ${val === curVal ? 'selected' : ''}>${esc(l)}</option>`).join('')}
            ${opts.some(([val]) => val === curVal) ? '' : `<option value="${esc(curVal)}" selected>${esc(colOf(c, v.sort.key)?.label || 'Personnalisé')}</option>`}
          </select>
        </label>` : ''}`;
  }

  function matchFilter(val, f, col) {
    f = f.trim();
    if (!f) return true;
    if (isNumericType(col.type)) {
      const n = parseNum(val);
      let m = f.match(/^(>=|<=|>|<|=)\s*(-?[\d\s.,]+)$/);
      if (m) {
        const x = parseNum(m[2]);
        if (n == null || x == null) return false;
        return { '>': n > x, '<': n < x, '>=': n >= x, '<=': n <= x, '=': n === x }[m[1]];
      }
      m = f.match(/^(-?[\d.,]+)\s*(?:-|\.\.|à)\s*(-?[\d.,]+)$/);
      if (m) {
        const a = parseNum(m[1]), b = parseNum(m[2]);
        return n != null && n >= Math.min(a, b) && n <= Math.max(a, b);
      }
      const x = parseNum(f);
      if (x != null) return n === x;
    }
    const t = norm(textOf(val, col));
    if (f.startsWith('!')) return !t.includes(norm(f.slice(1)));
    if (f.startsWith('=')) return t === norm(f.slice(1));
    return t.includes(norm(f));
  }

  function compare(a, b, col) {
    if (!col || isNumericType(col.type)) {
      const x = parseNum(a), y = parseNum(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return x - y;
    }
    const x = a == null ? '' : String(a), y = b == null ? '' : String(b);
    if (!x && !y) return 0;
    if (!x) return 1;
    if (!y) return -1;
    return x.localeCompare(y, 'fr', { numeric: true, sensitivity: 'base' });
  }

  function filteredItems(c) {
    const v = view(c);
    let items = c.items.map((it, i) => ({ it, i }));
    // recherche : tous les mots doivent apparaître quelque part dans la fiche
    const words = norm(v.q || '').split(/\s+/).filter(Boolean);
    if (words.length) {
      items = items.filter(({ it }) => {
        const hay = norm(c.columns.map((col) => textOf(getVal(it, col), col)).join(' '));
        return words.every((w) => hay.includes(w));
      });
    }
    for (const [k, sel] of Object.entries(v.facets || {})) {
      if (sel?.length) items = items.filter(({ it }) => sel.includes(String(valOf(c, it, k) ?? '').trim()));
    }
    for (const [k, f] of Object.entries(v.filters || {})) {
      const col = colOf(c, k);
      if (col && f) items = items.filter(({ it }) => matchFilter(getVal(it, col), f, col));
    }
    const { key, dir } = v.sort || {};
    const d = dir === 'desc' ? -1 : 1;
    if (key === '_added' || !key) {
      items.sort((a, b) => ((a.it._t || 0) - (b.it._t || 0) || a.i - b.i) * d);
    } else {
      const col = colOf(c, key);
      items.sort((a, b) => {
        const va = col ? getVal(a.it, col) : a.it[key], vb = col ? getVal(b.it, col) : b.it[key];
        const r = compare(va, vb, col);
        const ea = va == null || va === '', eb = vb == null || vb === '';
        return ea !== eb ? r : r * d; // les vides restent en bas
      });
    }
    return items.map((x) => x.it);
  }

  // ------------------------------------------------------------------ contenu
  function renderContent() {
    const c = cur(), ui = uiOf(c), v = view(c);
    const el = $('#content');
    if (!el) return;
    const items = filteredItems(c);

    if (!c.items.length) {
      const ex = ui.examples || [];
      el.innerHTML = `
        <div class="mx-auto max-w-xl py-14 text-center">
          <span class="mx-auto grid size-14 place-items-center rounded-full bg-accent text-accent-ink">${mark(typeOf(c), 'size-6')}</span>
          <h2 class="mt-5 text-xl font-medium">C'est vide, pour l'instant.</h2>
          <p class="mt-3 text-muted">Tapez un nom dans la barre de recherche${ui.source ? ` : le ${esc(ui.source)} complète la fiche pour vous` : ''}. Ou importez un CSV existant.</p>
          ${ex.length ? `<div class="mt-6 flex flex-wrap justify-center gap-2">${ex.map((e) => `<button type="button" class="chip" data-example="${esc(e)}">${esc(e)}</button>`).join('')}</div>` : ''}
          <div class="mt-8 flex justify-center gap-2">
            <button type="button" class="btn" data-act="import">${icon('upload')} Importer un CSV</button>
            <button type="button" class="btn" data-act="new-blank">${icon('plus')} Fiche vierge</button>
          </div>
        </div>`;
      return;
    }

    if (!items.length) {
      el.innerHTML = `
        <div class="py-16 text-center">
          <p class="text-lg font-medium">Rien ne correspond.</p>
          <p class="mt-2 text-muted">${v.q ? `Aucun élément pour « ${esc(v.q)} » dans cette collection.` : 'Aucun élément avec ces filtres.'}</p>
          <div class="mt-6 flex justify-center gap-2">
            ${v.q ? `<button type="button" class="btn btn-primary" data-act="open-cmd">${icon('plus')} Ajouter « ${esc(v.q)} »</button>` : ''}
            <button type="button" class="btn" data-act="clear-all">Tout afficher</button>
          </div>
        </div>`;
      return;
    }

    const count = items.length !== c.items.length
      ? `<p class="mb-4 text-sm text-muted">${fmtNum(items.length)} sur ${fmtNum(c.items.length)}</p>` : '';

    lastItems = items; // sélection « tout » et par plage : sur tous les résultats, pas seulement la page
    // pagination : seule la page courante est dans le DOM (des milliers de lignes figeraient le navigateur) ;
    // « Tout » : virtualisation, seuls les éléments proches de la zone visible sont dessinés
    const size = PAGE_SIZES.includes(v.pageSize) ? v.pageSize : PAGE_SIZES[1];
    const sig = c.id + JSON.stringify([v.q, v.facets, v.filters, v.sort, v.mode, size]);
    // même vue (quantité, sélection…) : on garde la position de défilement
    const keep = sig === pageSig ? { wrap: $('.tbl-wrap')?.scrollTop || 0, win: window.scrollY } : null;
    if (sig !== pageSig) { pageSig = sig; pageNo = 1; } // nouvelle recherche, filtre ou tri → page 1
    const all = size === 0;
    const pages = all ? 1 : Math.max(1, Math.ceil(items.length / size));
    pageNo = Math.min(Math.max(1, pageNo), pages);
    pageCount = pages;
    const shown = all ? items : items.slice((pageNo - 1) * size, pageNo * size);
    const pager = pagerHtml(items.length, size, pages);
    const card = (it) => `
          <article ${all ? '' : 'style="content-visibility:auto;contain-intrinsic-size:auto 340px"'} class="group relative flex cursor-pointer flex-col ${ui.cardClass || 'overflow-hidden rounded-md border border-line bg-surface'} ${selected.has(it._id) ? 'ring-2 ring-accent ring-offset-2 ring-offset-paper' : ''}" data-id="${esc(it._id)}" tabindex="0">
            <label class="absolute top-2 left-2 z-10 grid size-7 cursor-pointer place-items-center rounded-md bg-surface/90 shadow-sm backdrop-blur transition ${selected.size ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}" data-stop="1">
              <input type="checkbox" data-sel="${esc(it._id)}" ${selected.has(it._id) ? 'checked' : ''} aria-label="Sélectionner">
            </label>
            ${ui.card ? ui.card(it, cardHelpers) : `<div class="p-4">${esc(it.nom || 'Sans nom')}</div>`}
          </article>`;

    virt = null;
    if (v.mode === 'table') {
      const t = tableHtml(c, all ? [] : shown, items);
      el.innerHTML = count + t.html + pager;
      // ordre : marges (hauteur totale) → position de défilement → ajustement des colonnes → lignes visibles
      if (all) { virt = { kind: 'table', items, html: t.row, cols: t.colspan, rowH: 57 }; virtPaint(true); }
      if (keep) $('.tbl-wrap').scrollTop = keep.wrap;
      fitTable();
      virtPaint(true);
    } else {
      el.innerHTML = count + `
      <div id="vgrid" class="grid gap-x-4 gap-y-6" style="grid-template-columns:repeat(auto-fill,minmax(min(${ui.gridMin || '220px'},40vw),1fr))">
        ${all ? '' : shown.map(card).join('')}
      </div>` + pager;
      if (all) { virt = { kind: 'grid', items, html: card, rowH: 380, cols: 1 }; virtPaint(true); }
      if (keep) { window.scrollTo(0, keep.win); virtPaint(true); }
    }
  }

  // ------------------------------------------------------------------ virtualisation (« Tout »)
  // Seuls les éléments proches de la zone visible sont dans le DOM ; des marges de la hauteur
  // des éléments absents (estimée sur ceux affichés) gardent la barre de défilement juste.
  let virt = null, virtRaf = 0;
  const OVERSCAN = 6; // lignes dessinées en plus, au-dessus et au-dessous

  function virtRange() {
    const n = virt.items.length;
    if (virt.kind === 'table') {
      const wrap = $('.tbl-wrap'), head = $('.tbl thead');
      if (!wrap || !head) return [0, 0];
      const first = Math.floor(Math.max(0, wrap.scrollTop - head.offsetHeight) / virt.rowH);
      // borné à la fenêtre : la hauteur max du tableau peut ne pas être encore appliquée (CSS générée à la volée)
      const count = Math.ceil(Math.min(wrap.clientHeight, innerHeight) / virt.rowH);
      return [Math.max(0, first - OVERSCAN), Math.min(n, first + count + OVERSCAN)];
    }
    const grid = $('#vgrid');
    if (!grid) return [0, 0];
    const firstRow = Math.floor(Math.max(0, -grid.getBoundingClientRect().top) / virt.rowH);
    const rows = Math.ceil(innerHeight / virt.rowH);
    return [Math.max(0, firstRow - OVERSCAN) * virt.cols, Math.min(n, (firstRow + rows + OVERSCAN) * virt.cols)];
  }

  function virtPaint(force, remeasure = true) {
    if (!virt) return;
    if (virt.kind === 'grid') { // nombre de colonnes de la grille (dépend de la largeur)
      const grid = $('#vgrid');
      virt.cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    }
    const [s, e] = virtRange();
    if (!force && s === virt.start && e === virt.end) return;
    virt.start = s; virt.end = e;
    const html = virt.items.slice(s, e).map(virt.html).join('');
    const n = virt.items.length;
    if (virt.kind === 'table') {
      const pad = (h) => (h > 0 ? `<tr class="vpad" aria-hidden="true"><td colspan="${virt.cols}" style="height:${h}px;padding:0;border:0"></td></tr>` : '');
      const restore = keepFocus(); // la cellule en cours d'édition reste active si sa ligne reste dessinée
      $('.tbl tbody').innerHTML = pad(s * virt.rowH) + html + pad((n - e) * virt.rowH);
      restore();
    } else {
      const grid = $('#vgrid'), rows = (k) => Math.ceil(k / virt.cols) * virt.rowH;
      grid.style.paddingTop = `${rows(s)}px`;
      grid.style.paddingBottom = `${Math.max(0, rows(n) - rows(e))}px`;
      grid.innerHTML = html;
    }
    // hauteur réelle d'une ligne, mesurée sur les éléments dessinés : on corrige l'estimation
    const h = remeasure && virtMeasure();
    if (h && Math.abs(h - virt.rowH) > 1) { virt.rowH = h; virtPaint(true, false); } // une seule correction : pas d'oscillation
  }

  function virtMeasure() {
    if (virt.kind === 'table') {
      const trs = [...document.querySelectorAll('.tbl tbody tr:not(.vpad)')];
      return trs.length ? Math.round(trs.reduce((a, tr) => a + tr.offsetHeight, 0) / trs.length) : 0;
    }
    const grid = $('#vgrid'), first = grid.firstElementChild;
    if (!first) return 0;
    const rows = Math.ceil(grid.children.length / virt.cols);
    const inner = grid.offsetHeight - parseFloat(grid.style.paddingTop) - parseFloat(grid.style.paddingBottom);
    return Math.round((inner + parseFloat(getComputedStyle(grid).rowGap)) / rows); // ligne + espacement
  }

  const virtSchedule = () => { if (!virt) return; cancelAnimationFrame(virtRaf); virtRaf = requestAnimationFrame(() => virtPaint(false)); };
  document.addEventListener('scroll', virtSchedule, { capture: true, passive: true }); // page et tableau
  addEventListener('resize', () => { if (virt) { cancelAnimationFrame(virtRaf); virtRaf = requestAnimationFrame(() => virtPaint(true)); } });

  // ------------------------------------------------------------------ pagination
  const PAGE_SIZES = [50, 100, 250, 500, 0]; // 0 = tout, virtualisé
  let pageNo = 1, pageCount = 1, pageSig = '';

  function pagerHtml(total, size, pages) {
    if (total <= PAGE_SIZES[0]) return '';
    const from = size ? (pageNo - 1) * size + 1 : 1, to = size ? Math.min(pageNo * size, total) : total;
    return `
      <nav class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted" aria-label="Pagination">
        <span class="tabular-nums">${size ? `${fmtNum(from)}–${fmtNum(to)} sur ${fmtNum(total)}` : `${fmtNum(total)} au total`}</span>
        ${pages > 1 ? `
        <span class="flex items-center gap-1.5">
          <button type="button" class="btn btn-icon" data-page="first" ${pageNo === 1 ? 'disabled' : ''} title="Première page" aria-label="Première page">«</button>
          <button type="button" class="btn btn-icon" data-page="prev" ${pageNo === 1 ? 'disabled' : ''} title="Page précédente" aria-label="Page précédente">${icon('back')}</button>
          <label class="flex items-center gap-1.5">Page <input data-page-input inputmode="numeric" value="${pageNo}" class="h-8 w-14 px-2 text-center tabular-nums" aria-label="Numéro de page"> / ${fmtNum(pages)}</label>
          <button type="button" class="btn btn-icon" data-page="next" ${pageNo === pages ? 'disabled' : ''} title="Page suivante" aria-label="Page suivante"><span class="rotate-180">${icon('back')}</span></button>
          <button type="button" class="btn btn-icon" data-page="last" ${pageNo === pages ? 'disabled' : ''} title="Dernière page" aria-label="Dernière page">»</button>
        </span>` : ''}
        <label class="flex items-center gap-2">Par page
          <select data-page-size class="h-8 py-0 pr-8 pl-2.5 text-sm">${PAGE_SIZES.map((n) => `<option value="${n}" ${n === size ? 'selected' : ''}>${n || 'Tout'}</option>`).join('')}</select>
        </label>
      </nav>`;
  }

  function goPage(n) {
    pageNo = n;
    renderContent();
    $('.tbl-wrap')?.scrollTo(0, 0);
    const top = $('#content')?.getBoundingClientRect().top;
    if (top < 0) window.scrollBy(0, top - 140); // revient en haut de la liste, sous la barre collante
  }

  // Priorité d'affichage des colonnes : 1 = toujours visible ; 2, 3, 4 = masquées (4 d'abord)
  // seulement si le tableau déborde ; leur valeur passe alors sous le nom.
  function prio(col) {
    if (col.priority) return col.priority;
    const t = typeOf(cur());
    const def = [...t.columns, ...(t.optionalColumns || [])].find((d) => d.key === col.key);
    return def?.priority ?? (col.key === 'nom' || col.key === 'quantite' ? 1 : 3);
  }

  // ------------------------------------------------------------------ édition dans le tableau
  // Les cellules sont des champs : on écrit directement dedans ; la fiche s'ouvre en cliquant hors champ.
  let tblCell = null;
  const editable = (col) => col && !col.computed && col.type !== 'image' && col.type !== 'status' && col.key !== 'quantite';

  // valeur telle qu'affichée dans le champ (« 24,50 € », « 13,5 »)
  function cellText(val, col) {
    if (val == null || val === '') return '';
    if (typeof val !== 'number') return String(val);
    if (col.type === 'money') return fmtMoney(val);
    if (col.type === 'year') return String(val);
    return String(val).replace('.', ',');
  }

  function cellInput(it, col) {
    const num = isNumericType(col.type);
    return `<input class="cell" data-edit="${esc(col.key)}" value="${esc(cellText(it[col.key], col))}" placeholder="${col.type === 'money' ? '€' : '—'}"
      ${num ? 'inputmode="decimal"' : ''} ${col.options?.length ? `list="tl-${esc(col.key)}"` : ''} autocomplete="off" spellcheck="false"
      aria-label="${esc(col.label)}" title="${esc(col.label)}${it[col.key] != null && it[col.key] !== '' ? ` : ${esc(cellText(it[col.key], col))}` : ''}">`;
  }

  const statsSoon = debounce(() => { if (cur()) renderStats(); }, 300);

  function editCell(input, commit) {
    const c = cur(), tr = input.closest('tr[data-id]');
    const it = tr && c.items.find((x) => x._id === tr.dataset.id);
    const col = colOf(c, input.dataset.edit);
    if (!it || !col) return;
    it[col.key] = coerce(col, input.value);
    if (it[col.key] === '' || it[col.key] == null) delete it[col.key];
    store.save();
    statsSoon();
    if (drawerItem === it) closeDrawer(true); // la fiche ouverte afficherait l'ancienne valeur
    // colonnes calculées de la ligne (statut, « à boire avant ») : mises à jour sans redessiner la ligne
    c.columns.filter((x) => x.computed).forEach((x) => {
      const td = tr.querySelector(`td[data-col="${CSS.escape(x.key)}"]`);
      if (td && tblCell) td.innerHTML = tblCell(it, x);
    });
    if (commit) { // valeur mise au propre à la sortie du champ (« 24,5 » → « 24,50 € »)
      input.value = cellText(it[col.key], col);
      input.title = `${col.label}${input.value ? ` : ${input.value}` : ''}`;
    }
  }

  function tableHtml(c, items, all = items) {
    const v = view(c), cols = c.columns.filter((x) => !x.hidden);
    const sortIc = (k) => `<span class="sort-ic">${icon(v.sort.key === k ? (v.sort.dir === 'asc' ? 'chevUp' : 'chevron') : 'chevUpDown', 'size-3.5')}</span>`;
    const cell = (it, col) => {
      const val = getVal(it, col);
      switch (col.type) {
        case 'image': return cardHelpers.img(imgOr(val, c, it));
        case 'url': { const u = safeUrl(val); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener" class="underline underline-offset-2">lien</a>` : esc(val); }
        case 'money': return cardHelpers.money(val) || esc(val);
        case 'number': return col.key === 'quantite' ? cardHelpers.stepper(it) : (parseNum(val) == null ? esc(val) : fmtNum(parseNum(val)));
        case 'status': return cardHelpers.status(val);
        default: return esc(val ?? '');
      }
    };
    // valeurs des colonnes masquées, affichées sous le nom
    const subCols = cols.filter((col) => prio(col) > 1 && col.type !== 'image' && col.key !== 'nom');
    const subText = (it, col) => {
      const val = getVal(it, col);
      if (val == null || val === '') return '';
      const txt = col.type === 'money' ? cardHelpers.money(val) : isNumericType(col.type) ? fmtNum(parseNum(val)) ?? val : val;
      const unit = col.key === 'garde' ? ' ans' : '';
      // les montants sont préfixés pour être distinguables (« achat 24,50 € », « actuelle 26,00 € »)
      const short = col.type === 'money' ? `<span class="opacity-70">${esc(col.label.replace(/^valeur\s+(d['’]|de\s+)?/i, ''))}</span> ` : '';
      return `<span data-col="${esc(col.key)}" title="${esc(col.label)}">${short}${esc(txt)}${unit}</span>`;
    };
    // listes de valeurs proposées (colonnes à choix : couleur, état, langue…)
    const lists = cols.filter((col) => col.options?.length && editable(col))
      .map((col) => `<datalist id="tl-${esc(col.key)}">${col.options.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`).join('');
    const nameCell = (it) => {
      const subs = subCols.map((col) => subText(it, col)).filter(Boolean);
      return `<span class="name-edit">${cellInput(it, colOf(c, 'nom'))}<button type="button" class="row-open" title="Ouvrir la fiche" aria-label="Ouvrir la fiche">${icon('arrowRight', 'size-3.5')}</button></span>${subs.length ? `<span class="sub">${subs.join('')}</span>` : ''}`;
    };
    const row = (it) => `<tr data-id="${esc(it._id)}" data-sel="${selected.has(it._id) ? 1 : 0}"><td class="sel"><input type="checkbox" data-sel="${esc(it._id)}" ${selected.has(it._id) ? 'checked' : ''} aria-label="Sélectionner"></td>${cols.map((col) => col.key === 'nom'
      ? `<td class="name">${nameCell(it)}</td>`
      : `<td class="${isNumericType(col.type) ? 'num' : ''}" data-col="${esc(col.key)}">${editable(col) ? cellInput(it, col) : cell(it, col)}</td>`).join('')}</tr>`;
    tblCell = cell; // mise à jour des colonnes calculées pendant la saisie
    const html = `
      <div class="tbl-wrap overflow-auto rounded-xl border border-line bg-surface" style="max-height:calc(100dvh - 12rem)">
        <table class="tbl">
          <thead>
            <tr><th class="sel"><input type="checkbox" data-sel-all="1" ${all.length && all.every((it) => selected.has(it._id)) ? 'checked' : ''} aria-label="Tout sélectionner (${all.length})" title="Tout sélectionner (${all.length})"></th>${cols.map((col) => `<th class="sortable ${isNumericType(col.type) ? 'num' : ''}" data-col="${esc(col.key)}" data-sort="${esc(col.key)}" data-active="${v.sort.key === col.key ? 1 : 0}" title="Trier par ${esc(col.label)}"><span class="th-in">${esc(col.label)}${sortIc(col.key)}</span></th>`).join('')}</tr>
            <tr class="filters"><th class="sel"></th>${cols.map((col) => col.type === 'image' ? `<th data-col="${esc(col.key)}"></th>` : `<th data-col="${esc(col.key)}"><input data-filter="${esc(col.key)}" value="${esc(v.filters[col.key] || '')}" placeholder="Filtrer" title="${isNumericType(col.type) ? 'Ex. >10, <=50, 2010-2015' : 'Contient… · !mot pour exclure · =valeur exacte'}" aria-label="Filtrer ${esc(col.label)}"></th>`).join('')}</tr>
          </thead>
          <tbody>
            ${items.map(row).join('')}
          </tbody>
        </table>
      </div>`;
    return { html: lists + html, row, colspan: cols.length + 1 };
  }

  // Ajuste le tableau à la largeur disponible : masque les colonnes les moins prioritaires
  // (de droite à gauche) tant qu'il déborde. Une feuille de style dynamique évite de toucher chaque cellule.
  const fitStyle = document.head.appendChild(document.createElement('style'));
  function fitTable() {
    const wrap = $('.tbl-wrap');
    fitStyle.textContent = '';
    if (!wrap) return;
    const c = cur();
    const order = c.columns.filter((x) => !x.hidden && x.key !== 'nom')
      .map((col, i) => ({ col, i, p: prio(col) }))
      .filter((x) => x.p > 1)
      .sort((a, b) => b.p - a.p || b.i - a.i);
    const hidden = [];
    for (const { col } of order) {
      if (wrap.scrollWidth <= wrap.clientWidth + 1) break;
      hidden.push(col.key);
      fitStyle.textContent = hidden.map((k) => `.tbl [data-col="${CSS.escape(k)}"]{display:none}.tbl .sub [data-col="${CSS.escape(k)}"]{display:inline}`).join('');
    }
    syncHeaderHeight();
  }
  let fitRaf = 0;
  new ResizeObserver(() => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitTable); }).observe(app);

  // La 2e ligne d'en-tête (filtres) colle sous la 1re, dont la hauteur varie (libellés sur 2 lignes)
  const headerObserver = new ResizeObserver(() => {
    const tr = $('.tbl thead tr');
    if (tr) $('.tbl').style.setProperty('--th-h', `${tr.offsetHeight}px`);
  });
  function syncHeaderHeight() {
    headerObserver.disconnect();
    const tr = $('.tbl thead tr');
    if (tr) headerObserver.observe(tr);
  }

  // Rafraîchit le contenu sans perdre le focus d'un filtre du tableau
  function refreshContent() {
    const restore = keepFocus();
    renderContent();
    restore();
  }

  // Garde le focus (filtre ou cellule en cours d'édition) et la position du curseur à travers un redessin
  function keepFocus() {
    const a = document.activeElement;
    const filterKey = a?.dataset?.filter, editKey = a?.dataset?.edit;
    if (!filterKey && !editKey) return () => {};
    const rowId = editKey && a.closest('tr[data-id]')?.dataset.id;
    const pos = a.selectionStart, orig = a.dataset.orig;
    return () => {
      const input = filterKey ? $(`[data-filter="${CSS.escape(filterKey)}"]`)
        : $(`.tbl tr[data-id="${CSS.escape(rowId)}"] [data-edit="${CSS.escape(editKey)}"]`);
      if (!input || input === document.activeElement) return;
      input.focus();
      if (orig != null) input.dataset.orig = orig;
      try { input.setSelectionRange(pos, pos); } catch (e) { /* champ sans curseur */ }
    };
  }

  function refreshAll() {
    renderStats();
    renderToolbar();
    refreshContent();
  }

  // ------------------------------------------------------------------ ajout
  function addItem(values, { merge = true } = {}) {
    const c = cur(), ui = uiOf(c);
    const clean = {};
    // colonnes affichées + colonnes optionnelles du modèle : leurs valeurs sont gardées
    // pour réapparaître si l'on ajoute la colonne plus tard (photo, producteur, cépages…)
    const t = typeOf(c);
    const optional = (t.optionalColumns || []).filter((d) => !c.columns.some((x) => x.key === d.key));
    for (const col of [...c.columns, ...optional]) {
      if (col.computed || values[col.key] == null || values[col.key] === '') continue;
      clean[col.key] = coerce(col, values[col.key]);
    }
    const idKeys = ui.identity || ['nom'];
    const same = merge && idKeys.some((k) => clean[k]) && c.items.find((it) => idKeys.every((k) => norm(it[k] ?? '') === norm(clean[k] ?? '')));
    if (same) {
      same.quantite = (parseNum(same.quantite) ?? 0) + 1;
      store.save();
      return { item: same, merged: true };
    }
    const item = { _id: uid(), _t: Date.now(), ...(colOf(c, 'quantite') ? { quantite: 1 } : {}), ...clean };
    c.items.push(item);
    store.save();
    return { item, merged: false };
  }

  function afterAdd({ item, merged }, open) {
    refreshAll();
    if (open) openDrawer(item);
    const name = item.nom || 'Élément';
    toast(merged ? `${name} : quantité ${fmtNum(parseNum(item.quantite))}` : `${name} ajouté`, open ? null : { label: 'Ouvrir', run: () => openDrawer(item) });
  }

  // ------------------------------------------------------------------ barre de commande
  let cmdResults = [], cmdActive = 0, cmdCtrl = null, cmdQuery = '';
  let cmdStale = false, cmdPendingEnter = false; // résultats en cours de rafraîchissement
  let cmdAll = [], cmdFilters = {}; // tous les résultats du catalogue + filtres (pastilles) actifs

  // valeur(s) d'un résultat pour une pastille (une carte peut exister en plusieurs langues)
  const resultFacet = (r, k) => [(r.facets || r.values || {})[k]].flat().filter((v) => v != null && v !== '');
  const passFilters = (r, except) => Object.entries(cmdFilters).every(([k, set]) => k === except || !set.size || resultFacet(r, k).some((v) => set.has(v)));

  // Résultats affichés = résultats du catalogue filtrés par les pastilles
  function applyCmdFilters() {
    // un filtre dont la valeur n'existe plus dans les nouveaux résultats est retiré
    for (const [k, set] of Object.entries(cmdFilters)) {
      set.forEach((v) => { if (!cmdAll.some((r) => resultFacet(r, k).includes(v))) set.delete(v); });
    }
    cmdResults = cmdAll.filter((r) => passFilters(r)).slice(0, 40);
    if (cmdActive > cmdResults.length) cmdActive = 0;
  }

  function cmdFacetsHtml() {
    const defs = typeOf(cur()).provider?.resultFacets || [];
    return defs.map(([k, label]) => {
      const sel = cmdFilters[k] || new Set();
      const counts = new Map();
      cmdAll.forEach((r) => { if (passFilters(r, k)) resultFacet(r, k).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1)); });
      sel.forEach((v) => { if (!counts.has(v)) counts.set(v, 0); });
      if (counts.size < 2 && !sel.size) return '';
      const vals = [...counts].sort((a, b) => sel.has(b[0]) - sel.has(a[0]) || b[1] - a[1]).slice(0, 8);
      return `
        <div class="flex items-start gap-2 px-2.5 py-1">
          <span class="w-20 shrink-0 pt-1 text-[11px] text-muted">${esc(label)}</span>
          <div class="flex flex-wrap gap-1">${vals.map(([v, n]) => `<button type="button" class="chip px-2 py-0.5 text-xs" data-on="${sel.has(v) ? 1 : 0}" data-rf="${esc(k)}" data-rv="${esc(v)}">${esc(v)} <span class="n">${n}</span></button>`).join('')}</div>
        </div>`;
    }).join('');
  }

  function cmdOpen() { $('#cmd-pop')?.classList.remove('hidden'); }
  function cmdClose() { $('#cmd-pop')?.classList.add('hidden'); }

  function cmdRender(state) {
    const pop = $('#cmd-pop');
    if (!pop) return;
    const c = cur(), ui = uiOf(c), t = typeOf(c), q = cmdQuery;
    const local = filteredItems(c).length;
    const rows = cmdResults.map((r, i) => `
      <div class="result" data-r="${i}" data-active="${i === cmdActive ? 1 : 0}">
        <span class="thumb">${(r.image || imgOr('', c, { ...r.values, nom: r.values?.nom || r.title })) ? `<img src="${esc(imgOr(r.image, c, { ...r.values, nom: r.values?.nom || r.title }))}" alt="" loading="lazy">` : r.swatch ? `<span class="size-5 rounded-full ring-2 ring-surface" style="background:${esc(r.swatch)}"></span>` : `<span class="text-muted">${mark(t, 'size-5')}</span>`}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium">${esc(r.title)}</span>
          <span class="block truncate text-xs text-muted">${esc(r.subtitle || '')}</span>
        </span>
        <button type="button" class="btn btn-icon size-8 shrink-0" data-quick="${i}" title="Ajouter sans ouvrir la fiche">${icon('plus')}</button>
      </div>`).join('');
    const manualIdx = cmdResults.length;
    pop.innerHTML = `
      ${q ? `<p class="px-2.5 pt-1 pb-2 text-xs text-muted">${local ? `<strong class="text-ink">${local}</strong> dans votre collection, affichés dessous` : 'Pas encore dans votre collection'}</p>` : ''}
      ${t.provider ? `
        <p class="eyebrow px-2.5 pt-2 pb-1.5">Ajouter depuis ${esc(ui.source || 'le catalogue')}</p>
        ${cmdAll.length ? `<div class="mb-1.5 border-b border-line pb-1.5">${cmdFacetsHtml()}</div>` : ''}
        ${state === 'done' && cmdAll.length && !cmdResults.length ? `<p class="px-2.5 py-2 text-sm text-muted">Aucun résultat avec ces filtres. <button type="button" class="underline underline-offset-2" data-rf-clear="1">Retirer les filtres</button></p>` : ''}
        ${state === 'loading' && !cmdResults.length ? `<div class="space-y-1 p-1">${'<div class="h-12 animate-pulse rounded-lg bg-ink/5"></div>'.repeat(3)}</div>` : ''}
        ${state === 'error' ? `<p class="px-2.5 py-2 text-sm text-accent">Catalogue indisponible pour le moment.</p>` : ''}
        ${state === 'done' && !cmdAll.length ? `<p class="px-2.5 py-2 text-sm text-muted">Aucun résultat dans le catalogue.</p>` : ''}
        <div class="${cmdStale ? 'pointer-events-none opacity-45' : ''}">${rows}</div>` : ''}
      <div class="mt-1 border-t border-line pt-1">
        <div class="result" data-r="${manualIdx}" data-active="${cmdActive === manualIdx ? 1 : 0}">
          <span class="thumb text-muted">${icon('plus', 'size-5')}</span>
          <span class="min-w-0 flex-1"><span class="block truncate font-medium">Créer « ${esc(q)} »</span><span class="block text-xs text-muted">Fiche vierge à compléter</span></span>
        </div>
      </div>
      <p class="hidden px-2.5 pt-2 pb-1 text-[11px] text-muted sm:block"><kbd>↑</kbd> <kbd>↓</kbd> naviguer · <kbd>Entrée</kbd> ajouter et ouvrir · <kbd>Échap</kbd> fermer</p>`;
    cmdOpen();
    if (state === 'done') loadThumbs();
  }

  // Vignettes chargées après coup (ex. photo du domaine via Wikidata), 10 premiers résultats
  function loadThumbs() {
    const batch = cmdResults;
    batch.slice(0, 10).forEach((r, i) => {
      if (r.image || !r.imageAsync || r._thumbAsked) return;
      r._thumbAsked = true;
      r.imageAsync().then((url) => {
        if (!url || cmdResults !== batch) return;
        r.image = url.replace(/width=\d+/, 'width=120');
        const thumb = $(`#cmd-pop [data-r="${i}"] .thumb`);
        if (thumb) thumb.innerHTML = `<img src="${esc(safeUrl(r.image))}" alt="" loading="lazy">`;
      });
    });
  }

  const cmdSearch = debounce(async () => {
    const c = cur(), t = typeOf(c);
    const q = cmdQuery;
    if (!q) { cmdClose(); return; }
    cmdActive = 0;
    if (!t.provider) { cmdAll = cmdResults = []; cmdStale = false; cmdRender('done'); return; }
    cmdCtrl?.abort();
    cmdCtrl = new AbortController();
    const signal = cmdCtrl.signal;
    cmdRender('loading');
    try {
      const res = await t.provider.search(q, signal);
      if (signal.aborted || q !== cmdQuery) return;
      cmdAll = res;
      applyCmdFilters();
      cmdStale = false;
      cmdRender('done');
      if (cmdPendingEnter) { cmdPendingEnter = false; cmdPick(cmdActive, true); }
    } catch (e) {
      if (signal.aborted) return;
      cmdAll = cmdResults = [];
      cmdStale = cmdPendingEnter = false;
      cmdRender('error');
    }
  }, 220);

  async function cmdPick(i, open = true) {
    const q = cmdQuery;
    if (i >= cmdResults.length) { // création manuelle
      afterAdd(addItem({ nom: q }, { merge: false }), true);
      resetQuery();
      return;
    }
    const r = cmdResults[i];
    const row = $(`#cmd-pop [data-r="${i}"]`);
    row?.classList.add('animate-pulse');
    try {
      const values = r.load ? await r.load(cmdFilters) : r.values; // filtres actifs : ex. langue choisie
      const res = addItem(values || {});
      if (open) resetQuery();
      afterAdd(res, open);
      if (!open && row) { const b = row.querySelector('[data-quick]'); if (b) b.innerHTML = '✓'; }
    } catch (e) {
      toast(`Impossible de charger la fiche : ${e.message}`);
    } finally {
      row?.classList.remove('animate-pulse');
    }
  }

  function resetQuery() {
    const c = cur();
    cmdQuery = '';
    cmdAll = cmdResults = [];
    cmdFilters = {};
    view(c).q = '';
    const q = $('#q');
    if (q) { q.value = ''; q.blur(); }
    $('#q-clear')?.classList.add('hidden');
    cmdClose();
    store.save();
    refreshContent();
  }

  // ================================================================== FICHE (panneau)
  let drawerItem = null;

  function openDrawer(item) {
    const c = cur();
    if (!c || !item) return;
    drawerItem = item;
    const ui = uiOf(c), t = typeOf(c);
    const imgCol = c.columns.find((x) => x.type === 'image');
    const own = imgCol ? safeUrl(item[imgCol.key]) : '';
    const img = imgCol ? imgOr(own, c, item) : '';
    const fields = c.columns.filter((col) => !col.computed && col.type !== 'image' && col.key !== 'nom' && col.key !== 'quantite');
    const computed = c.columns.filter((col) => col.computed).map((col) => [col, getVal(item, col)]).filter(([, v]) => v != null && v !== '');
    const isLong = (col) => col.key === 'notes';

    const input = (col) => {
      const v = item[col.key] ?? '';
      const id = `d-${col.key}`;
      const opts = new Set(col.options || []);
      if (!isNumericType(col.type)) c.items.forEach((it) => { if (it[col.key]) opts.add(String(it[col.key])); });
      const list = opts.size && !isNumericType(col.type) ? `<datalist id="dl-${esc(col.key)}">${[...opts].slice(0, 200).map((o) => `<option value="${esc(o)}">`).join('')}</datalist>` : '';
      let el;
      if (isLong(col)) el = `<textarea id="${id}" name="${esc(col.key)}" rows="3" class="resize-y">${esc(v)}</textarea>`;
      else if (col.type === 'year') el = `<input id="${id}" name="${esc(col.key)}" inputmode="numeric" value="${esc(v)}" placeholder="—">`;
      else if (isNumericType(col.type)) el = `<input id="${id}" name="${esc(col.key)}" inputmode="decimal" value="${esc(typeof v === 'number' ? String(v).replace('.', ',') : v)}" placeholder="${col.type === 'money' ? '€' : '—'}">`;
      else el = `<input id="${id}" name="${esc(col.key)}" value="${esc(v)}" ${list ? `list="dl-${esc(col.key)}"` : ''} autocomplete="off" placeholder="—">${list}`;
      return `<label class="field ${isLong(col) ? 'col-span-2' : ''}" for="${id}"><span>${esc(col.label)}</span>${el}</label>`;
    };

    drawer.innerHTML = `
      <div class="flex items-center gap-1 border-b border-line px-3 py-2">
        <button type="button" class="btn btn-quiet btn-icon" data-d="close" aria-label="Fermer">${icon('x', 'size-5')}</button>
        <span class="flex-1 truncate px-1 text-xs text-muted">Enregistré automatiquement</span>
        <button type="button" class="btn btn-quiet" data-d="dup">${icon('copy')} <span class="hidden sm:inline">Dupliquer</span></button>
        <button type="button" class="btn btn-quiet text-accent" data-d="del">${icon('trash')} <span class="hidden sm:inline">Supprimer</span></button>
      </div>
      <div class="flex-1 overflow-y-auto">
        ${imgCol ? `
        <div class="group relative bg-paper ${ui.theme === 'tcg' ? 'px-16 py-6' : ''}">
          <div class="${ui.theme === 'tcg' ? 'mx-auto aspect-[63/88] max-w-60 overflow-hidden rounded-[4.5%/3.2%] shadow-xl' : 'aspect-[16/10] overflow-hidden'}">
            ${img ? `<img src="${esc(img)}" alt="" class="h-full w-full ${ui.theme === 'tcg' ? 'object-cover' : 'object-contain p-4 mix-blend-multiply dark:mix-blend-normal'}">` : `<div class="grid h-full min-h-40 place-items-center text-ink/25">${mark(t, 'size-14')}</div>`}
          </div>
          <div class="absolute right-3 bottom-3 flex gap-1.5">
            <button type="button" class="btn bg-surface/90 backdrop-blur" data-d="photo">${icon('camera')} Photo</button>
            <button type="button" class="btn btn-icon bg-surface/90 backdrop-blur" data-d="photo-url" title="Coller une URL d'image">${icon('link')}</button>
            ${own ? `<button type="button" class="btn btn-icon bg-surface/90 backdrop-blur" data-d="photo-clear" title="Retirer l'image">${icon('x')}</button>` : ''}
          </div>
        </div>` : ''}
        <div class="px-6 pt-6 pb-10">
          <textarea name="nom" rows="1" placeholder="Nom" class="w-full resize-none border-0 bg-transparent p-0 text-2xl font-medium leading-tight shadow-none focus:ring-0">${esc(item.nom || '')}</textarea>
          <div class="mt-4 flex flex-wrap items-center gap-3">
            ${colOf(c, 'quantite') ? `<span class="stepper scale-110" data-stop="1"><button type="button" data-d="dec">−</button><span id="d-qty">${fmtNum(parseNum(item.quantite) ?? 0)}</span><button type="button" data-d="inc">+</button></span>
              <span class="text-sm text-muted">${plural(parseNum(item.quantite) ?? 0, ui.noun || ['exemplaire', 'exemplaires'])}</span>` : ''}
            <span id="d-computed" class="ml-auto flex flex-wrap gap-2">${computedHtml(computed)}</span>
          </div>
          <div class="mt-7 grid grid-cols-2 gap-x-4 gap-y-4">${fields.map(input).join('')}</div>
          ${linksHtml(ui.links ? ui.links(item) : [])}
        </div>
      </div>`;

    autoGrow(drawer.querySelector('textarea[name=nom]'));
    drawer.classList.remove('translate-x-full', 'invisible');
    drawer.setAttribute('aria-hidden', 'false');
    scrim.classList.remove('pointer-events-none', 'opacity-0');
  }

  // Liens externes proposés par le type (ex. cote d'un vin) : recherche pré-remplie, ouverte dans un nouvel onglet
  function linksHtml(links) {
    const ok = links.filter((l) => safeUrl(l.url));
    if (!ok.length) return '';
    return `
      <div class="mt-8 border-t border-line pt-5">
        <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Trouver la cote</p>
        <div class="mt-3 flex flex-wrap gap-2">
          ${ok.map((l) => `<a class="btn" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.label)}${l.hint ? ` <span class="font-normal text-muted">· ${esc(l.hint)}</span>` : ''} ${icon('arrowRight', 'size-3.5 -rotate-45')}</a>`).join('')}
        </div>
        <p class="mt-2 text-xs text-muted">Recopiez le prix dans « Valeur actuelle ».</p>
      </div>`;
  }

  function computedHtml(list) {
    return list.map(([col, v]) => col.type === 'status'
      ? cardHelpers.status(v)
      : `<span class="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs text-muted">${esc(col.label)} <strong class="font-semibold text-ink">${esc(v)}</strong></span>`).join('');
  }

  function closeDrawer(silent) {
    if (!drawerItem && silent) return;
    drawerItem = null;
    drawer.classList.add('translate-x-full');
    setTimeout(() => { if (!drawerItem) drawer.classList.add('invisible'); }, 300);
    drawer.setAttribute('aria-hidden', 'true');
    scrim.classList.add('pointer-events-none', 'opacity-0');
  }

  const autoGrow = (ta) => { if (!ta) return; ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; };

  const drawerChanged = debounce(() => {
    store.save();
    if (!cur()) return;
    renderStats();
    refreshContent();
  }, 250);

  drawer.addEventListener('input', (e) => {
    const it = drawerItem, c = cur();
    if (!it || !c || !e.target.name) return;
    const col = colOf(c, e.target.name);
    if (!col) return;
    it[col.key] = coerce(col, e.target.value);
    if (e.target.name === 'nom') autoGrow(e.target);
    const comp = c.columns.filter((x) => x.computed).map((x) => [x, getVal(it, x)]).filter(([, v]) => v != null && v !== '');
    const box = $('#d-computed');
    if (box) box.innerHTML = computedHtml(comp);
    if (typeof uiOf(c).placeholder === 'function' && ['nom', 'producteur', 'millesime', 'couleur'].includes(col.key)) {
      const image = drawer.querySelector('.group.relative.bg-paper img');
      const imageCol = c.columns.find((x) => x.type === 'image');
      if (image && imageCol) image.src = imgOr(it[imageCol.key], c, it);
    }
    drawerChanged();
  });

  drawer.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-d]')?.dataset.d;
    if (!a) return;
    const c = cur(), it = drawerItem;
    if (a === 'close') return closeDrawer();
    if (!it || !c) return;
    const imgCol = c.columns.find((x) => x.type === 'image');
    if (a === 'inc' || a === 'dec') {
      it.quantite = Math.max(0, (parseNum(it.quantite) ?? 0) + (a === 'inc' ? 1 : -1));
      $('#d-qty').textContent = fmtNum(it.quantite);
      drawerChanged();
    } else if (a === 'dup') {
      const copy = { ...clone(it), _id: uid(), _t: Date.now() };
      c.items.push(copy);
      store.save();
      refreshAll();
      openDrawer(copy);
      toast('Copie créée');
    } else if (a === 'del') {
      if (!confirm(`Supprimer « ${it.nom || 'cet élément'} » ?`)) return;
      const idx = c.items.indexOf(it);
      c.items.splice(idx, 1);
      store.save();
      closeDrawer();
      refreshAll();
      toast('Élément supprimé', { label: 'Annuler', run: () => { c.items.splice(idx, 0, it); store.save(); refreshAll(); } });
    } else if (a === 'photo') {
      const f = await pickPhoto();
      if (!f || !imgCol) return;
      try {
        it[imgCol.key] = await resizeImage(f);
        store.save();
        openDrawer(it);
        refreshContent();
      } catch (err) { toast(`Photo impossible : ${err.message}`); }
    } else if (a === 'photo-url') {
      const u = prompt("URL de l'image :", String(it[imgCol.key] || '').startsWith('data:') ? '' : it[imgCol.key] || '');
      if (u == null) return;
      if (u && !safeUrl(u)) { toast('URL invalide'); return; }
      it[imgCol.key] = u.trim();
      store.save();
      openDrawer(it);
      refreshContent();
    } else if (a === 'photo-clear') {
      it[imgCol.key] = '';
      store.save();
      openDrawer(it);
      refreshContent();
    }
  });

  scrim.addEventListener('click', () => closeDrawer());

  // Photos : redimensionnées (JPEG 480 px) pour ménager le stockage du navigateur
  const photoInput = $('#photo-input');
  function pickPhoto() {
    return new Promise((resolve) => {
      photoInput.value = '';
      photoInput.onchange = () => resolve(photoInput.files[0] || null);
      photoInput.click();
    });
  }

  function resizeImage(file, max = 480, quality = 0.78) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * r), height: Math.round(img.height * r) });
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible')); };
      img.src = url;
    });
  }

  // ================================================================== ÉVÉNEMENTS
  app.addEventListener('change', (e) => {
    if (e.target.matches('[data-page-size]')) {
      const v = view(cur());
      const old = PAGE_SIZES.includes(v.pageSize) ? v.pageSize : PAGE_SIZES[1];
      const first = (pageNo - 1) * old; // garde en vue le même premier élément
      v.pageSize = Number(e.target.value);
      store.save();
      goPage(v.pageSize ? Math.floor(first / v.pageSize) + 1 : 1);
    } else if (e.target.matches('[data-page-input]')) {
      const n = parseInt(e.target.value, 10);
      if (n) goPage(n); else e.target.value = pageNo;
    }
  });
  app.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-page-input]')) { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); }
  });

  app.addEventListener('click', async (e) => {
    const t = e.target;

    const pg = t.closest('[data-page]')?.dataset.page;
    if (pg) {
      goPage({ first: 1, prev: pageNo - 1, next: pageNo + 1, last: pageCount }[pg]);
      return;
    }

    // menus déroulants : un seul ouvert à la fois
    const sum = t.closest('details.pop > summary');
    if (sum) {
      document.querySelectorAll('details.pop[open]').forEach((d) => { if (d !== sum.parentElement) d.open = false; });
      return;
    }

    const selBox = t.closest('input[data-sel]');
    if (selBox) { toggleSel(selBox.dataset.sel, selBox.checked, e.shiftKey); return; }
    const selAll = t.closest('input[data-sel-all]');
    if (selAll) {
      if (selAll.checked) lastItems.forEach((it) => selected.add(it._id));
      else lastItems.forEach((it) => selected.delete(it._id));
      refreshContent();
      renderSelBar();
      return;
    }
    if (t.closest('td.sel, th.sel')) return; // marge autour de la case

    const create = t.closest('[data-create]');
    if (create) {
      const c = createCollection(create.dataset.create, $('#new-name')?.value.trim());
      go(c.id);
      setTimeout(() => $('#q')?.focus(), 50);
      return;
    }

    const act = t.closest('[data-act]')?.dataset.act;
    const card = t.closest('[data-id]');

    // quantités directement sur la carte / la ligne
    if ((act === 'inc' || act === 'dec') && card) {
      const c = cur(), it = c.items.find((x) => x._id === card.dataset.id);
      if (!it) return;
      it.quantite = Math.max(0, (parseNum(it.quantite) ?? 0) + (act === 'inc' ? 1 : -1));
      store.save();
      renderStats();
      refreshContent();
      return;
    }

    if (act) {
      document.querySelectorAll('details.pop[open]').forEach((d) => { d.open = false; });
      return handleAction(act);
    }

    const mode = t.closest('[data-mode]')?.dataset.mode;
    if (mode) { view(cur()).mode = mode; store.save(); renderToolbar(); renderContent(); return; }

    const ex = t.closest('[data-example]')?.dataset.example;
    if (ex) { const q = $('#q'); q.value = ex; q.focus(); q.dispatchEvent(new Event('input')); return; }

    const sortTh = t.closest('th[data-sort]');
    if (sortTh) {
      const v = view(cur()), k = sortTh.dataset.sort;
      if (v.sort.key !== k) v.sort = { key: k, dir: 'asc' };
      else if (v.sort.dir === 'asc') v.sort.dir = 'desc';
      else v.sort = { key: '_added', dir: 'desc' };
      store.save();
      renderToolbar();
      renderContent();
      return;
    }

    if (t.closest('#q-clear')) { resetQuery(); return; }

    const rf = t.closest('[data-rf]');
    if (rf || t.closest('[data-rf-clear]')) {
      if (rf) {
        const set = (cmdFilters[rf.dataset.rf] ||= new Set());
        set.has(rf.dataset.rv) ? set.delete(rf.dataset.rv) : set.add(rf.dataset.rv);
      } else cmdFilters = {};
      cmdActive = 0;
      applyCmdFilters();
      cmdRender('done');
      $('#q')?.focus();
      return;
    }

    const quick = t.closest('[data-quick]');
    if (quick) { e.stopPropagation(); cmdPick(+quick.dataset.quick, false); return; }
    const res = t.closest('#cmd-pop [data-r]');
    if (res) { cmdPick(+res.dataset.r, true); return; }

    if (card && !t.closest('a, input, [data-stop]')) {
      const it = cur().items.find((x) => x._id === card.dataset.id);
      if (it) openDrawer(it);
    }
  });

  app.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('article[data-id]')) {
      const it = cur().items.find((x) => x._id === e.target.dataset.id);
      if (it) openDrawer(it);
    }
    if (e.target.id === 'coll-name' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
    if (e.target.id !== 'q') return;
    const n = cmdResults.length + 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdActive = (cmdActive + 1) % n; cmdRender('done'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdActive = (cmdActive - 1 + n) % n; cmdRender('done'); }
    else if (e.key === 'Enter' && cmdQuery) {
      e.preventDefault();
      if (cmdStale && cmdActive < cmdResults.length) cmdPendingEnter = true; // attendre les résultats à jour
      else cmdPick(cmdActive, true);
    }
    else if (e.key === 'Escape') {
      e.preventDefault();
      if (!$('#cmd-pop').classList.contains('hidden')) cmdClose();
      else resetQuery();
    }
  });

  app.addEventListener('input', (e) => {
    const t = e.target, c = cur();
    if (t.id === 'q') {
      cmdQuery = t.value.trim();
      cmdStale = true;
      cmdActive = 0;
      view(c).q = t.value;
      $('#q-clear').classList.toggle('hidden', !t.value);
      saveSoon();
      refreshContent();
      if (cmdQuery) cmdRender('loading'); // grise tout de suite les anciens résultats
      cmdSearch();
      return;
    }
    if (t.dataset.filter) {
      view(c).filters[t.dataset.filter] = t.value;
      saveSoon();
      refreshContent();
    }
    if (t.dataset.edit) editCell(t, false);
  });

  // cellule du tableau : valeur d'origine gardée pour Échap, mise au propre à la sortie
  app.addEventListener('focusin', (e) => { if (e.target.dataset?.edit) e.target.dataset.orig = e.target.value; });
  app.addEventListener('change', (e) => { if (e.target.dataset?.edit) editCell(e.target, true); });
  app.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!t.dataset?.edit) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      t.value = t.dataset.orig ?? t.value;
      editCell(t, true);
      t.blur();
    } else if (e.key === 'Enter') { // comme un tableur : même colonne, ligne suivante (Maj : précédente)
      e.preventDefault();
      const tr = t.closest('tr')?.[e.shiftKey ? 'previousElementSibling' : 'nextElementSibling'];
      const next = tr?.querySelector(`[data-edit="${CSS.escape(t.dataset.edit)}"]`);
      if (next) { next.focus(); next.select(); } else t.blur();
    }
  });

  app.addEventListener('focusin', (e) => {
    if (e.target.id !== 'q') return;
    typeOf(cur()).provider?.prepare?.(); // précharge le catalogue (X-Wines) avant la première frappe
    if (cmdQuery) cmdOpen();
  });

  app.addEventListener('change', (e) => {
    const t = e.target, c = cur();
    if (t.id === 'sort') {
      const [key, dir] = t.value.split(':');
      view(c).sort = { key, dir: dir === 'asc' ? 'asc' : 'desc' };
      store.save();
      renderToolbar();
      renderContent();
    }
    if (t.dataset.facetVal != null) {
      const key = t.closest('[data-facet]').dataset.facet, v = view(c);
      const sel = new Set(v.facets[key] || []);
      t.checked ? sel.add(t.dataset.facetVal) : sel.delete(t.dataset.facetVal);
      v.facets[key] = [...sel];
      store.save();
      // garder le menu ouvert pendant la sélection
      renderContent();
      renderStats();
      const summary = t.closest('details').querySelector('summary');
      const n = sel.size;
      summary.dataset.on = n ? 1 : 0;
      summary.firstChild.textContent = `${colOf(c, key).label}${n ? ` · ${n === 1 ? [...sel][0] : n}` : ''} `;
    }
  });

  app.addEventListener('focusout', (e) => {
    if (e.target.id === 'coll-name') {
      const c = cur(), name = e.target.textContent.trim();
      if (name && name !== c.name) { c.name = name; store.save(); renderSidebar(); document.title = `${name} — My Little Collection`; toast('Collection renommée'); }
      else e.target.textContent = c.name;
    }
  });

  // clic hors des menus / de la recherche
  document.addEventListener('click', (e) => {
    if (e.target.id === 'side-scrim') sideOpen(false);
    // un élément retiré du DOM pendant le clic (liste redessinée) n'est pas un clic « en dehors »
    if (!e.target.isConnected) return;
    if (!e.target.closest('details.pop')) document.querySelectorAll('details.pop[open]').forEach((d) => {
      d.open = false;
      if (d.dataset.facet) renderToolbar();
    });
    if (!e.target.closest('#cmd')) cmdClose();
  });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (e.key === 'Escape' && drawerItem) { closeDrawer(); return; }
    if (e.key === 'Escape' && selected.size && !typing) { clearSel(); return; }
    if (e.key === '/' && !typing && cur() && location.hash.startsWith('#/c/')) { e.preventDefault(); $('#q')?.focus(); }
  });

  function handleAction(act) {
    const c = cur();
    switch (act) {
      case 'side': return sideOpen(true);
      case 'import': return openFile();
      case 'export': return exportCsv();
      case 'backup': return exportBackup();
      case 'restore': backupInput.value = ''; return backupInput.click();
      case 'backup-later': store.state.backup = { ...store.state.backup, snoozeUntil: Date.now() + 7 * DAY }; store.save(); return renderBackupNag();
      case 'columns': return openColumns();
      case 'add-column': return openColumns(true);
      case 'refresh': return refreshPrices();
      case 'new-blank': return afterAdd(addItem({}, { merge: false }), true);
      case 'open-cmd': { const q = $('#q'); q.focus(); cmdQuery = q.value.trim(); cmdSearch(); return; }
      case 'clear-filters': { const v = view(c); v.facets = {}; v.filters = {}; store.save(); renderToolbar(); renderContent(); return; }
      case 'clear-all': { const v = view(c); v.facets = {}; v.filters = {}; store.save(); resetQuery(); renderToolbar(); return; }
      case 'delete-collection': {
        if (!confirm(`Supprimer définitivement « ${c.name} » (${c.items.length} élément(s)) ?\nAstuce : exportez-la d'abord (Exporter).`)) return;
        store.state.collections = store.state.collections.filter((x) => x.id !== c.id);
        store.state.currentId = null;
        store.save();
        location.hash = '#/';
        return;
      }
    }
  }

  // ================================================================== SÉLECTION
  function toggleSel(id, on, range) {
    if (range && lastSelId) {
      const a = lastItems.findIndex((x) => x._id === lastSelId), b = lastItems.findIndex((x) => x._id === id);
      if (a >= 0 && b >= 0) lastItems.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((it) => (on ? selected.add(it._id) : selected.delete(it._id)));
    }
    on ? selected.add(id) : selected.delete(id);
    lastSelId = id;
    refreshContent();
    renderSelBar();
  }

  function clearSel() {
    selected.clear();
    lastSelId = null;
    refreshContent();
    renderSelBar();
  }

  const selItems = () => cur()?.items.filter((it) => selected.has(it._id)) || [];

  const selbar = $('#selbar');
  function renderSelBar() {
    const c = cur();
    if (c && selected.size) { const ids = new Set(c.items.map((it) => it._id)); selected.forEach((id) => { if (!ids.has(id)) selected.delete(id); }); }
    const n = selected.size;
    const show = n > 0 && c && location.hash.startsWith('#/c/');
    selbar.classList.toggle('hidden', !show);
    selbar.classList.toggle('flex', !!show);
    toastEl.classList.toggle('lift', !!show);
    if (!show) return;
    selbar.innerHTML = `
      <span class="px-2 text-sm font-medium tabular-nums">${n} sélectionné${n > 1 ? 's' : ''}</span>
      <span class="mx-1 h-5 w-px bg-paper/20"></span>
      ${colOf(c, 'quantite') ? `<button type="button" data-bulk="dec" title="Quantité −1">−1</button><button type="button" data-bulk="inc" title="Quantité +1">+1</button>` : ''}
      <button type="button" data-bulk="edit">${icon('pencil')}<span class="hidden sm:inline">Modifier</span></button>
      <button type="button" data-bulk="dup">${icon('copy')}<span class="hidden sm:inline">Dupliquer</span></button>
      <button type="button" data-bulk="export">${icon('download')}<span class="hidden sm:inline">Exporter</span></button>
      <button type="button" data-bulk="del" class="text-red-300">${icon('trash')}<span class="hidden sm:inline">Supprimer</span></button>
      <span class="mx-1 h-5 w-px bg-paper/20"></span>
      <button type="button" data-bulk="clear" title="Désélectionner (Échap)">${icon('x')}</button>`;
  }

  selbar.addEventListener('click', (e) => {
    const a = e.target.closest('[data-bulk]')?.dataset.bulk;
    const c = cur();
    if (!a || !c) return;
    const items = selItems();
    if (a === 'clear') return clearSel();
    if (a === 'inc' || a === 'dec') {
      items.forEach((it) => { it.quantite = Math.max(0, (parseNum(it.quantite) ?? 0) + (a === 'inc' ? 1 : -1)); });
      store.save();
      renderStats();
      refreshContent();
    } else if (a === 'dup') {
      const t0 = Date.now();
      const copies = items.map((it, i) => ({ ...clone(it), _id: uid(), _t: t0 + i }));
      c.items.push(...copies);
      selected = new Set(copies.map((x) => x._id));
      store.save();
      refreshAll();
      renderSelBar();
      toast(`${copies.length} copie(s) créée(s), sélectionnée(s)`);
    } else if (a === 'export') {
      exportCsv(items);
    } else if (a === 'edit') {
      openBulkEdit();
    } else if (a === 'del') {
      if (!confirm(`Supprimer ${items.length} élément(s) ?`)) return;
      const removed = c.items.map((it, i) => [it, i]).filter(([it]) => selected.has(it._id));
      c.items = c.items.filter((it) => !selected.has(it._id));
      selected.clear();
      store.save();
      refreshAll();
      renderSelBar();
      toast(`${removed.length} élément(s) supprimé(s)`, { label: 'Annuler', run: () => {
        removed.forEach(([it, i]) => c.items.splice(i, 0, it));
        store.save();
        if (cur() === c) refreshAll();
      } });
    }
  });

  // Modification groupée : une colonne, une valeur, appliquée à toute la sélection
  const dlgBulk = $('#dlg-bulk');
  function openBulkEdit() {
    const c = cur();
    const cols = c.columns.filter((x) => !x.computed && x.type !== 'image');
    $('#bulk-col').innerHTML = cols.map((x) => `<option value="${esc(x.key)}">${esc(x.label)}</option>`).join('');
    $('#bulk-count').textContent = `${selected.size} élément(s) sélectionné(s)`;
    $('#bulk-val').value = '';
    dlgBulk.showModal();
    $('#bulk-val').focus();
  }
  // Entrée applique (sinon le premier bouton du formulaire, « fermer », serait déclenché)
  $('#bulk-val').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); dlgBulk.querySelector('button[value=save]').click(); }
  });
  dlgBulk.querySelector('form').addEventListener('submit', (e) => {
    if (e.submitter?.value !== 'save') return;
    const c = cur(), col = colOf(c, $('#bulk-col').value);
    if (!col) return;
    const raw = $('#bulk-val').value;
    selItems().forEach((it) => { it[col.key] = coerce(col, raw); });
    store.save();
    refreshAll();
    toast(`« ${col.label} » mis à jour sur ${selected.size} élément(s)`);
  });

  // ================================================================== COLONNES
  const dlgCols = $('#dlg-columns'), colList = $('#col-list');
  let draft = [];
  $('#new-col-type').innerHTML = Object.entries(MLC.COLUMN_TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('');

  function renderColList() {
    renderSuggestions();
    colList.innerHTML = draft.map((col, i) => `
      <div class="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink/[0.03] sm:grid-cols-[auto_1fr_11rem_auto]" data-i="${i}">
        <input type="checkbox" data-f="visible" ${col.hidden ? '' : 'checked'} title="Visible dans le tableau">
        <input data-f="label" value="${esc(col.label)}" aria-label="Nom de la colonne">
        ${col.computed
          ? '<span class="col-span-2 px-3 text-xs text-muted sm:col-span-1">calculée</span>'
          : `<select data-f="type" class="col-span-2 sm:col-span-1">${Object.entries(MLC.COLUMN_TYPES).map(([k, l]) => `<option value="${k}" ${k === col.type ? 'selected' : ''}>${l}</option>`).join('')}</select>`}
        <span class="flex justify-end">
          <button type="button" class="btn btn-quiet btn-icon size-8" data-a="up" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button>
          <button type="button" class="btn btn-quiet btn-icon size-8" data-a="down" ${i === draft.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button>
          <button type="button" class="btn btn-quiet btn-icon size-8 text-accent" data-a="del" aria-label="Supprimer">✕</button>
        </span>
      </div>`).join('');
  }

  function openColumns(focusNew) {
    draft = clone(cur().columns);
    renderColList();
    dlgCols.showModal();
    if (focusNew) { const i = $('#new-col-label'); i.scrollIntoView({ block: 'center' }); i.focus(); }
  }

  // Colonnes proposées : celles du modèle (par défaut + optionnelles) absentes de la collection
  function renderSuggestions() {
    const t = typeOf(cur());
    const all = [...t.columns, ...(t.optionalColumns || [])];
    const missing = all.filter((d) => !draft.some((x) => x.key === d.key));
    $('#col-suggest-box').hidden = !missing.length;
    $('#col-suggest').innerHTML = missing.map((d) => `<button type="button" class="chip py-1 text-xs" data-suggest="${esc(d.key)}">${icon('plus', 'size-3')} ${esc(d.label)}</button>`).join('');
  }

  colList.addEventListener('input', (e) => {
    const row = e.target.closest('[data-i]');
    if (!row) return;
    const col = draft[row.dataset.i], f = e.target.dataset.f;
    if (f === 'visible') col.hidden = !e.target.checked;
    else if (f === 'label') col.label = e.target.value;
    else if (f === 'type') col.type = e.target.value;
  });

  colList.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    const i = +e.target.closest('[data-i]').dataset.i;
    if (a === 'up' && i > 0) [draft[i - 1], draft[i]] = [draft[i], draft[i - 1]];
    else if (a === 'down' && i < draft.length - 1) [draft[i + 1], draft[i]] = [draft[i], draft[i + 1]];
    else if (a === 'del') {
      draft.splice(i, 1);
    }
    renderColList();
  });

  $('#btn-add-col').addEventListener('click', () => {
    const input = $('#new-col-label'), label = input.value.trim();
    if (!label) { input.focus(); return; }
    draft.push({ key: uniqueKey(draft, slug(label)), label, type: $('#new-col-type').value });
    input.value = '';
    renderColList();
  });
  $('#new-col-label').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#btn-add-col').click(); } });

  $('#col-suggest').addEventListener('click', (e) => {
    const key = e.target.closest('[data-suggest]')?.dataset.suggest;
    if (!key) return;
    const t = typeOf(cur());
    const def = [...t.columns, ...(t.optionalColumns || [])].find((d) => d.key === key);
    if (def) draft.push({ ...clone(def), hidden: false });
    renderColList();
  });

  dlgCols.querySelector('form').addEventListener('submit', (e) => {
    if (e.submitter?.value !== 'save') return;
    const c = cur(), v = view(c);
    draft.forEach((col) => { col.label = col.label.trim() || col.key; });
    const kept = new Set(draft.map((x) => x.key));
    const removed = c.columns.filter((x) => !kept.has(x.key)).map((x) => x.key);
    // colonnes du modèle : valeurs conservées (la colonne peut revenir via les suggestions)
    const t = typeOf(c), known = new Set([...t.columns, ...(t.optionalColumns || [])].map((d) => d.key));
    c.items.forEach((it) => removed.forEach((k) => { if (!known.has(k)) delete it[k]; }));
    removed.forEach((k) => { delete v.filters[k]; delete v.facets[k]; if (v.sort.key === k) v.sort = { key: '_added', dir: 'desc' }; });
    c.columns = draft;
    store.save();
    refreshAll();
  });

  // ================================================================== CSV
  function exportCsv(items) {
    const c = cur();
    items ||= c.items;
    const rows = [c.columns.map((x) => x.label)];
    for (const it of items) {
      rows.push(c.columns.map((col) => {
        const v = getVal(it, col);
        if (v == null) return '';
        return typeof v === 'number' ? String(v).replace('.', ',') : v;
      }));
    }
    download(`${slug(c.name)}${items === c.items ? '' : '-selection'}-${new Date().toISOString().slice(0, 10)}.csv`, MLC.csv.stringify(rows, ';'));
    toast(`${items.length} élément(s) exporté(s)`);
  }

  // ================================================================== SAUVEGARDE
  // tout l'état (collections, colonnes, vues, photos) dans un seul fichier JSON, à restaurer tel quel
  const DAY = 864e5;
  function backupAge() {
    const at = store.state.backup?.at;
    if (!at) return null;
    const d = Math.floor((Date.now() - at) / DAY);
    return d <= 0 ? "aujourd'hui" : d === 1 ? 'hier' : `il y a ${d} jours`;
  }

  function exportBackup() {
    const { backup, ...data } = store.state;
    const n = data.collections.length;
    download(`mylittlecollection-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ app: 'mylittlecollection', format: 1, savedAt: new Date().toISOString(), data }), 'application/json');
    store.state.backup = { at: Date.now() };
    store.save();
    renderBackupNag();
    const p = $('#export-menu p');
    if (p) p.textContent = "Dernière sauvegarde : aujourd'hui";
    toast(`Sauvegarde de ${n} collection${n > 1 ? 's' : ''} téléchargée`);
  }

  const backupInput = $('#backup-input');
  backupInput.addEventListener('change', async () => {
    const f = backupInput.files[0];
    if (!f) return;
    let file;
    try { file = JSON.parse(await f.text()); } catch (e) { /* pas du JSON */ }
    const data = file?.app === 'mylittlecollection' ? file.data : null;
    if (!data || !Array.isArray(data.collections)) { toast("Ce fichier n'est pas une sauvegarde My Little Collection"); return; }
    const when = file.savedAt ? new Date(file.savedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '?';
    const now = store.state.collections.length, m = data.collections.length;
    if (!confirm(`Restaurer la sauvegarde du ${when} (${m} collection${m > 1 ? 's' : ''}) ?\nElle remplacera ${now > 1 ? `vos ${now} collections actuelles` : now ? 'votre collection actuelle' : 'le contenu actuel'}.`)) return;
    Object.keys(store.state).forEach((k) => delete store.state[k]);
    Object.assign(store.state, data, { backup: { at: Date.parse(file.savedAt) || Date.now() } });
    await store.flush();
    location.reload(); // repasse par les migrations du démarrage
  });

  // rappel discret : jamais sauvegardé après quelques jours d'usage, ou dernière sauvegarde vieille d'un mois
  function renderBackupNag() {
    const el = $('#backup-nag');
    if (!el) return;
    const { collections, backup = {} } = store.state;
    const since = backup.at || Math.min(...collections.map((c) => c.createdAt || Date.now()));
    const due = collections.some((c) => c.items.length)
      && Date.now() - since > (backup.at ? 30 : 3) * DAY
      && !(backup.snoozeUntil > Date.now());
    el.innerHTML = due ? `
      <div class="mx-4 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-gold/35 bg-gold/10 px-3.5 py-2 text-sm sm:mx-6">
        <span class="text-gold">${icon('cloudOff', 'size-[18px]')}</span>
        <span class="min-w-48 flex-1">${backup.at
          ? `Dernière sauvegarde ${esc(backupAge())}. Pensez à en refaire une.`
          : 'Vos collections ne sont enregistrées que dans ce navigateur, jamais sur un serveur. Une sauvegarde évite de tout perdre.'} <a href="#/about" class="whitespace-nowrap text-muted underline underline-offset-2 hover:text-ink">En savoir plus</a></span>
        <span class="flex gap-1.5">
          <button type="button" class="btn btn-quiet h-8 py-0" data-act="backup-later">Plus tard</button>
          <button type="button" class="btn btn-primary h-8 py-0" data-act="backup">${icon('download')} Sauvegarder</button>
        </span>
      </div>` : '';
  }

  const dlgImport = $('#dlg-import'), fileInput = $('#file-input');
  let pending = null;
  const openFile = () => { fileInput.value = ''; fileInput.click(); };
  const matchCol = (columns, h) => {
    const n = norm(h), s = slug(h);
    return columns.find((x) => norm(x.label) === n || norm(x.key) === n || x.key === s);
  };
  const importMode = () => dlgImport.querySelector('input[name="import-mode"]:checked').value;
  const inCollection = () => location.hash.startsWith('#/c/') && cur();

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    const { rows } = MLC.csv.parse(await f.text());
    if (!rows.length) { toast('Fichier CSV vide'); return; }
    const headers = rows[0].map((h) => h.trim());
    pending = { headers, rows: rows.slice(1) };
    const scored = Object.values(MLC.types).map((t) => [t.id, headers.filter((h) => matchCol(t.columns, h)).length]).sort((a, b) => b[1] - a[1]);
    const c = inCollection();
    $('#import-summary').textContent = `${pending.rows.length} ligne(s) et ${headers.length} colonne(s) dans « ${f.name} ».`;
    $('#import-name').value = f.name.replace(/\.[^.]+$/, '');
    $('#import-type').innerHTML = Object.values(MLC.types).map((t) => `<option value="${t.id}" ${t.id === scored[0][0] ? 'selected' : ''}>${esc(t.label)}</option>`).join('');
    $('#import-append-label').hidden = !c;
    $('#import-replace-label').hidden = !c;
    if (c) {
      $('#import-append-label span').textContent = `Ajouter à « ${c.name} »`;
      $('#import-replace-label span').textContent = `Remplacer le contenu de « ${c.name} »`;
    }
    dlgImport.querySelector(`input[value="${c ? 'append' : 'new'}"]`).checked = true;
    updateImportPreview();
    dlgImport.showModal();
  });

  function updateImportPreview() {
    if (!pending) return;
    const mode = importMode();
    $('#import-new-opts').hidden = mode !== 'new';
    const cols = mode === 'new' ? (MLC.types[$('#import-type').value] || MLC.types.generic).columns : cur().columns;
    const known = [], unknown = [];
    pending.headers.forEach((h) => { if (h) (matchCol(cols, h) ? known : unknown).push(h); });
    $('#import-cols').innerHTML = `<strong>Reconnues :</strong> ${known.map(esc).join(', ') || '—'}`
      + (unknown.length ? `<br><strong>Nouvelles colonnes :</strong> ${unknown.map(esc).join(', ')}` : '');
  }
  dlgImport.addEventListener('change', updateImportPreview);

  function guessType(values) {
    const vals = values.filter((v) => v.trim() !== '');
    if (!vals.length) return 'text';
    if (vals.every((v) => /^(https?:\/\/\S+\.(png|jpe?g|webp|gif|avif)(\?\S*)?|data:image\/)/i.test(v.trim()))) return 'image';
    if (vals.every((v) => /^https?:\/\//i.test(v.trim()))) return 'url';
    if (vals.every((v) => /€/.test(v) && parseNum(v) != null)) return 'money';
    if (vals.every((v) => parseNum(v) != null)) return 'number';
    return 'text';
  }

  dlgImport.querySelector('form').addEventListener('submit', (e) => {
    if (e.submitter?.value !== 'save' || !pending) return;
    const mode = importMode();
    const c = mode === 'new' ? createCollection($('#import-type').value, $('#import-name').value.trim()) : cur();
    const map = pending.headers.map((h, i) => {
      if (!h) return null;
      const col = matchCol(c.columns, h);
      if (col) return col.computed ? null : col; // les colonnes calculées sont recalculées
      const created = { key: uniqueKey(c.columns, slug(h)), label: h, type: guessType(pending.rows.map((r) => r[i] ?? '')) };
      c.columns.push(created);
      return created;
    });
    if (mode === 'replace') c.items = [];
    const t0 = Date.now();
    pending.rows.forEach((r, n) => {
      const it = { _id: uid(), _t: t0 + n };
      map.forEach((col, i) => {
        if (!col) return;
        const raw = (r[i] ?? '').trim();
        if (raw !== '') it[col.key] = coerce(col, raw);
      });
      c.items.push(it);
    });
    store.save();
    toast(`${pending.rows.length} élément(s) importé(s)`);
    pending = null;
    if (mode === 'new') go(c.id);
    else refreshAll();
  });

  // ================================================================== COTES
  async function refreshPrices() {
    const c = cur(), p = typeOf(c).provider;
    if (!p?.refresh) return;
    let done = 0, updated = 0, failed = 0;
    toast(`Actualisation des cotes… 0/${c.items.length}`);
    await pool(c.items, 4, async (it) => {
      try {
        const v = await p.refresh(it);
        if (v) { Object.assign(it, v); updated++; }
      } catch (err) { failed++; }
      done++;
      if (done % 5 === 0) toast(`Actualisation des cotes… ${done}/${c.items.length}`);
    });
    store.save();
    if (cur() === c) refreshAll();
    toast(`${updated} cote(s) mise(s) à jour${failed ? `, ${failed} échec(s)` : ''}`);
  }

  // ================================================================== DÉMARRAGE
  // les collections sont lues de façon asynchrone (IndexedDB) avant le premier affichage
  store.ready.then(() => {
    // collections créées avant la refonte : ordre d'ajout + vue par défaut
    store.state.collections.forEach((c) => {
      c.items.forEach((it, i) => { it._t ||= (c.createdAt || 0) + i; });
      const v = view(c);
      v.mode ||= 'grid';
      v.facets ||= {};
      v.filters ||= {};
      if (!v.sort?.key) v.sort = { key: '_added', dir: 'desc' };
    });
    // v2 : tableau par défaut ; cave réduite aux colonnes demandées (les autres deviennent des suggestions)
    if ((store.state.v || 1) < 2) {
      store.state.collections.forEach((c) => {
        view(c).mode = 'table';
        const t = MLC.types[c.type];
        if (c.type !== 'wine' || !t) return;
        const known = new Set([...t.columns, ...(t.optionalColumns || [])].map((d) => d.key));
        const custom = c.columns.filter((col) => !known.has(col.key));
        c.columns = [...clone(t.columns), ...custom];
        ['couleur', 'statut', 'region'].forEach((k) => { delete view(c).facets[k]; });
        if (!c.columns.some((x) => x.key === view(c).sort.key)) view(c).sort = { key: '_added', dir: 'desc' };
      });
      store.state.v = 2;
    }
    if (store.state.v < 3) {
      store.state.collections.forEach((c) => {
        if (c.type === 'pokemon') c.columns = c.columns.filter((col) => col.key !== 'notes');
      });
      store.state.v = 3;
    }
    // v4 : une collection qui porte le nom de son modèle (« Cave à vin ») prend un nom de collection (« Ma cave »)
    if (store.state.v < 4) {
      store.state.collections.forEach((c) => {
        const t = MLC.types[c.type];
        const def = t?.ui?.defaultName;
        if (!def || c.name !== t.label) return;
        let n = def, i = 2;
        while (store.state.collections.some((x) => x !== c && x.name === n)) n = `${def} ${i++}`;
        c.name = n;
      });
      store.state.v = 4;
    }
    // v5 : la cave affiche la photo (fiche et tableau), comme le classeur Pokémon
    if (store.state.v < 5) {
      store.state.collections.forEach((c) => {
        if (c.type !== 'wine' || c.columns.some((col) => col.type === 'image')) return;
        const def = MLC.types.wine?.columns.find((col) => col.key === 'image');
        if (def) c.columns.unshift(clone(def));
      });
      store.state.v = 5;
    }
    // v6 : plus de photos de vins venues des catalogues (Open Food Facts, Wikimedia) ; on garde celles prises par l'utilisateur
    if (store.state.v < 6) {
      store.state.collections.forEach((c) => {
        if (c.type !== 'wine') return;
        c.items.forEach((it) => { if (/^https?:\/\/[^/]*(openfoodfacts|wikimedia|wikipedia)\./i.test(it.image || '')) it.image = ''; });
      });
      store.state.v = 6;
    }
    store.save();

    route();
  });
})();
