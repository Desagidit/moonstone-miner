"""Source-symbol arcane colours and character role tags."""
import re
TAGS=('Healer','Tank','Energetic','Blue','Green','Red','Shover','Woodland','Wet')
# Reviewed against the source bundle: movement/relocation of another model,
# including forced movement, swaps and granted movement; excludes self-movement.
SHOVER_PAGES={5,6,8,9,10,12,16,17,18,19,20,22,23,25,28,30,33,35,37,39,41,42,43,47,51,54,56,59,61,62,68,70,72,80,84,90,91,92,95,97,98,100,114,115,117,118,121,125,127,135,136,138}
def arcane_colour(c):
 if not c:return None
 if len(c)==4:r,g,b=((1-c[i])*(1-c[3]) for i in range(3))
 elif len(c)==3:r,g,b=c
 else:return None
 if r>.65 and g<.35:return 'red'
 if g>.45 and r<.5 and b<.5:return 'green'
 if b>.5 and r<.5:return 'blue'
 return None
def assign_tags(card):
 text=re.sub(r'\s+',' ',' '.join(a['text'] for a in card['abilities'])).lower()
 tags=[]
 if re.search(r'\b(?:heal(?:ing|s)?|restore[sd]?|recover[sd]?)\b[^.!?]{0,110}\b(?:wds?|wounds?)\b|\brestore half (?:its|their) health',text):tags.append('Healer')
 if (card['stats'].get('health') or 0)>=8:tags.append('Tank')
 if (card['stats'].get('energy') or 0)>=4:tags.append('Energetic')
 colours={co for a in card['abilities'] for co in a.get('arcane_colours',[])}
 for co in ('blue','green','red'):
  if co in colours:tags.append(co.title())
 if card.get('source',{}).get('pdf_page') in SHOVER_PAGES:tags.append('Shover')
 if re.search(r'wood(?:ed|land)? (?:patch|tile|feature)|woodspirit|wooden patch',text):tags.append('Woodland')
 if re.search(r'water (?:feature|tile|patch)|water features',text):tags.append('Wet')
 return tags
