window.MLC = window.MLC || {};

// Persistance 100 % locale, dans le navigateur.
// IndexedDB (quota de plusieurs centaines de Mo, écriture asynchrone qui ne fige pas la page) ;
// localStorage (≈ 5 Mo) seulement en secours, et pour reprendre les données des versions précédentes.
// L'état vit en mémoire : save() programme une écriture groupée, faite en arrière-plan.
MLC.store = (() => {
  const LS_KEY = 'mlc:v1';
  const DB = 'mlc', OS = 'kv', REC = 'state';
  const state = { collections: [], currentId: null };
  let db = null;

  function fromLocalStorage() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY));
      if (s && Array.isArray(s.collections)) return s;
    } catch (e) { /* stockage vide ou illisible */ }
    return null;
  }

  const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB indisponible'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(OS);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('IndexedDB bloquée'));
    });
  }

  function write() {
    if (!db) {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OS, 'readwrite');
      tx.objectStore(OS).put(state, REC); // clone structuré : pas de JSON.stringify sur le fil principal
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }

  let timer = null, warned = false;
  function flush() {
    clearTimeout(timer);
    timer = null;
    return write().catch((e) => {
      if (warned) return;
      warned = true;
      alert(`Impossible d'enregistrer dans le navigateur (${e?.name === 'QuotaExceededError' ? 'stockage plein' : e?.message || 'erreur'}). Faites une sauvegarde (Exporter › Sauvegarde complète).`);
    });
  }

  // regroupe les modifications rapprochées (frappe, +/−) en une seule écriture
  function save() {
    clearTimeout(timer);
    timer = setTimeout(flush, 150);
    return true;
  }

  // onglet fermé ou mis en arrière-plan : on écrit tout de suite
  const flushIfPending = () => { if (timer) flush(); };
  addEventListener('pagehide', flushIfPending);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushIfPending(); });

  const ready = (async () => {
    let loaded = null;
    try {
      db = await openDb();
      loaded = await req(db.transaction(OS).objectStore(OS).get(REC));
      if (!loaded) {
        // première ouverture depuis la version localStorage : on reprend les données puis on libère la place
        loaded = fromLocalStorage();
        if (loaded) {
          Object.assign(state, loaded);
          await write();
          localStorage.removeItem(LS_KEY);
        }
      }
      navigator.storage?.persist?.().catch(() => {}); // évite l'effacement automatique quand le disque se remplit
    } catch (e) {
      db = null;
      loaded = fromLocalStorage();
    }
    if (loaded && Array.isArray(loaded.collections)) Object.assign(state, loaded);
  })();

  return {
    state,
    save,
    flush,
    ready,
    current: () => state.collections.find((c) => c.id === state.currentId) || null,
  };
})();
