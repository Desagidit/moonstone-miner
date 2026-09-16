import argparse, json, threading
import re
from datetime import datetime,timezone
from http.server import SimpleHTTPRequestHandler,HTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from review_store import *

class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def reply(self,value,status=200):
  body=json.dumps(value,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
 def do_GET(self):
  route=urlsplit(self.path).path
  if route=='/api/cards':
   cards=apply_reviews(json.loads((DATA/'characters.json').read_text(encoding='utf-8')))
   return self.reply({'cards':cards,'revision':load_reviews()['revision'],'source_hash':source_hash()})
  if route=='/':self.path='/review/dist/index.html'
  elif route in ['/builder','/builder/']:self.path='/review/dist/builder.html'
  elif route in ['/builder.js','/builder.css','/team_logic.js']:self.path='/review/dist'+route
  elif route in ['/app.js','/style.css']:self.path='/review/dist'+route
  elif not re.fullmatch(r'/data/cards/\d{3}\.png',route) and route not in ['/data/characters.json','/data/moonstone.sqlite','/data/reviews.json']:return self.reply({'error':'Not found'},404)
  super().do_GET()
 def do_POST(self):
  if self.path!='/api/review':return self.reply({'error':'Not found'},404)
  if self.headers.get('Origin') not in [f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}']:return self.reply({'error':'Save requests must come from this review screen.'},403)
  try:
   length=int(self.headers.get('Content-Length','0'))
   if not 0<length<2_000_000:raise ValueError('Invalid request size.')
   req=json.loads(self.rfile.read(length));store=load_reviews()
   if req.get('revision')!=store['revision']:return self.reply({'error':'Another review was saved. Reload before saving your changes.'},409)
   if req.get('source_hash')!=source_hash():raise ValueError('Source bundle changed. Reload the review screen.')
   page=str(req['page']);cards=json.loads((DATA/'characters.json').read_text(encoding='utf-8'))
   if not any(str(c['source']['pdf_page'])==page for c in cards):raise ValueError('Unknown card page.')
   for group,entry in req['groups'].items():
    validate_group(group,entry['values'])
    if entry['status'] not in ['verified','needs_review','blocked'] or not isinstance(entry.get('note',''),str):raise ValueError('Invalid review status or note.')
   reviews=store['sources'].setdefault(source_hash(),{});overlay=reviews.setdefault(page,{'groups':{}})
   overlay['groups'].update(req['groups']);overlay['updated_at']=datetime.now(timezone.utc).isoformat();store['revision']+=1
   effective=apply_reviews(copy.deepcopy(cards),store)
   card=next(c for c in effective if str(c['source']['pdf_page'])==page)
   if card['review']['fields']['stats']=='verified' and card['review']['fields']['health_track']=='verified' and any(i['code']=='track_mismatch' for i in card['review']['issues']):raise ValueError('Health and energy must match the health track before both fields can be verified.')
   atomic_json(DATA/'reviews.json',store)
   export(effective)
   self.reply({'revision':store['revision'],'saved_at':overlay['updated_at']})
  except (ValueError,KeyError,TypeError) as e:self.reply({'error':str(e)},400)
  except Exception:self.reply({'error':'Could not update exports. Corrections may be saved; reload and retry.'},500)

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);args=parser.parse_args()
 export(apply_reviews(json.loads((DATA/'characters.json').read_text(encoding='utf-8'))))
 print(f'Moonstone review: http://127.0.0.1:{args.port}',flush=True)
 HTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
