import urllib.request
from pathlib import Path
Path('data/sources').mkdir(parents=True,exist_ok=True)
for name in ['character-cards-all-aug-2026.pdf','moonstone-basic-rules-v3.pdf']:
    Path('data/sources',name).write_bytes(urllib.request.urlopen('https://www.moonstonethegame.com/s/'+name).read())
for name in ['gnomes','commonwealth-humans','faeries','goblins','dominion-humans','leshavult-cultists-and-spirits','fauns','shades-of-moonreach','giants-and-trolls']:
    Path('data/sources',name+'.html').write_bytes(urllib.request.urlopen('https://www.moonstonethegame.com/'+name).read())
