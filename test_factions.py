"""Audit every PDF symbol, catalogue record and mixed-faction recruitment route."""
import hashlib,json,unittest
import pdfplumber
from build_database import ROOT,PDF,verified_factions,faction_manifest
class FactionTests(unittest.TestCase):
 def test_all_printed_symbols(self):
  cards=json.loads((ROOT/'data/characters.json').read_text(encoding='utf-8'))
  with pdfplumber.open(PDF) as pdf:
   self.assertEqual(len(pdf.pages),len(cards))
   for n,(page,card) in enumerate(zip(pdf.pages,cards),1):
    hashes=[hashlib.sha256(im['stream'].get_data()).hexdigest() for im in page.images if 130<im['x0']<180 and im['top']<15 and im['width']<70]
    self.assertEqual(hashes,card['faction_icon_hashes'],card['name'])
    self.assertEqual(verified_factions(n,hashes),card['factions'],card['name'])
    if not hashes:self.assertFalse(card['eligibility']['selectable'])
    page.close()
 def test_mixed_symbol_regressions(self):
  expected={44:['Commonwealth','Dominion'],59:['Commonwealth','Leshavult'],87:['Dominion','Leshavult'],94:['Leshavult','Shades'],96:['Dominion','Shades'],138:['Commonwealth','Leshavult']}
  for page,factions in expected.items():self.assertEqual(verified_factions(page),factions)
 def test_unknown_or_missing_symbols_fail(self):
  with self.assertRaises(ValueError):verified_factions(59,['unrecognised-icon'])
  with self.assertRaises(ValueError):verified_factions(59,[])
 def test_source_bound_manifest(self):
  self.assertEqual(faction_manifest()['source_sha256'],hashlib.sha256(PDF.read_bytes()).hexdigest())
if __name__=='__main__':unittest.main()
