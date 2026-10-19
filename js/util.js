window.MLC = window.MLC || {};

MLC.util = (() => {
  const norm = (s) => String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim();

  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'col';

  // "1 234,50 €" → 1234.5 ; renvoie null si non numérique
  function parseNum(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    let s = String(v).replace(/[\s  €$£]/g, '');
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(',', '.');
    if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  const moneyFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  const numFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  const fmtMoney = (n) => (n == null ? '' : moneyFmt.format(n));
  const fmtNum = (n) => (n == null ? '' : numFmt.format(n));

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  function download(filename, text, mime = 'text/csv;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function fetchJson(url, { signal, timeout = 10000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    signal?.addEventListener('abort', () => ctrl.abort());
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // Exécute des tâches async avec une concurrence limitée
  async function pool(items, size, fn) {
    let i = 0;
    const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) { const idx = i++; await fn(items[idx], idx); }
    });
    await Promise.all(workers);
  }

  // Charge un fichier de données embarqué : un <script> (et non fetch) pour fonctionner aussi en file://
  const loadScript = (src, ready) => new Promise((resolve, reject) => {
    if (ready()) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`catalogue introuvable (${src})`));
    document.head.appendChild(s);
  });

  const isNumericType = (t) => t === 'number' || t === 'money' || t === 'year';

  return { norm, slug, parseNum, fmtMoney, fmtNum, esc, uid, debounce, download, fetchJson, pool, loadScript, isNumericType };
})();
