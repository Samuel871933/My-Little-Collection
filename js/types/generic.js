MLC.registerType({
  id: 'generic',
  label: 'Collection libre',
  icon: '🗂️',
  description: 'Colonnes de base, à personnaliser',
  ui: {
    theme: 'archive',
    defaultName: 'Ma collection',
    mark: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
    noun: ['objet', 'objets'],
    tagline: 'Vinyles, livres, montres, Lego…',
    pitch: 'Une base vierge : ajoutez les colonnes dont vous avez besoin, triez et filtrez comme dans un tableur.',
    searchPlaceholder: 'Chercher ou ajouter un objet…',
    examples: [],
    facets: ['categorie'],
    sorts: [['_added', 'Ajout récent'], ['nom', 'Nom'], ['annee', 'Année'], ['valeur_actuelle', 'Valeur']],
    identity: ['nom', 'categorie', 'annee'],
    gridMin: '220px',
    cardClass: 'overflow-hidden rounded-md border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-20px_rgb(0_0_0/.4)]',
    card(it, h) {
      const img = h.img(it.image, 'h-full w-full object-cover');
      const initial = (String(it.nom || '?').trim()[0] || '?').toUpperCase();
      return `
        <div class="aspect-[4/3] overflow-hidden border-b border-line bg-paper">
          ${img || `<div class="grid h-full place-items-center text-5xl font-light text-ink/20">${h.esc(initial)}</div>`}
        </div>
        <div class="flex flex-1 flex-col gap-1 p-4">
          <p class="truncate font-mono text-[11px] uppercase tracking-wider text-muted">${[it.categorie, it.annee].filter(Boolean).map(h.esc).join(' · ') || '—'}</p>
          <h3 class="font-medium leading-snug">${h.esc(it.nom || 'Sans nom')}</h3>
          <div class="mt-auto flex items-end justify-between gap-2 pt-3">
            <span class="text-sm tabular-nums text-muted">${h.money(it.valeur_actuelle ?? it.valeur_achat)}</span>
            ${h.stepper(it)}
          </div>
        </div>`;
    },
  },
  columns: [
    { key: 'image', label: 'Image', type: 'image', priority: 3 },
    { key: 'nom', label: 'Nom', type: 'text' },
    { key: 'categorie', label: 'Catégorie', type: 'text', priority: 3 },
    { key: 'annee', label: 'Année', type: 'year', priority: 3 },
    { key: 'quantite', label: 'Quantité', type: 'number' },
    { key: 'valeur_achat', label: "Valeur d'achat", type: 'money', priority: 3 },
    { key: 'valeur_actuelle', label: 'Valeur actuelle', type: 'money', priority: 2 },
    { key: 'notes', label: 'Notes', type: 'text', priority: 4 },
  ],
});
