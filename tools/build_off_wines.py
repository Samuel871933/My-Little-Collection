"""Index des vins Open Food Facts avec photo d'étiquette → data/off-wines.js

    python3 tools/build_off_wines.py data/off-wines.js

Interroge l'API de recherche d'Open Food Facts (search-a-licious) depuis la machine de build :
elle ne renvoie pas d'en-tête CORS, le site ne peut donc pas l'appeler lui-même.
Données Open Food Facts : ODbL ; photos : CC BY-SA 3.0.
"""
import json, re, sys, time, urllib.parse, urllib.request

API = 'https://search.openfoodfacts.org/search'
FIELDS = 'code,product_name,product_name_fr,brands,categories_tags,image_front_url,images'
MIN_SIDE = 400  # résolution d'origine minimale (petit côté, en px) : en dessous, photo floue ou lointaine
# l'API plafonne à 10 000 résultats par requête : on découpe France / reste du monde
QUERIES = ['categories_tags:"en:wines" AND countries_tags:"en:france"',
           'categories_tags:"en:wines" AND NOT countries_tags:"en:france"']
IMG = re.compile(r'/images/products/(.+)\.\d+\.jpg$')
GENERIC = re.compile(r'^(beverages|alcoholic-beverages|wines|wines-from-.*|.*-wines|french-.*|vins?|plant-based-.*|'
                     r'beverages-and-beverages-preparations|fermented-.*|grape-.*|alcools?|boissons?.*)$')
COLORS = [('E', r'en:(champagnes|sparkling-wines|cremants)'), ('L', r'en:(sweet-wines|dessert-wines|fortified-wines)'),
          ('Ro', r'en:rose-wines'), ('B', r'en:white-wines'), ('R', r'en:red-wines')]


def fetch(q, page):
    url = API + '?' + urllib.parse.urlencode({'q': q, 'page': page, 'page_size': 500, 'fields': FIELDS})
    req = urllib.request.Request(url, headers={'User-Agent': 'MyLittleCollection-build/1.0'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            print('  retry', page, e, file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    raise SystemExit(f'échec page {page}')


def front(p):
    """Meilleure photo de face : française d'abord, assez grande, proportions d'étiquette ou de bouteille"""
    images = p.get('images') or {}
    keys = sorted((k for k in images if k.startswith('front_')), key=lambda k: (k != 'front_fr', k != 'front_en'))
    for k in keys:
        im = images[k]
        full = (im.get('sizes') or {}).get('full') or {}
        w, h = full.get('w') or 0, full.get('h') or 0
        if min(w, h) < MIN_SIDE or not (0.6 <= h / w <= 4):  # trop petite, ou panoramique (rayon, étagère)
            continue
        return f"{k}.{im.get('rev')}"
    return None


def color(tags):
    t = ' '.join(tags)
    return next((c for c, rx in COLORS if re.search(rx, t)), '')


out = sys.argv[1]
seen, wines = set(), []
for q in QUERIES:
    page, pages = 1, 1
    while page <= pages:
        d = fetch(q, page)
        pages = min(d.get('page_count') or 1, 20)
        for p in d.get('hits', []):
            m = IMG.search(p.get('image_front_url') or '')
            code = p.get('code')
            best = front(p)
            if not m or not best or not code or code in seen:
                continue
            path = m.group(1).rsplit('/', 1)[0] + '/' + best  # même dossier produit, meilleure photo
            brands = p.get('brands') or []
            brand = (brands if isinstance(brands, list) else str(brands).split(','))[:1]
            brand = brand[0].strip() if brand else ''
            name = (p.get('product_name_fr') or p.get('product_name') or '').strip()
            if not name and not brand:
                continue
            tags = p.get('categories_tags') or []
            # catégories précises seulement (« pauillac », « bordeaux-superieur »…) : utiles pour l'appellation
            spec = [t.split(':', 1)[1] for t in tags if ':' in t and not GENERIC.match(t.split(':', 1)[1])][:4]
            seen.add(code)
            wines.append([code, re.sub(r'\s+', ' ', name), brand, path, color(tags), spec])
        print(q[:60], 'page', page, '/', pages, len(wines), file=sys.stderr)
        page += 1

data = {'source': 'Open Food Facts (ODbL, photos CC BY-SA) — https://world.openfoodfacts.org',
        'img': 'https://images.openfoodfacts.org/images/products/', 'wines': wines}
with open(out, 'w', encoding='utf-8') as f:
    f.write('/* Open Food Facts — données ODbL, photos CC BY-SA 3.0 — https://world.openfoodfacts.org\n'
            ' * Fichier généré par tools/build_off_wines.py — ne pas modifier à la main.\n'
            ' * wines : [code-barres, nom, marque, chemin photo (sans .<taille>.jpg), couleur, catégories] */\n')
    f.write('window.MLC=window.MLC||{};MLC.OFFWINES=')
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print(len(wines), 'vins avec photo')
