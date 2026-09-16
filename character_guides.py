"""Source-bound authored tactical guides and named/keyword summon links."""
import copy, json, sys
from pathlib import Path
from suggested_partners import bundle_hash
DATA=Path(__file__).resolve().parent/'data'

# Targets are selected from the CURRENT card keywords, not printed faction:
# summons do not take a starting-troupe slot; Jackalope/Echo are also selectable.
RELATIONS=[
 (63,'Summon a Murder Bunny','summon',[64,65,66],'Up to three friendly Murder Bunnies; uses Boris’s energy.'),
 (63,'Summon the Jackalope','summon',[73],'Only if no friendly Jackalope is in play; requires five energy.'),
 (76,'Remove Necklace / Lose Control!','transformation',[77],'Replaces Anya; wounds, energy, stones and modifications carry over.'),
 (77,'Replace Necklace / Regain Control','transformation',[76],'Replaces Striga Anya; wounds, energy, stones and modifications carry over.'),
 (107,'Summon a Helping Hand','summon','Familiar','Cannot bring a character into play if already in play.'),
 (108,'Summon Reinforcements','summon','Soldier','Cannot bring a character into play if already in play.'),
 (110,'Summon the Forgotten King','summon',[105],'Shades only; no friendly Echo in play. Igor is slain on success.'),
 (114,'Summon from the Depths','summon','Aquatic','When deployed or entering play; cannot duplicate a character in play.'),
 (116,'Fashion from Flesh','summon','Psychopomp','Once per turn, after causing wounds to an enemy in melee; cannot duplicate a character in play.'),
 (117,'Summon Intermission Snacks','summon','Food','When deployed or entering play; cannot duplicate a character in play.'),
 (118,'Summon the Choir','summon','Musician','When deployed or entering play; cannot duplicate a character in play.'),
 (118,'Summon an Encore!','resummon','Psychopomp','Once per turn; only a Psychopomp slain earlier this turn and not currently in play.'),
 (119,'Summon the Nursery','summon',[120,121,122],'Once per turn; colour determines Babeling. Cannot duplicate a character in play.'),
 (138,'Partner in Crime','summon',[139],'On deployment, in your deployment zone; Pickles uses Streatham’s energy.'),
]

METRIC_AXES=('Tank','Damage','Support','Moonstone','Complexity','Range')
def compile_ratings(cards):
 lines=(DATA/'character-ratings.tsv').read_text(encoding='utf-8').splitlines()
 assert lines[0]=='# Source SHA-256: '+bundle_hash(),'Review ratings for the new card source.'
 pages={c['source']['pdf_page']:c for c in cards};ratings={}
 for line in lines:
  if not line.strip() or line.startswith('#'):continue
  page,name,*values=line.split('|');page=int(page)
  assert page in pages and name==pages[page]['name'] and str(page) not in ratings
  assert len(values)==6 and all(v.isdigit() and 0<=int(v)<=5 for v in values)
  ratings[str(page)]=dict(zip(METRIC_AXES,map(int,values)))
 assert set(map(int,ratings))==set(pages),'Every card needs six ratings'
 assert ratings['64']==ratings['65']==ratings['66'],'Identical Murder Bunny cards need identical ratings'
 return ratings

def compile_guides(cards):
 lines=(DATA/'strategy-curation.tsv').read_text(encoding='utf-8').splitlines()
 assert lines[0]=='# Source SHA-256: '+bundle_hash(),'Review guides for the new card source before compiling.'
 registry=json.loads((DATA/'strategy-sources.json').read_text(encoding='utf-8'))
 pages={c['source']['pdf_page']:c for c in cards};guides={}
 for line in lines:
  if not line.strip() or line.startswith('#'):continue
  page,role,play,needs,caution,source_ids=line.split('|');page=int(page)
  assert page in pages and str(page) not in guides,f'Duplicate/unknown guide {page}'
  assert all(v.strip() for v in [role,play,needs,caution]),f'Incomplete guide {page}'
  assert len((role+' '+play+' '+needs+' '+caution).split())<=130,f'Guide {page} is no longer quick'
  sources=[copy.deepcopy(registry[s]) for s in source_ids.split(',') if s]
  assert all(s['url'].startswith('https://') and s['kind'] in ['Official','Community'] for s in sources)
  guides[str(page)]={'role':role,'play':play,'needs':needs,'caution':caution,'sources':sources}
 assert set(map(int,guides))==set(pages),'Every card needs a guide'
 relations=[]
 for page,ability,kind,target,condition in RELATIONS:
  targets=target if isinstance(target,list) else [p for p,c in pages.items() if 'Psychopomp' in c['keywords'] and target in c['keywords']]
  assert targets and len(set(targets))==len(targets) and page not in targets
  assert all(p in pages for p in targets)
  # Require evidence on the summoner card; transformations may also use a signature.
  text=' '.join([pages[page]['raw_front_text'],pages[page]['raw_back_text']]+[a['name']+' '+a['text'] for a in pages[page]['abilities']]).casefold()
  assert ability.split(' / ')[0].casefold() in text,f'Summon ability missing on {page}'
  relations.append({'page':page,'ability':ability,'kind':kind,'target_pages':targets,'condition':condition})
 linked={p for r in relations for p in r['target_pages']}
 assert all(c['source']['pdf_page'] in linked for c in cards if c['eligibility']['summoned_only']),'Unlinked summon'
 return {'schema_version':1,'source_sha256':bundle_hash(),'researched_on':'2026-09-16','basis':'Authored tactical judgement using August 2026 cards and linked published advice. Current cards take precedence over older articles. General resurrection and copied abilities do not imply fixed summon targets.','character_count':len(cards),'characters':guides,'ratings':compile_ratings(cards),'relations':relations}

def attach_guides(cards,source=None):
 for c in cards:
  for key in ['strategy_guide','summons','summoned_by','troupe_metrics']:c.pop(key,None)
 path=DATA/'character-guides.json'
 if not path.exists():return cards
 data=json.loads(path.read_text(encoding='utf-8'))
 if data['source_sha256']!=(source or bundle_hash()):return cards
 by_page={c['source']['pdf_page']:c for c in cards}
 for p,c in by_page.items():
  if str(p) in data['characters']:c['strategy_guide']=copy.deepcopy(data['characters'][str(p)])
  if str(p) in data.get('ratings',{}):c['troupe_metrics']=copy.deepcopy(data['ratings'][str(p)])
 for relation in data['relations']:
  source_card=by_page.get(relation['page'])
  if not source_card:continue
  targets=[by_page[p] for p in relation['target_pages'] if p in by_page]
  item={k:relation[k] for k in ['ability','kind','condition']}
  source_card.setdefault('summons',[]).append(dict(item,character_ids=[c['id'] for c in targets]))
  for c in targets:c.setdefault('summoned_by',[]).append(dict(item,character_ids=[source_card['id']]))
 return cards

if __name__=='__main__':
 cards=json.loads((DATA/'characters.json').read_text(encoding='utf-8'));result=compile_guides(cards)
 path=DATA/'character-guides.json'
 if '--check' in sys.argv:assert result==json.loads(path.read_text(encoding='utf-8')),'Recompile character guides'
 else:path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(f"Validated {result['character_count']} guides and {len(result['relations'])} summon/transformation abilities.")
