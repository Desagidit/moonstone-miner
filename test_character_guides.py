"""Check complete guide coverage, summon semantics and source/ID binding."""
import copy,json,unittest
from character_guides import DATA,attach_guides,compile_guides
from suggested_partners import bundle_hash

class GuideTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.cards=json.loads((DATA/'characters.json').read_text(encoding='utf-8'))
  cls.by_page={c['source']['pdf_page']:c for c in cls.cards}
 def test_complete_reproducible_curation(self):
  result=compile_guides(self.cards)
  self.assertEqual(result,json.loads((DATA/'character-guides.json').read_text(encoding='utf-8')))
  self.assertEqual(result['character_count'],141)
  self.assertTrue(all(c.get('strategy_guide') for c in self.cards))
 def test_ratings_coverage_and_duplicate_cards(self):
  for c in self.cards:
   self.assertEqual(set(c['troupe_metrics']),{'Tank','Damage','Support','Moonstone','Complexity','Range'})
   self.assertTrue(all(isinstance(v,int) and 0<=v<=5 for v in c['troupe_metrics'].values()))
  self.assertEqual(self.by_page[64]['troupe_metrics'],self.by_page[65]['troupe_metrics'])
  self.assertEqual(self.by_page[65]['troupe_metrics'],self.by_page[66]['troupe_metrics'])
  changed=attach_guides(copy.deepcopy(self.cards),'new-source')
  self.assertTrue(all('troupe_metrics' not in c for c in changed))
 def test_named_summons_and_transformations(self):
  self.assertEqual(self.by_page[138]['summons'][0]['character_ids'],[self.by_page[139]['id']])
  self.assertEqual(self.by_page[139]['summoned_by'][0]['character_ids'],[self.by_page[138]['id']])
  self.assertEqual(self.by_page[76]['summons'][0]['kind'],'transformation')
  self.assertEqual(self.by_page[77]['summons'][0]['character_ids'],[self.by_page[76]['id']])
  self.assertIn('Shades only',self.by_page[110]['summons'][0]['condition'])
  self.assertTrue(self.by_page[105]['eligibility']['selectable'])
  self.assertTrue(self.by_page[73]['eligibility']['selectable'])
 def test_keyword_options_and_conditional_encore(self):
  psych={c['id'] for c in self.cards if 'Psychopomp' in c['keywords']}
  self.assertEqual(len(psych),9)
  self.assertEqual(set(self.by_page[116]['summons'][0]['character_ids']),psych)
  encore=self.by_page[118]['summons'][1]
  self.assertEqual(encore['kind'],'resummon')
  self.assertEqual(set(encore['character_ids']),psych)
  self.assertIn('slain earlier this turn',encore['condition'])
  self.assertEqual(set(self.by_page[107]['summons'][0]['character_ids']),{self.by_page[p]['id'] for p in [101,102]})
  self.assertEqual(set(self.by_page[108]['summons'][0]['character_ids']),{self.by_page[p]['id'] for p in [99,100]})
  # Generic resurrection and copying are not fixed summon relationships.
  self.assertNotIn('summons',self.by_page[123]);self.assertNotIn('summons',self.by_page[126])
 def test_all_links_resolve_and_have_reverse_links(self):
  by_id={c['id']:c for c in self.cards}
  for c in self.cards:
   if c['eligibility']['summoned_only']:self.assertTrue(c.get('summoned_by'))
   for relation in c.get('summons',[]):
    for id in relation['character_ids']:
     self.assertIn(id,by_id)
     self.assertTrue(any(c['id'] in r['character_ids'] and r['ability']==relation['ability'] for r in by_id[id]['summoned_by']))
 def test_regenerated_ids_and_changed_source(self):
  cards=copy.deepcopy(self.cards);cards[138]['id']='new-pickles-id'
  result=attach_guides(cards,bundle_hash())
  self.assertEqual(result[137]['summons'][0]['character_ids'],['new-pickles-id'])
  changed=attach_guides(copy.deepcopy(result),'another-bundle')
  self.assertTrue(all(not any(k in c for k in ['strategy_guide','summons','summoned_by']) for c in changed))

if __name__=='__main__':unittest.main()
