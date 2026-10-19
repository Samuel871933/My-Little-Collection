"""Index des cartes Pokémon (TCGdex) → data/pokemon-cards.js

    python3 tools/build_pokemon.py data/pokemon-cards.js

Toutes les cartes en fr, en, de, it, es, pt (mêmes identifiants d'une langue à l'autre),
avec rareté, catégorie, extension, série et année : la recherche et ses filtres
fonctionnent ainsi hors ligne. Prix et détails restent chargés à la sélection.
Données : TCGdex (https://tcgdex.dev, licence MIT).
"""
import collections, json, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

API = 'https://api.tcgdex.net/v2'
LANGS = ['fr', 'en', 'de', 'it', 'es', 'pt']  # le japonais a ses propres extensions et un alphabet non indexable
LETTER = {'fr': 'f', 'en': 'e', 'de': 'd', 'it': 'i', 'es': 's', 'pt': 'p'}
CAT_EN = {'Pokemon': 'Pokémon', 'Trainer': 'Dresseur', 'Energy': 'Énergie'}


def get(path):
    req = urllib.request.Request(API + path, headers={'User-Agent': 'MyLittleCollection-build/1.0'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            print('  retry', path, e, file=sys.stderr)
    raise SystemExit(f'échec {path}')


def pmap(fn, items, n=8):
    with ThreadPoolExecutor(n) as ex:
        return list(ex.map(fn, items))


def by_filter(lang, field):
    """{id carte: valeur} en listant les cartes de chaque valeur (rareté, catégorie)"""
    values = get(f'/{lang}/{field}')
    out = {}
    for v, cards in zip(values, pmap(lambda v: get(f'/{lang}/cards?{field[:-3] + "y" if field.endswith("ies") else field[:-1]}=eq:{urllib.parse.quote(v)}'), values)):
        for c in cards:
            out[c['id']] = v
    print(lang, field, len(values), 'valeurs', len(out), 'cartes', file=sys.stderr)
    return out


# --- cartes par langue
cards = {}  # id → {lang: (name, has_image)}
for lang in LANGS:
    lst = get(f'/{lang}/cards')
    for c in lst:
        cards.setdefault(c['id'], {})[lang] = (c['name'], bool(c.get('image')))
    print(lang, len(lst), 'cartes', file=sys.stderr)

# --- rareté et catégorie : libellés français, à défaut traduits depuis l'anglais
rar_fr, rar_en = by_filter('fr', 'rarities'), by_filter('en', 'rarities')
cat_fr, cat_en = by_filter('fr', 'categories'), by_filter('en', 'categories')
pairs = collections.defaultdict(collections.Counter)
for cid, r in rar_en.items():
    if cid in rar_fr:
        pairs[r][rar_fr[cid]] += 1
en2fr = {en: c.most_common(1)[0][0] for en, c in pairs.items()}

# --- extensions : nom, série, date (français d'abord)
set_ids = sorted({cid.rsplit('-', 1)[0] for cid in cards} | {s['id'] for s in get('/fr/sets')} | {s['id'] for s in get('/en/sets')})


def set_info(sid):
    for lang in ('fr', 'en', 'de', 'it', 'es', 'pt'):
        try:
            s = get(f'/{lang}/sets/{urllib.parse.quote(sid)}') if sid else None
        except SystemExit:
            continue
        if s and s.get('name'):
            return sid, s
    return sid, None


setinfo = {}
for sid, s in pmap(set_info, [s for s in set_ids if s]):
    if s:
        setinfo[sid] = s
print(len(setinfo), 'extensions', file=sys.stderr)

sets, set_idx = [], {}
rarities, rar_idx = [], {}
cats, cat_idx = [], {}


def idx(lst, d, v):
    if v not in d:
        d[v] = len(lst)
        lst.append(v)
    return d[v]


out = []
for cid, per in cards.items():
    # identifiant = <extension>-<numéro> ; on retrouve l'extension connue la plus longue
    sid = next((cid[:i] for i in range(len(cid) - 1, 0, -1) if cid[i] == '-' and cid[:i] in setinfo), None)
    if not sid:
        continue
    s = setinfo[sid]
    if (s.get('serie') or {}).get('id') == 'tcgp':  # Pokémon TCG Pocket : jeu mobile, pas de cartes physiques
        continue
    if sid not in set_idx:
        serie = s.get('serie') or {}
        idx(sets, set_idx, sid)
        sets[set_idx[sid]] = [sid, s['name'], serie.get('name', ''), serie.get('id', ''), (s.get('releaseDate') or '')[:4]]
    rar = rar_fr.get(cid) or en2fr.get(rar_en.get(cid), rar_en.get(cid, ''))
    cat = cat_fr.get(cid) or CAT_EN.get(cat_en.get(cid), '')
    present = [l for l in LANGS if l in per]
    langs = ''.join(LETTER[l].upper() if per[l][1] else LETTER[l] for l in present)
    names = [per[l][0] if i == 0 or per[l][0] != per[present[i - 1]][0] else '' for i, l in enumerate(present)]
    while names and names[-1] == '':
        names.pop()
    out.append([cid[len(sid) + 1:], set_idx[sid], idx(rarities, rar_idx, rar) if rar else -1,
                idx(cats, cat_idx, cat) if cat else -1, langs, names])

data = {'source': 'TCGdex (MIT) — https://tcgdex.dev', 'langs': 'fedisp', 'langCodes': LANGS,
        'img': 'https://assets.tcgdex.net/', 'sets': sets, 'rarities': rarities, 'categories': cats, 'cards': out}
with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write('/* TCGdex — https://tcgdex.dev (licence MIT)\n'
            ' * Fichier généré par tools/build_pokemon.py — ne pas modifier à la main.\n'
            ' * sets : [id, nom, série, id série, année]\n'
            ' * cards : [numéro, extension, rareté, catégorie, langues, noms]\n'
            ' *   langues : une lettre par langue (f e d i s p), majuscule = image disponible\n'
            ' *   noms : un par langue dans le même ordre, "" = identique au précédent */\n')
    f.write('window.MLC=window.MLC||{};MLC.TCG=')
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print(len(out), 'cartes', len(sets), 'extensions', len(rarities), 'raretés')
