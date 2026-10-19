import csv, json, ast, sys
src, out = sys.argv[1], sys.argv[2]
TYPES = {'Red': 'R', 'White': 'B', 'Rosé': 'Ro', 'Sparkling': 'E', 'Dessert': 'L', 'Dessert/Port': 'L'}
wineries, wi = [], {}
regions, ri = [], {}
grapes, gi = [], {}
wines = []
def idx(lst, d, key):
    if key not in d: d[key] = len(lst); lst.append(key if not isinstance(key, tuple) else list(key))
    return d[key]
for r in csv.DictReader(open(src, encoding='utf-8')):
    try: g = ast.literal_eval(r['Grapes'])
    except Exception: g = []
    try: abv = float(r['ABV'])
    except Exception: abv = 0
    w = idx(wineries, wi, r['WineryName'].strip())
    reg = idx(regions, ri, (r['RegionName'].strip(), r['Code'].strip()))
    gs = [idx(grapes, gi, x.strip()) for x in g[:4]]
    wines.append([r['WineName'].strip(), w, reg, TYPES.get(r['Type'], ''), gs, abv if abv % 1 else int(abv)])
data = {'source': 'X-Wines (CC0) — de Azambuja, Morais & Filipe, BDCC 2023, doi:10.3390/bdcc7010020',
        'wineries': wineries, 'regions': regions, 'grapes': grapes, 'wines': wines}
with open(out, 'w', encoding='utf-8') as f:
    f.write('/* X-Wines dataset (CC0 1.0) — https://github.com/rogerioxavier/X-Wines\n'
            ' * de Azambuja, R.X.; Morais, A.J.; Filipe, V. X-Wines: A Wine Dataset for Recommender Systems\n'
            ' * and Machine Learning. Big Data Cogn. Comput. 2023, 7, 20. https://doi.org/10.3390/bdcc7010020\n'
            ' * Fichier généré par tools/build_xwines.py — ne pas modifier à la main. */\n')
    f.write('window.MLC=window.MLC||{};MLC.XWINES=')
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print(len(wines), 'wines', len(wineries), 'wineries', len(regions), 'regions', len(grapes), 'grapes')
