"""Read coloured result graphics directly, attach to abilities, then tag cards."""
import json,re
from datetime import datetime,timezone
import pdfplumber
from review_store import *
from card_tags import *
def colour_pass(cards):
 with pdfplumber.open(DATA/'sources/character-cards-all-aug-2026.pdf') as pdf:
  for card in cards:
   p=pdf.pages[card['source']['pdf_page']-1]
   front=p.filter(lambda o:o.get('object_type')!='char' or (o.get('x0',999)<175 and 'Vicentino' not in o.get('fontname','')))
   lines=front.extract_text_lines(x_tolerance=1,y_tolerance=2)
   headings=[]
   for i,a in enumerate(card['abilities']):
    name=a['name'].lower().strip()
    matches=[l for l in lines if l['top']>77 and l['text'].lower().startswith(name) and re.match(r'^\s*[:(\[]',l['text'][len(name):])]
    if matches:headings.append((matches[0]['top'],i))
    a['arcane_colours']=[]
   headings.sort()
   for q in p.curves+p.rects:
    co=arcane_colour(q.get('non_stroking_color'))
    if not co or not q.get('fill') or q['x0']>=25 or not 77<q['top']<225:continue
    prior=[h for h in headings if h[0]<=q['top']+2]
    if prior:
     a=card['abilities'][prior[-1][1]]
     if co not in a['arcane_colours']:a['arcane_colours'].append(co)
   p.close()
 return cards
if __name__=='__main__':
 cards=apply_reviews(json.loads((DATA/'characters.json').read_text(encoding='utf-8')))
 cards=colour_pass(cards);store=load_reviews();reviews=store['sources'].setdefault(source_hash(),{});now=datetime.now(timezone.utc).isoformat()
 for c in cards:
  overlay=reviews.setdefault(str(c['source']['pdf_page']),{'groups':{}})
  existing=overlay['groups'].get('abilities',{})
  overlay['groups']['abilities']={'values':{'abilities':c['abilities']},'status':existing.get('status','needs_review'),'note':existing.get('note','')}
  overlay['groups']['custom_tags']={'values':{'custom_tags':assign_tags(c)},'status':'verified','note':''};overlay['updated_at']=now
 store['revision']+=1;atomic_json(DATA/'reviews.json',store);cards=apply_reviews(cards,store);export(cards)
 for tag in TAGS:
  print(tag,sum(tag in c['custom_tags'] for c in cards))
