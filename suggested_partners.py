"""Compile card-by-card tactical inferences and validate complete legal partner cores.

The TSV is authored curation, not a tag similarity/ranking algorithm. Source binding
prevents these recommendations silently carrying over to a different card bundle.
"""
import copy, hashlib, itertools, json, re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
DATA=ROOT/'data'
FACTIONS={'C':'Commonwealth','D':'Dominion','L':'Leshavult','S':'Shades'}
SUMMONERS={64:{63},65:{63},66:{63},77:{76},99:{108,116},100:{108,116,118},101:{107,116},102:{107,116},103:{114,116},104:{117,116},120:{119,116},121:{119,116},122:{119,116},139:{138}}

def bundle_hash():
 return hashlib.sha256((DATA/'sources/character-cards-all-aug-2026.pdf').read_bytes()).hexdigest()

def exclusions(c):
 return {re.sub(r'\s+',' ',n).strip().casefold() for n in re.findall(r'Evolution\s*\[([^]]+)\]',c['raw_front_text'],re.I)}

def conflict(a,b):
 return b['name'].casefold() in exclusions(a) or a['name'].casefold() in exclusions(b)

def compile_curation(cards):
 rows=(DATA/'partner-curation.tsv').read_text(encoding='utf-8').splitlines()
 source=bundle_hash()
 assert rows[0]=='# Source SHA-256: '+source,'Card source changed: review all partner curation before rebuilding.'
 by_page={c['source']['pdf_page']:c for c in cards};curated={}
 for row in rows:
  if not row.strip() or row.startswith('#'):continue
  page,code,plan,*entries=row.split('|');page=int(page);faction=FACTIONS[code]
  assert len(entries)==3,f'Page {page}: exactly three partners required'
  rec=curated.setdefault(str(page),{'default_faction':faction,'by_faction':{}})
  assert faction not in rec['by_faction'],f'Duplicate {page}/{faction}'
  partners=[]
  for item in entries:
   target,reason=item.split(':',1);partners.append({'page':int(target),'reason':reason})
  rec['by_faction'][faction]={'plan':plan,'partners':partners}
 assert set(map(int,curated))==set(by_page),'Missing character curation'
 count=0
 for page,c in by_page.items():
  rec=curated[str(page)]
  providers=SUMMONERS.get(page,set())
  allowed=set(c['factions']) if c['eligibility']['selectable'] else set().union(*(set(by_page[n]['factions']) for n in providers))
  assert set(rec['by_faction'])==allowed,f'{page}: missing or unexpected faction routes'
  for faction,entry in rec['by_faction'].items():
   targets=[p['page'] for p in entry['partners']]
   assert len(set(targets))==3 and page not in targets,f'{page}: self/duplicate suggestion'
   selected=[by_page[n] for n in targets]
   assert all(t['eligibility']['selectable'] and faction in t['factions'] for t in selected),f'{page}/{faction}: invalid partner'
   assert all(p['reason'].strip() for p in entry['partners']) and entry['plan'].strip()
   core=selected+([c] if c['eligibility']['selectable'] else [])
   assert len({t['name'].casefold() for t in core})==len(core),f'{page}: duplicate character names'
   assert not any(conflict(a,b) for a,b in itertools.combinations(core,2)),f'{page}: Evolution exclusion'
   if providers:assert providers.intersection(targets),f'{page}: no initial summoner/transformation provider'
   count+=1
 return {'schema_version':1,'source_sha256':source,'basis':'Tactical suggestions inferred from complete character cards, including signature moves; not official ratings or playtested rankings.','rules_url':'https://www.moonstonethegame.com/troupe-building','character_count':len(cards),'faction_core_count':count,'characters':curated}

def attach_suggestions(cards,source=None):
 path=DATA/'suggested-partners.json'
 for c in cards:c.pop('suggested_partners',None)
 if not path.exists():return cards
 data=json.loads(path.read_text(encoding='utf-8'))
 if data['source_sha256']!=(source or bundle_hash()):return cards
 by_page={c['source']['pdf_page']:c for c in cards}
 for page,c in by_page.items():
  rec=copy.deepcopy(data['characters'].get(str(page)))
  if not rec:continue
  for entry in rec['by_faction'].values():
   for p in entry['partners']:
    partner=by_page[p['page']];p['character_id']=partner['id'];p['source_url']=partner['source']['card_url']
  c['suggested_partners']=rec
 return cards

if __name__=='__main__':
 cards=json.loads((DATA/'characters.json').read_text(encoding='utf-8'))
 result=compile_curation(cards)
 path=DATA/'suggested-partners.json'
 if '--check' in sys.argv:
  assert result==json.loads(path.read_text(encoding='utf-8')),'Recompile suggested partners'
 else:path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(f"Validated {result['character_count']} cards and {result['faction_core_count']} faction-specific cores: three distinct selectable partners, shared faction, Evolution exclusions, and summon providers.")
