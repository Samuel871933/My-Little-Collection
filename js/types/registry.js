window.MLC = window.MLC || {};

/*
 * Un "type" de collection décrit :
 *  - id, label, icon, description
 *  - columns : colonnes par défaut { key, label, type, hidden?, options?, computed? }
 *      types : text | number | money | year | url | image | status
 *      computed : nom d'une fonction de MLC.computed (colonne en lecture seule)
 *  - provider (optionnel) : recherche en ligne pour pré-remplir une fiche
 *      placeholder, help, search(q, signal) → [{ title, subtitle, image, badge?, values?, load?() }]
 *      refresh?(item) → valeurs à mettre à jour (ex. prix actuel)
 * Pour ajouter un type (BD, vinyles, Lego…), créer un fichier dans js/types/
 * qui appelle MLC.registerType(...) et l'inclure dans index.html.
 */
MLC.types = {};
MLC.registerType = (t) => { MLC.types[t.id] = t; };

MLC.COLUMN_TYPES = {
  text: 'Texte',
  number: 'Nombre',
  money: 'Montant (€)',
  year: 'Année',
  url: 'Lien',
  image: 'Image (URL)',
};

// Colonnes calculées (lecture seule)
MLC.computed = {
  boire_avant(it) {
    const y = MLC.util.parseNum(it.millesime), g = MLC.util.parseNum(it.garde);
    return y && g != null ? Math.round(y + g) : null;
  },
  statut_garde(it) {
    const b = MLC.computed.boire_avant(it);
    if (!b) return '';
    const d = b - new Date().getFullYear();
    if (d < 0) return 'Dépassé';
    if (d === 0) return 'À boire cette année';
    if (d <= 2) return 'À boire bientôt';
    return 'En garde';
  },
};
