"""Apply the requested binary eligibility pass without changing other reviews."""
import json
from datetime import datetime,timezone
from review_store import *
cards=json.loads((DATA/'characters.json').read_text(encoding='utf-8'))
store=load_reviews();reviews=store['sources'].setdefault(source_hash(),{})
now=datetime.now(timezone.utc).isoformat()
for c in cards:
 overlay=reviews.setdefault(str(c['source']['pdf_page']),{'groups':{}})
 overlay['groups']['eligibility']={'values':{'eligibility':classify_eligibility(c['raw_front_text'])},'status':'verified','note':''}
 overlay['updated_at']=now
store['revision']+=1;atomic_json(DATA/'reviews.json',store)
cards=apply_reviews(cards,store);export(cards)
summons=[{'page':c['source']['pdf_page'],'name':c['name']} for c in cards if c['eligibility']['summoned_only']]
atomic_json(DATA/'eligibility-pass.json',{'selectable':len(cards)-len(summons),'summon':len(summons),'summons':summons})
print(f'{len(cards)-len(summons)} selectable card entries; {len(summons)} summon card entries.')
