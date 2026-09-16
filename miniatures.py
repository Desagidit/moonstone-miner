"""Source-bound painted miniature and shop links from the public official catalogue.

Single-Mini and Monster-Box products are matched by exact names or explicit aliases.
Only the shop's landscape painted-photo assets are selected; portrait stat cards,
packaging, larger scale models and limited editions are excluded.
"""
import copy,hashlib,json,re,sys,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parent
DATA=ROOT/'data'
ALIASES={15:'Doug the Flatulent',31:'Natty the Slum Thief',45:'Brunhilde the Giant',88:'Bjorn',100:'The Terrible Musician',28:'Gotchgut the Giant',29:'Boulder the Troll',32:'Gertrude the Faerie Hunter',35:'Tabby, The Librarian',40:'Joanna, Nordic Princess',42:'Loci',46:'Bristlenose the Troll',47:'Ribald the Troll',59:'Brother Daniel',60:'Kavanagh the Jongler',61:'Kalista, Leshavult Priestess',63:'Boris the Bunny Summoner',67:'Zorya, Dawn Witch',68:'Antonia, Noon Witch',69:'Danica, Dusk Witch',77:'Stryga Anya',79:'Raegan, Leshavult Priestess',80:'Gwendoline, Leshavult Priestess (Cherry)',87:'Knoll the Troll',101:'Flay, Bearer of Knowledge',104:'The Teacake of Torment',109:'Angerboda, Frost Giant',114:"Sen'ara",124:'Commodore Delahaye',125:'Chezapeaky',131:'Professor Boffinsworth',132:'Professor Flinders Memphis',138:'Streatham and Pickles',139:'Streatham and Pickles'}
SHARED={64:('boris-the-bunny-summoner','Murder-Bunnies'),65:('boris-the-bunny-summoner','Murder-Bunnies'),66:('boris-the-bunny-summoner','Murder-Bunnies'),120:('nanny','Urchin'),121:('nanny','Sprog'),122:('nanny','Pookie')}

def normal(s):return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower().replace('&','and'))
def bundle_hash():return hashlib.sha256((DATA/'sources/character-cards-all-aug-2026.pdf').read_bytes()).hexdigest()
def compile_miniatures(cards):
 products=sum((json.loads((DATA/'sources'/p).read_text(encoding='utf-8'))['products'] for p in ('shop-products.json','shop-products-2.json')),[])
 by_handle={p['handle']:p for p in products}
 pool=[p for p in products if p['product_type'] in ('Single Mini','Monster Box','Troupe Box') and not re.search(r'limited edition|upgrade kit',p['title'],re.I)]
 by_name={normal(p['title']):p for p in pool};result={};missing=[]
 for c in cards:
  page=c['source']['pdf_page'];alias=ALIASES.get(page,c['name']);prefix=None
  if page in SHARED:
   handle,prefix=SHARED[page];product=by_handle[handle]
  else:product=by_name.get(normal(alias))
  if not product:missing.append((page,c['name'],alias));continue
  photos=[i for i in product['images'] if (i['width'],i['height'])==(540,426) and (not prefix or i['src'].rsplit('/',1)[-1].startswith(prefix))]
  if not photos:missing.append((page,c['name'],'no painted photo'));continue
  photo=photos[0]
  store='https://shop.moonstonethegame.com/products/'+product['handle']
  # Keep the exact box deeplink supplied for Gradock; its box contains the miniature.
  if page==13:store='https://shop.moonstonethegame.com/collections/gnomes/products/brothers-in-arms?variant=21037283901540'
  entry={'image_url':photo['src'],'store_url':store,'photo_source_url':'https://shop.moonstonethegame.com/products/'+product['handle'],'product_title':product['title'],'image_width':photo['width'],'image_height':photo['height'],'photo_scope':('Murder Bunnies' if page in (64,65,66) else 'Streatham and Pickles' if page in (138,139) else c['name']),'attribution':'Goblin King Games'}
  result[str(page)]=entry
 assert not missing,f'Unmatched miniatures: {missing}'
 return {'schema_version':1,'source_sha256':bundle_hash(),'source_urls':['https://www.moonstonethegame.com/gnomes','https://shop.moonstonethegame.com/products.json'],'record_count':len(result),'characters':result}

def attach_miniatures(cards,source=None):
 path=DATA/'miniatures.json'
 for c in cards:c.pop('miniature',None)
 if not path.exists():return cards
 data=json.loads(path.read_text(encoding='utf-8'))
 if data['source_sha256']!=(source or bundle_hash()):return cards
 for c in cards:
  entry=data['characters'].get(str(c['source']['pdf_page']))
  if entry:c['miniature']=copy.deepcopy(entry)
 return cards

if __name__=='__main__':
 cards=json.loads((DATA/'characters.json').read_text(encoding='utf-8'));result=compile_miniatures(cards);path=DATA/'miniatures.json'
 if '--check' in sys.argv:assert result==json.loads(path.read_text(encoding='utf-8')),'Recompile miniature metadata'
 else:path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(f"Matched painted photos and miniature store pages for all {result['record_count']} source records.")
