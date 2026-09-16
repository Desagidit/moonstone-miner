"""Source-bound review overlays shared by the importer and local review app."""
import copy, hashlib, json, os, sqlite3, re
from pathlib import Path

ROOT=Path(__file__).resolve().parent
DATA=ROOT/'data'
GROUPS=('identity','factions','stats','health_track','abilities','signature_move','links','eligibility','custom_tags')
FIELDS={'identity':('name','keywords','base_size_mm','card_version'),'factions':('factions',),'stats':('stats',),'health_track':('health_track',),'abilities':('abilities',),'signature_move':('signature_move',),'links':('character_urls',),'eligibility':('eligibility',)}
def source_hash():return hashlib.sha256((DATA/'sources/character-cards-all-aug-2026.pdf').read_bytes()).hexdigest()
FIELDS['custom_tags']=('custom_tags',)
def atomic_json(path,value):
 tmp=path.with_suffix(path.suffix+'.tmp')
 tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8');os.replace(tmp,path)
def load_reviews():
 p=DATA/'reviews.json'
 return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {'schema_version':1,'revision':0,'sources':{}}
def classify_eligibility(text):
 text=re.sub(r'\s+',' ',text).lower()
 summon=bool(re.search(r'can only enter play when summoned',text) or re.search(r'summoned being:\s*you cannot choose this character for your troupe',text))
 return {'selectable':not summon,'summoned_only':summon}
def apply_reviews(cards,store=None):
 store=store or load_reviews(); reviews=store['sources'].get(source_hash(),{})
 for c in cards:
  c['eligibility']=classify_eligibility(c['raw_front_text'])
  overlay=reviews.get(str(c['source']['pdf_page']),{})
  for g,entry in overlay.get('groups',{}).items():
   for key,value in entry['values'].items():
    if g=='links':c['source']['character_urls']=copy.deepcopy(value)
    else:c[key]=copy.deepcopy(value)
  from card_tags import assign_tags
  if 'custom_tags' not in overlay.get('groups',{}):c['custom_tags']=assign_tags(c)
  checks={g:overlay.get('groups',{}).get(g,{}).get('status','verified' if g=='eligibility' else 'needs_review') for g in GROUPS}
  issues=[]
  for g,status in checks.items():
   if status!='verified':issues.append({'field':g,'code':status,'message':overlay.get('groups',{}).get(g,{}).get('note','') or 'Compare this field with the original card.'})
  for k in ('melee','melee_range_inches','arcane','evade'):
   if c['stats'].get(k) is None and checks['stats']!='verified':issues.append({'field':'stats.'+k,'code':'special_value','message':'Confirm the printed special value or supply the missing number.'})
  c['eligibility']={k:c['eligibility'][k] for k in ['selectable','summoned_only']}
  if c['stats']['health']!=len(c['health_track']) or c['stats']['energy']!=sum(d['energy'] for d in c['health_track']):
   issues.append({'field':'health_track','code':'track_mismatch','message':'Health and energy stats do not match the ordered dots. Check both fields.'})
  c['review']={'status':'verified' if all(s=='verified' for s in checks.values()) else ('in_progress' if overlay else 'unverified'),'fields':checks,'notes':{g:overlay.get('groups',{}).get(g,{}).get('note','') for g in GROUPS},'issues':issues,'flags':[i['code'] for i in issues],'updated_at':overlay.get('updated_at')}
 from suggested_partners import attach_suggestions
 from miniatures import attach_miniatures
 from character_guides import attach_guides
 return attach_guides(attach_miniatures(attach_suggestions(cards,source_hash()),source_hash()),source_hash())
def export(cards):
 atomic_json(DATA/'characters.json',cards)
 path=DATA/'moonstone.sqlite';temp=DATA/'moonstone.next.sqlite'
 if temp.exists():temp.unlink()
 db=sqlite3.connect(temp)
 db.executescript('CREATE TABLE characters(id TEXT PRIMARY KEY,name TEXT,base_size_mm INTEGER,melee INTEGER,arcane INTEGER,evade INTEGER,health INTEGER,energy INTEGER,factions TEXT,card_url TEXT,record_json TEXT); CREATE TABLE abilities(character_id TEXT,name TEXT,category TEXT,energy_cost INTEGER,range_inches INTEGER,text TEXT); CREATE TABLE keywords(character_id TEXT,keyword TEXT); CREATE TABLE custom_tags(character_id TEXT,tag TEXT); CREATE TABLE suggested_partners(character_id TEXT,faction TEXT,partner_id TEXT,position INTEGER,reason TEXT,plan TEXT,PRIMARY KEY(character_id,faction,position)); CREATE INDEX partner_id ON suggested_partners(partner_id); CREATE INDEX tag_name ON custom_tags(tag); CREATE INDEX ability_category ON abilities(category); CREATE INDEX keyword_name ON keywords(keyword);')
 for c in cards:
  s=c['stats'];db.execute('INSERT INTO characters VALUES (?,?,?,?,?,?,?,?,?,?,?)',(c['id'],c['name'],c['base_size_mm'],s['melee'],s['arcane'],s['evade'],s['health'],s['energy'],json.dumps(c['factions']),c['source']['card_url'],json.dumps(c,ensure_ascii=False)))
  db.executemany('INSERT INTO abilities VALUES (?,?,?,?,?,?)',[(c['id'],a['name'],a['category'],a.get('energy_cost'),a.get('range_inches'),a['text']) for a in c['abilities']]);db.executemany('INSERT INTO keywords VALUES (?,?)',[(c['id'],k) for k in c['keywords']])
  db.executemany('INSERT INTO custom_tags VALUES (?,?)',[(c['id'],tag) for tag in c['custom_tags']])
  for faction,entry in c.get('suggested_partners',{}).get('by_faction',{}).items():
   db.executemany('INSERT INTO suggested_partners VALUES (?,?,?,?,?,?)',[(c['id'],faction,p['character_id'],i+1,p['reason'],entry['plan']) for i,p in enumerate(entry['partners'])])
 db.execute('PRAGMA optimize');db.commit();db.close();os.replace(temp,path)
 atomic_json(DATA/'review-progress.json',{'total':len(cards),'verified':sum(c['review']['status']=='verified' for c in cards),'fields_verified':sum(s=='verified' for c in cards for s in c['review']['fields'].values()),'fields_total':len(cards)*len(GROUPS)})
def validate_group(group,values):
 if group not in FIELDS or set(values)!=set(FIELDS[group]):raise ValueError('Unexpected review fields.')
 def integer(v):return v is None or (type(v)==int and -100<=v<=100)
 def strings(v):return isinstance(v,list) and all(isinstance(s,str) for s in v)
 if group=='custom_tags' and not (strings(values['custom_tags']) and all(s.strip() for s in values['custom_tags'])):raise ValueError('Tags must be a list of non-empty names.')
 if group=='identity' and not (isinstance(values['name'],str) and values['name'].strip() and strings(values['keywords']) and type(values['base_size_mm'])==int and values['base_size_mm']>0 and type(values['card_version'])==int):raise ValueError('Identity needs a name, keyword list, base size and version.')
 if group=='factions' and not (strings(values['factions']) and set(values['factions'])<=set(['Commonwealth','Dominion','Leshavult','Shades'])):raise ValueError('Unknown faction.')
 if group=='stats' and not (isinstance(values['stats'],dict) and set(values['stats'])=={'melee','melee_range_inches','arcane','evade','health','energy'} and all(integer(v) for v in values['stats'].values())):raise ValueError('Stats must be numbers or null for special values.')
 if group=='health_track' and not (isinstance(values['health_track'],list) and all(isinstance(d,dict) and type(d.get('energy'))==bool for d in values['health_track'])):raise ValueError('Each health dot needs an energy checkbox.')
 if group=='abilities':
  if not isinstance(values['abilities'],list):raise ValueError('Abilities must be a list.')
  for a in values['abilities']:
   if not (isinstance(a,dict) and isinstance(a.get('name'),str) and a['name'].strip() and isinstance(a.get('text'),str) and a.get('category') in ['passive','action','arcane_action'] and integer(a.get('energy_cost')) and integer(a.get('range_inches')) and strings(a.get('arcane_colours',[]))):raise ValueError('Check ability name, type, cost, range and text.')
 if group=='signature_move' and not (isinstance(values['signature_move'],dict) and isinstance(values['signature_move'].get('text'),str) and isinstance(values['signature_move'].get('damage_table'),dict) and all(integer(v) for v in values['signature_move']['damage_table'].values())):raise ValueError('Signature move needs text and a damage table.')
 if group=='links' and not (strings(values['character_urls']) and all(s.startswith('https://') for s in values['character_urls'])):raise ValueError('Links must use HTTPS.')
 if group=='eligibility':
  e=values['eligibility']
  if not (isinstance(e,dict) and set(e)=={'selectable','summoned_only'} and all(type(e[k])==bool for k in e) and e['selectable']!=e['summoned_only']):raise ValueError('Choose either selectable or summon.')
