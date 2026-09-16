"""Export the builder as portable static assets for GitHub project Pages."""
import hashlib,json,re,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'site'
def export():
 OUT.mkdir(exist_ok=True);(OUT/'data').mkdir(exist_ok=True)
 source=ROOT/'review/dist'
 version=hashlib.sha256(b''.join((source/name).read_bytes() for name in ['builder.html','builder.js','team_logic.js','builder.css','style.css'])+(ROOT/'data/characters.json').read_bytes()).hexdigest()[:16]
 html=(source/'builder.html').read_text(encoding='utf-8')
 html=html.replace('href="/style.css"','href="./style.css"').replace('href="/builder.css"','href="./builder.css"').replace('src="/team_logic.js"','src="./team_logic.js"').replace('src="/builder.js"','src="./builder.js"')
 for asset in ['style.css','builder.css','team_logic.js','builder.js']:html=html.replace('./'+asset+'"','./'+asset+'?v='+version+'"')
 html=html.replace('<a href="/">Review cards ↗</a>','<a href="https://www.moonstonethegame.com/downloads" target="_blank" rel="noopener">Official cards ↗</a>')
 js=(source/'builder.js').read_text(encoding='utf-8').replace("fetch('/api/cards')","fetch('./data/catalogue.json?v="+version+"')").replace("image.src='/'+c.source.image_path","image.src='./'+c.source.image_path").replace("node('a','Review this card ↗')","node('a','Official card ↗')").replace("review.href='/?page='+c.source.pdf_page","review.href=c.source.card_url")
 (OUT/'index.html').write_text(html,encoding='utf-8');(OUT/'builder.js').write_text(js,encoding='utf-8')
 for name in ['builder.css','style.css','team_logic.js']:shutil.copyfile(source/name,OUT/name)
 cards=json.loads((ROOT/'data/characters.json').read_text(encoding='utf-8'))
 (OUT/'data/catalogue.json').write_text(json.dumps({'cards':cards},ensure_ascii=False),encoding='utf-8')
 for c in cards:
  image=ROOT/c['source']['image_path']
  if not image.is_file():raise FileNotFoundError('Generate card images first: python render_card_images.py')
  dest=OUT/c['source']['image_path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(image,dest)
 (OUT/'.nojekyll').touch()
 assert not re.search(r'(?:href|src)="/(?!/)',html)
 assert all('./'+asset+'?v='+version in html for asset in ['style.css','builder.css','team_logic.js','builder.js'])
 assert './data/catalogue.json?v='+version in js
 assert '/api/cards' not in js and "image.src='/'" not in js
 print(f'Static builder exported to {OUT} ({len(cards)} cards).')
if __name__=='__main__':export()
