# My Little Collection

Inventaire de collections (cave à vin, cartes Pokémon, collection libre…) 100 % statique :
aucune donnée n'est envoyée sur un serveur. Tout est stocké dans le navigateur (IndexedDB, avec reprise automatique des anciennes données `localStorage`)
et se sauvegarde en un fichier JSON (toutes les collections, photos comprises) ou s'exporte/s'importe en CSV.

## Fonctionnalités

- **Une identité par collection** : cave (papier crème, bordeaux), classeur Pokémon
  (bleu nuit et jaune, cartes holo), collection libre (archive encre et papier). Mode sombre automatique.
- **Une seule barre** (`/` pour y aller) : filtre la collection en direct **et** propose les résultats du
  catalogue. `Entrée` ajoute et ouvre la fiche, `+` ajoute sans quitter la recherche ; un doublon
  incrémente la quantité au lieu de créer une ligne.
- **Fiche latérale enregistrée automatiquement** : photo (appareil photo, fichier ou URL), quantité, champs.
- **Galerie ou tableau** : filtres en pastilles (couleur, statut, région / extension, rareté…), tri,
  quantités +/− directement sur les cartes ; le tableau garde les filtres par colonne
  (`>10`, `2010-2015`, `!mot`, `=valeur`) et les colonnes personnalisables.
- Export CSV (séparateur `;`, compatible Excel FR) et import CSV (nouvelle collection, ajout ou remplacement).
- Catalogues :
  - **Vin** : recherche tolérante aux fautes (« reine vignaux » → Château de Rayne Vigneau) dans
    100 646 vins de la base libre [X-Wines](https://github.com/rogerioxavier/X-Wines) embarquée
    (`data/xwines.js`, chargée à la demande) → domaine, appellation, région, pays, couleur, cépages, degré ;
    potentiel de garde estimé (base locale d'appellations).
  - **Photos d'étiquettes** : 10 300 vins d'[Open Food Facts](https://world.openfoodfacts.org) embarqués
    (`data/off-wines.js`, photos filtrées sur la résolution et le cadrage) ; ils apparaissent dans les résultats
    et illustrent les vins X-Wines de la même cuvée. À défaut, photo du domaine via Wikidata.
    Code-barres : index local puis API Open Food Facts.
  - **Cote** : aucune source libre ne la fournit ; la fiche propose des liens de recherche pré-remplis
    (Wine-Searcher, Vivino) pour la retrouver et la recopier.
  - **Pokémon** : index local de 21 000 cartes [TCGdex](https://tcgdex.dev) en 6 langues (`data/pokemon-cards.js`) :
    recherche instantanée et tolérante aux fautes (« Dracaufeu », « Charizard » ou « Glurak »), filtres langue,
    série, extension, rareté, catégorie et année ; la carte est ajoutée dans la langue filtrée. Image, numéro,
    rareté et cote Cardmarket (€) chargés à la sélection, actualisation des cotes en un clic.

## Lancer en local

Ouvrir `index.html` dans un navigateur suffit. Ou, avec un petit serveur :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

## Déployer sur GitHub Pages

1. Pousser ce dossier dans un dépôt GitHub.
2. *Settings → Pages → Build and deployment* : « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Le site est publié sur `https://<utilisateur>.github.io/<depot>/`.

> Les données sont liées au navigateur **et** à l'adresse du site : une collection créée en local
> (`file://` ou `localhost`) n'apparaît pas sur GitHub Pages. Passez par l'export/import CSV.

## Ajouter un type de collection

Créer `js/types/mon-type.js` qui appelle `MLC.registerType({...})` (voir `js/types/registry.js`
pour le format et `js/types/pokemon.js` pour un exemple avec API), puis l'inclure dans `index.html`.
La clé `ui` définit le thème (`theme`, variables CSS dans `index.html`), le gabarit de carte (`card`),
les filtres (`facets`), les tris (`sorts`) et les textes.

## Données

`data/xwines.js` est généré depuis `XWines_Full_100K_wines.csv` (X-Wines, licence CC0 1.0) :

```bash
python3 tools/build_xwines.py XWines_Full_100K_wines.csv data/xwines.js
```

> de Azambuja, R.X.; Morais, A.J.; Filipe, V. *X-Wines: A Wine Dataset for Recommender Systems and
> Machine Learning*. Big Data Cogn. Comput. 2023, 7, 20. https://doi.org/10.3390/bdcc7010020

`data/off-wines.js` est généré depuis l'API de recherche d'Open Food Facts (données ODbL, photos CC BY-SA 3.0),
à relancer de temps en temps pour récupérer les nouvelles bouteilles :

```bash
python3 tools/build_off_wines.py data/off-wines.js
```

`data/pokemon-cards.js` est généré depuis l'API TCGdex (licence MIT), à relancer à chaque nouvelle extension :

```bash
python3 tools/build_pokemon.py data/pokemon-cards.js
```

## Stack

HTML + JavaScript natif sans étape de build, style 100 % Tailwind CSS (build navigateur v4) ; Tailwind et la police Roboto sont livrés dans `vendor/`, la page ne charge rien depuis un CDN.
# My-Little-Collection
