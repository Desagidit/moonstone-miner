"""Persistence and API regression tests; no changes to the actual review store."""
import copy,json,tempfile,threading,unittest,urllib.request,urllib.error
from pathlib import Path
from unittest.mock import patch
import review_store as store
import review_server as server

class ReviewTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.data=Path(self.tmp.name)
  self.cards=json.loads((store.DATA/'characters.json').read_text(encoding='utf-8'))
  store.atomic_json(self.data/'characters.json',self.cards)
  self.patches=[patch.object(store,'DATA',self.data),patch.object(server,'DATA',self.data),patch.object(store,'source_hash',lambda:'bundle-a'),patch.object(server,'source_hash',lambda:'bundle-a')]
  for p in self.patches:p.start()
 def tearDown(self):
  for p in reversed(self.patches):p.stop()
  self.tmp.cleanup()
 def test_source_binding_and_import_overlay(self):
  original=copy.deepcopy(self.cards[0]); values={'name':'Reviewed Baron','keywords':['Human','Noble'],'base_size_mm':30,'card_version':1}
  reviews={'revision':1,'sources':{'bundle-a':{'1':{'groups':{'identity':{'values':values,'status':'verified','note':'Checked against card'}}}}}}
  result=store.apply_reviews(copy.deepcopy(self.cards),reviews)[0]
  self.assertEqual(result['name'],'Reviewed Baron');self.assertEqual(result['review']['fields']['identity'],'verified');self.assertEqual(result['review']['notes']['identity'],'Checked against card')
  self.assertEqual(result['abilities'],original['abilities'])
  # Corrections match the page and source hash, regardless of a regenerated character ID.
  regenerated=copy.deepcopy(self.cards);regenerated[0]['id']='changed-id'
  self.assertEqual(store.apply_reviews(regenerated,reviews)[0]['name'],'Reviewed Baron')
  with patch.object(store,'source_hash',lambda:'bundle-b'):
   self.assertEqual(store.apply_reviews(copy.deepcopy(self.cards),reviews)[0]['name'],original['name'])
 def test_atomic_exports(self):
  cards=store.apply_reviews(copy.deepcopy(self.cards));cards[0]['name']='Test export';store.export(cards)
  import sqlite3
  with sqlite3.connect(self.data/'moonstone.sqlite') as db:
   self.assertEqual(db.execute('SELECT name FROM characters WHERE id=?',(cards[0]['id'],)).fetchone()[0],'Test export')
  db.close()
  self.assertEqual(json.loads((self.data/'characters.json').read_text(encoding='utf-8'))[0]['name'],'Test export')
 def test_partner_curation_survives_reviews_and_exports(self):
  from suggested_partners import bundle_hash
  with patch.object(store,'source_hash',bundle_hash):
   regenerated=copy.deepcopy(self.cards);regenerated[1]['id']='reviewed-eric-id'
   result=store.apply_reviews(regenerated)
   self.assertEqual(result[0]['suggested_partners']['by_faction']['Commonwealth']['partners'][0]['character_id'],'reviewed-eric-id')
   store.export(result)
   import sqlite3
   with sqlite3.connect(self.data/'moonstone.sqlite') as db:
    self.assertEqual(db.execute('SELECT COUNT(*) FROM suggested_partners').fetchone()[0],sum(len(route['partners']) for c in result for route in c.get('suggested_partners',{}).get('by_faction',{}).values()))
    record=json.loads(db.execute('SELECT record_json FROM characters WHERE id=?',(result[137]['id'],)).fetchone()[0])
    self.assertEqual(record['strategy_guide'],result[137]['strategy_guide'])
    self.assertEqual(record['summons'],result[137]['summons'])
   db.close()
   reloaded=json.loads((self.data/'characters.json').read_text(encoding='utf-8'))
   self.assertEqual(reloaded[0]['suggested_partners'],result[0]['suggested_partners'])
   self.assertEqual(reloaded[0]['miniature'],result[0]['miniature'])
   self.assertEqual(reloaded[0]['strategy_guide'],result[0]['strategy_guide'])
   self.assertEqual(reloaded[137]['summons'],result[137]['summons'])
   self.assertIn('cdn.shopify.com',result[0]['miniature']['image_url'])
  # A changed source must not retain tactical inferences from the old bundle.
  self.assertNotIn('suggested_partners',store.apply_reviews(copy.deepcopy(self.cards))[0])
  self.assertNotIn('miniature',store.apply_reviews(copy.deepcopy(self.cards))[0])
  changed=store.apply_reviews(copy.deepcopy(self.cards))
  self.assertNotIn('strategy_guide',changed[0])
  self.assertNotIn('summons',changed[137])
 def test_validation(self):
  with self.assertRaises(ValueError):store.validate_group('factions',{'factions':['Invented']})
  with self.assertRaises(ValueError):store.validate_group('identity',{'source':{}})
  with self.assertRaises(ValueError):store.validate_group('abilities',{'abilities':[{'name':'x','category':'wrong','text':'x'}]})
  with self.assertRaises(ValueError):store.validate_group('eligibility',{'eligibility':{'selectable':True,'summoned_only':True}})
  store.validate_group('eligibility',{'eligibility':{'selectable':False,'summoned_only':True}})
 def test_binary_eligibility_pass(self):
  expected={64,65,66,77,99,100,101,102,103,104,120,121,122,139}
  actual={c['source']['pdf_page'] for c in self.cards if store.classify_eligibility(c['raw_front_text'])['summoned_only']}
  self.assertEqual(actual,expected)
  self.assertTrue(store.classify_eligibility('Thrall: This character can only\nenter play when summoned.')['summoned_only'])
  self.assertTrue(store.classify_eligibility('Summoned Being: You cannot choose this character for your Troupe.')['summoned_only'])
  self.assertTrue(store.classify_eligibility('Summon a Murder Bunny (3). Target friendly Thrall or Rogue.')['selectable'])
 def test_tags_and_red_symbols(self):
  from card_tags import arcane_colour,assign_tags
  self.assertEqual(arcane_colour((.9,0,.492)),'red')
  self.assertEqual(arcane_colour((0,1,0,0)),'red')
  self.assertEqual(arcane_colour((0,.621,.892)),'blue')
  c={'stats':{'health':8,'energy':4},'abilities':[{'text':'Target restores 1 Wd.','arcane_colours':['red']}],'source':{'pdf_page':12}}
  self.assertEqual(assign_tags(c),['Healer','Tank','Energetic','Red','Shover'])
  c['stats']={'health':7,'energy':3};c['source']['pdf_page']=15;c['abilities'][0]['text']='Restore energy up to blue dots on the health bar. Move this model towards target enemy.'
  self.assertEqual(assign_tags(c),['Red'])
 def test_save_reload_and_stale_revision(self):
  http=server.HTTPServer(('127.0.0.1',0),server.Handler);thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start();origin=f'http://127.0.0.1:{http.server_port}'
  def post(payload,origin_header=origin):
   req=urllib.request.Request(origin+'/api/review',data=json.dumps(payload).encode(),headers={'Origin':origin_header,'Content-Type':'application/json'})
   return json.load(urllib.request.urlopen(req))
  payload={'page':1,'source_hash':'bundle-a','revision':0,'groups':{'factions':{'values':{'factions':['Commonwealth']},'status':'verified','note':'Faction symbol checked'}}}
  try:
   self.assertEqual(post(payload)['revision'],1)
   loaded=json.load(urllib.request.urlopen(origin+'/api/cards'))
   self.assertEqual(loaded['cards'][0]['review']['notes']['factions'],'Faction symbol checked')
   with self.assertRaises(urllib.error.HTTPError) as err:post(payload)
   self.assertEqual(err.exception.code,409)
   with self.assertRaises(urllib.error.HTTPError) as err:post(payload,'http://other-site.test')
   self.assertEqual(err.exception.code,403)
   payload['revision']=1;payload['source_hash']='wrong'
   with self.assertRaises(urllib.error.HTTPError):post(payload)
   self.assertEqual(store.load_reviews()['revision'],1)
  finally:http.shutdown();http.server_close();thread.join()

if __name__=='__main__':unittest.main()
