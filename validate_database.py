import json,sqlite3
from pathlib import Path
root=Path(__file__).resolve().parent
cards=json.loads((root/'data/characters.json').read_text(encoding='utf-8'))
assert len(cards)==len({c['id'] for c in cards})==141
assert all(c['base_size_mm'] and c['raw_front_text'] and c['raw_back_text'] and (root/c['source']['image_path']).is_file() for c in cards)
b=cards[0]
assert [a['name'] for a in b['abilities']]==['Longsword','Plate Armour','Rallying Cry','Reload [Shoot Pistol]','Shoot Pistol']
assert [a['energy_cost'] for a in b['abilities']]==[None,None,0,2,1]
assert cards[1]['stats']['evade']==-1
assert cards[140]['stats']['melee_range_inches']==1
assert cards[140]['stats']['evade']==-1
assert cards[21]['factions']==['Dominion']
db=sqlite3.connect(root/'data/moonstone.sqlite')
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert db.execute('SELECT count(*) FROM characters').fetchone()[0]==141
assert db.execute('SELECT count(*) FROM abilities').fetchone()[0]==sum(len(c['abilities']) for c in cards)
print('Coverage, SQLite integrity and visually checked card regressions passed.')
