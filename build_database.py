"""Build a lossless source archive and queryable Moonstone card catalogue."""
import argparse, hashlib, json, re, sqlite3, unicodedata
from pathlib import Path
from functools import lru_cache
import pdfplumber

ROOT=Path(__file__).resolve().parent
PDF=ROOT/'data/sources/character-cards-all-aug-2026.pdf'
URL='https://www.moonstonethegame.com/s/'+PDF.name
MOVES=['High Guard','Falling Swing','Thrust','Sweeping Cut','Rising Attack','Low Guard']
NAME_FIXES={18:'Shabbaroon',20:'Boom Boom McBoom',33:'Sir Guillemot Poppycock',79:'Raegan, Leshavult Priestess',95:'Gump',125:'Cheepaky',127:'Banshee',129:'Dentia',132:'Flinders Memphis',140:'Nancy Priston'}
@lru_cache(maxsize=1)
def faction_manifest():
 manifest=json.loads((ROOT/'data/faction-symbols.json').read_text(encoding='utf-8'))
 if manifest['source_sha256']!=hashlib.sha256(PDF.read_bytes()).hexdigest():raise ValueError('Faction symbols must be audited for this card bundle.')
 return manifest

def verified_factions(n,hashes=None):
 manifest=faction_manifest()
 if hashes is None:
  hashes=[h for h,entry in manifest['symbols'].items() if n in entry['pages']]
 if not hashes:
  if str(n) not in manifest['iconless_summons']:raise ValueError(f'Page {n}: missing faction symbol on a recruitable card.')
  return manifest['iconless_summons'][str(n)]
 factions=[]
 for h in hashes:
  if h not in manifest['symbols']:raise ValueError(f'Page {n}: unknown faction symbol {h}; visual verification required.')
  for faction in manifest['symbols'][h]['factions']:
   if faction not in factions:factions.append(faction)
 return factions
LIGATURES={'\ue324':'y','\ue311':'l','\ue315':'g','\ue325':'e','\ue412':'o'}
def clean(s):
 for a,b in LIGATURES.items():s=s.replace(a,b)
 return unicodedata.normalize('NFKC',s)
def slug(s):return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
def chars_text(chars):
 chars=sorted(chars,key=lambda c:c['x0']); out=''; last=None
 for c in chars:
  if last is not None and c['x0']-last>1.2:out+=' '
  out+=c['text'];last=c['x1']
 return clean(out).strip()
def rgb(c):
 if not c:return (0,0,0)
 if len(c)==4:return tuple((1-c[i])*(1-c[3]) for i in range(3))
 if len(c)==1:return c*3
 return c
def colour(c):
 r,g,b=rgb(c)
 if r>.65 and g<.35:return 'red'
 if g>.45 and r<.5 and b<.5:return 'green'
 if b>.5 and r<.5:return 'blue'
 if r>.7 and g>.6 and b<.5:return 'yellow'
 return None
def region(p,b):return clean(p.crop(b).extract_text(x_tolerance=1,y_tolerance=2) or '')
def build(render=False):
 if hashlib.sha256(PDF.read_bytes()).hexdigest()!='5d789ae2d414bc6bd2676ff7df29955c308b4b8834b9d0192e6e60d8b270f71b':
  raise ValueError('Card bundle changed: review page-specific name and faction mappings before importing.')
 out=ROOT/'data'; (out/'cards').mkdir(exist_ok=True)
 records=[]; glyphs=[]; icons={}
 with pdfplumber.open(PDF) as pdf:
  for index,p in enumerate(pdf.pages):
   n=index+1; cs=p.chars
   title=chars_text([c for c in cs if c['x0']<175 and 'Vicentino' in c['fontname'] and c['top']<52 and c['size']>8])
   version=re.search(r'v\.\s*(\d+)',region(p,(0,0,175,53)))
   name=NAME_FIXES.get(n,re.sub(r'\s+',' ',re.sub(r'\s*v\.\s*\d+','',title)).strip())
   keywords=region(p,(0,30,175,50))
   # Isolate italic keyword line: titles have unusually staggered baselines.
   ks=[c for c in cs if c['x0']<175 and 25<c['top']<50 and 'MinionPro-It' in c['fontname'] and c['size']<9]
   keywords=chars_text(ks)
   stats={}
   for key,x0,x1 in [('melee',10,40),('melee_range_inches',42,82),('arcane',85,119),('evade',120,149)]:
    value=chars_text([c for c in cs if x0<c['x0']<x1 and 58<c['top']<84 and (c['size']>9 or c['text'] in ['+','-'])])
    m=re.search(r'[+-]?\s*\d+',value)
    stats[key]=int(m[0].replace(' ','')) if m else None
   base=re.search(r'(\d+)\s*mm',region(p,(145,220,175,248)))
   health=[c for c in cs if c['x0']<145 and c['top']>225 and 'Wingdings' in c['fontname'] and c['text']=='m']
   dots=[]
   for c in sorted(health,key=lambda c:c['x0']):
    fills=[q for q in p.curves if q.get('fill') and abs(q['x0']-c['x0'])<3 and abs(q['top']-c['top'])<4]
    dots.append({'energy':any(colour(q.get('non_stroking_color'))=='blue' for q in fills)})
   stats.update(health=len(dots),energy=sum(d['energy'] for d in dots))
   body=region(p.filter(lambda o: o.get('object_type')!='char' or 'Vicentino' not in o.get('fontname','')),(0,77,175,225))
   body=body.split('Signature Move on')[0].strip()
   # Bold headings distinguish printed passives from actions and their descriptions.
   bold=p.filter(lambda o:o.get('object_type')=='char' and o.get('x0',999)<175 and 77<o.get('top',0)<216 and 'MinionPro-Bold' in o.get('fontname',''))
   headings=bold.extract_text(x_tolerance=1,y_tolerance=2) or ''
   starts=[]
   for match in re.finditer(r'^([^\n:]{2,90}?)(?:\s*\(\d+\)|:)',body,re.M):
    prefix=match[1].strip()
    if prefix.startswith('Catastrophe') or re.match(r'^[\dX ]',prefix):continue
    starts.append((match.start(),match[0],prefix))
   starts=sorted(set(starts)); abilities=[]
   for j,(pos,h,prefix) in enumerate(starts):
    text=body[pos:starts[j+1][0] if j+1<len(starts) else len(body)].strip()
    cost=re.search(r'\((\d+)\)',text.split('\n')[0]); ran=re.search(r'(\d+)\s*[”"]',text.split('\n')[0])
    cat='passive' if not cost else ('arcane_action' if 'Catastrophe' in text else 'action')
    abilities.append({'name':prefix,'category':cat,'energy_cost':int(cost[1]) if cost else None,'range_inches':int(ran[1]) if ran else None,'text':text,'arcane_colours':[]})
    # Colour squares occur at the start of the arcane result line.
    for q in p.curves+p.rects:
     co=colour(q.get('non_stroking_color'))
     if co and q.get('fill') and q['x0']<20 and 77<q['top']<216:
      nearby=region(p,(0,max(77,q['top']-12),175,min(216,q['top']+7)))
      if prefix in nearby and co not in abilities[-1]['arcane_colours']:abilities[-1]['arcane_colours'].append(co)
   sigtext=region(p,(190,0,350,245)); sig={ 'text':sigtext,'damage_table':{}}
   for move in MOVES:
    m=re.search(re.escape(move)+r'\s+([W\d]+)',sigtext)
    if m:sig['damage_table'][move]=None if m[1]=='W' else int(m[1])
   m=re.search(r'Upgrade for (.+)',sigtext);sig['upgrade_for']=m[1].strip() if m else None
   sig['name']=sigtext.split('\n')[0] if m else None
   sig['damage_type']=(re.search(r'Damage Type:\s*(\w+)',sigtext) or [None,None])[1]
   sig['highlighted_outcomes']=[move for move in MOVES if any(colour(q.get('non_stroking_color'))=='yellow' and q.get('fill') and q['x0']>300 and abs(q['top']-(98+14.4*MOVES.index(move)))<7 for q in p.curves)]
   # Keep the faction icon's exact image hash for repeatable mapping and review.
   icon_images=[im for im in p.images if im['x0']>130 and im['x0']<180 and im['top']<15 and im['width']<70]
   ih=[hashlib.sha256(im['stream'].get_data()).hexdigest() for im in icon_images]
   factions=verified_factions(n,ih)
   for h in ih:icons.setdefault(h,{'pages':[],'verified_factions':factions})['pages'].append(n)
   flags=[]
   if not name:flags.append('missing_name')
   if any(stats[k] is None for k in ['melee','melee_range_inches','arcane','evade']):flags.append('special_or_missing_stat')
   if any('\ue000'<=ch<='\uf8ff' for ch in name):flags.append('unmapped_name_glyph')
   if not abilities:flags.append('ability_segmentation')
   flags.extend(['ability_segmentation_needs_review','multiple_faction_membership_needs_review'])
   record={'id':slug(name)+'-'+str(n),'name':name,'card_version':int(version[1]) if version else 1,'factions':factions,'faction_icon_hashes':ih,'keywords':[k.strip() for k in keywords.split(',') if k.strip()],'base_size_mm':int(base[1]) if base else None,'stats':stats,'health_track':dots,'abilities':abilities,'signature_move':sig,'raw_front_text':region(p,(0,0,180,p.height)),'raw_back_text':sigtext,'source':{'character_urls':[],'card_url':URL+'#page='+str(n),'pdf_page':n,'image_path':f'data/cards/{n:03}.png'},'review':{'status':'unverified','flags':flags}}
   # Link only names actually found in official page text; never fabricate character URLs.
   for page in (out/'sources').glob('*.html'):
    html=clean(page.read_text(encoding='utf-8'))
    if name and name.lower() in re.sub('<[^>]+>',' ',html).lower():record['source']['character_urls'].append('https://www.moonstonethegame.com/'+page.stem)
   p.to_image(resolution=360).original.save(out/'cards'/f'{n:03}.png')
   glyphs.append({'page':n,'characters':[{k:c.get(k) for k in ['text','x0','x1','top','bottom','fontname','size','non_stroking_color']} for c in cs],'graphics':[{k:q.get(k) for k in ['object_type','x0','x1','top','bottom','fill','non_stroking_color']} for q in p.curves+p.rects]})
   records.append(record)
   p.close()
 from review_store import apply_reviews
 records=apply_reviews(records)
 (out/'characters.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
 (out/'extraction.json').write_text(json.dumps(glyphs,ensure_ascii=False),encoding='utf-8')
 (out/'faction-icons.json').write_text(json.dumps(icons,indent=2),encoding='utf-8')
 from review_store import export
 export(records)
 report={'card_pages':len(records),'abilities':sum(len(c['abilities']) for c in records),'source_sha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),'unverified_records':sum(c['review']['status']!='verified' for c in records),'missing_base':[c['source']['pdf_page'] for c in records if c['base_size_mm'] is None],'name_glyph_review':[c['source']['pdf_page'] for c in records if any('\ue000'<=ch<='\uf8ff' for ch in c['name'])]}
 (out/'quality-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
if __name__=='__main__':build()
