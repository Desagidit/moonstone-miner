const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),L=require('./review/dist/team_logic.js');
const nodes=new Map();class E{constructor(){this.children=[];this.style={};this.value=''}set id(v){nodes.set(v,this)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}setAttribute(k,v){this.attributes??={};this.attributes[k]=String(v)}showModal(){this.open=true}close(){this.open=false} }
for(const id of ['troupe-name','saved-troupes','save-troupe','new-troupe','load-troupe','delete-troupe','storage-status','troupe-chart','metric-summary','mini-dialog','mini-title','mini-image','mini-loading','mini-store','mini-close','partners','partner-heading','faction','faction-filter','size','find','sort','team','team-status','tag-summary','keyword-summary','notice','catalogue','result-count','focused','filter-groups','add-group','clear-filters','outer-mode','load-status']){const e=new E();e.id=id}
nodes.get('troupe-name').value='New troupe';nodes.get('faction').value='Undecided';nodes.get('size').value='6';nodes.get('sort').value='name';
const cards=JSON.parse(fs.readFileSync('data/characters.json','utf8')),storage=new Map();
const ctx=vm.createContext({TeamLogic:L,console,document:{getElementById:id=>nodes.get(id),createElement:()=>new E(),createElementNS:()=>new E()},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:true,json:async()=>({cards})})});
vm.runInContext(fs.readFileSync(process.argv.includes('--static')?'site/builder.js':'review/dist/builder.js','utf8'),ctx);
(async()=>{await new Promise(r=>setImmediate(r));assert.equal(vm.runInContext('cards.length',ctx),141);assert.ok(nodes.get('catalogue').children.every(n=>!n.className.includes('incompatible')));assert.ok(nodes.get('faction-filter').disabled);assert.ok(!nodes.get('focused').children.some(n=>n.className==='panel'));
 const actions=nodes.get('focused').children[0];const miniButton=actions.children.find(n=>n.className==='mini-photo');assert.ok(miniButton);miniButton.onclick();assert.equal(nodes.get('mini-dialog').open,true);assert.equal(nodes.get('mini-image').src,cards[0].miniature.image_url);assert.equal(nodes.get('mini-store').href,cards[0].miniature.store_url);nodes.get('mini-image').onload();assert.equal(nodes.get('mini-image').hidden,false);nodes.get('mini-image').onerror();assert.equal(nodes.get('mini-image').hidden,true);assert.match(nodes.get('mini-loading').textContent,/could not load/);nodes.get('mini-close').onclick();assert.equal(nodes.get('mini-dialog').open,false);miniButton.onclick();nodes.get('mini-dialog').onclick({target:nodes.get('mini-dialog')});assert.equal(nodes.get('mini-dialog').open,false);
 const partnerRows=nodes.get('partners').children.filter(n=>n.className==='partner');assert.equal(partnerRows.length,3);assert.match(nodes.get('partner-heading').textContent,/Baron/);
 const partnerVisitCount=vm.runInContext('visits.length',ctx);
 partnerRows[0].children.find(n=>n.className==='partner-add').onclick();assert.equal(vm.runInContext('visits.length',ctx),partnerVisitCount);assert.equal(vm.runInContext('focus.id',ctx),cards[0].id);assert.equal(vm.runInContext('teamIds[0]',ctx),cards[1].id);vm.runInContext('remove(cards[1])',ctx);
 vm.runInContext('add(cards[0]);add(cards[1]);add(cards[0])',ctx);assert.equal(vm.runInContext('teamIds.length',ctx),2);
 assert.ok(nodes.get('keyword-summary').children.some(c=>c.textContent==='Human ×2'));
 vm.runInContext('add(cards[63])',ctx);assert.equal(vm.runInContext('teamIds.length',ctx),2);
 nodes.get('faction').value='Dominion';nodes.get('faction').onchange();assert.match(nodes.get('team-status').textContent,/2 incompatible/);
 assert.ok(nodes.get('catalogue').children[0].className.includes('incompatible'));
 nodes.get('faction-filter').onclick();assert.equal(vm.runInContext('factionFilter',ctx),true);assert.ok(nodes.get('catalogue').children.every(n=>!n.className.includes('incompatible')));
 vm.runInContext('remove(cards[0])',ctx);assert.equal(vm.runInContext('teamIds.length',ctx),1);
 assert.equal(JSON.parse(storage.get('moonstone-troupe-v1')).ids.length,1);
 nodes.get('add-group').onclick();assert.equal(vm.runInContext('query.groups.length',ctx),1);
 nodes.get('clear-filters').onclick();assert.equal(vm.runInContext('query.groups.length',ctx),0);
 vm.runInContext('show(cards[27])',ctx);assert.match(nodes.get('partners').children[0].textContent,/Dominion/);
 nodes.get('faction').value='Commonwealth';nodes.get('faction').onchange();assert.match(nodes.get('partners').children[0].textContent,/Commonwealth/);
 vm.runInContext('show(cards[63])',ctx);assert.match(nodes.get('partners').children[0].textContent,/summon support/);
 // Actual browsing, not catalogue order or troupe mutations.
 vm.runInContext('show(cards[137])',ctx);
 const related=()=>nodes.get('focused').children.filter(n=>n.className==='related-characters');
 const pickles=related()[0].children[1].children.find(n=>n.textContent==='Pickles');assert.ok(pickles);pickles.onclick();
 assert.equal(vm.runInContext('focus.id',ctx),cards[138].id);
 const nav=()=>nodes.get('focused').children[0].children.find(n=>n.className==='card-navigation').children;
 assert.equal(nav()[1].disabled,true);nav()[0].onclick();assert.equal(vm.runInContext('focus.id',ctx),cards[137].id);
 assert.equal(nav()[1].disabled,false);nav()[1].onclick();assert.equal(vm.runInContext('focus.id',ctx),cards[138].id);
 nav()[0].onclick();vm.runInContext('show(cards[62])',ctx);assert.equal(nav()[1].disabled,true);
 const before=vm.runInContext('visits.length',ctx);nodes.get('size').onchange();vm.runInContext('remove(cards[1])',ctx);assert.equal(vm.runInContext('visits.length',ctx),before);
 const guide=nodes.get('focused').children.find(n=>n.className==='strategy-guide');assert.ok(guide);assert.equal(guide.children[0].textContent,'Quick strategy guide');
 assert.ok(!nodes.get('focused').children.some(n=>n.textContent==='Card zoom'));assert.ok(!nodes.has('focus-zoom'));
 for(const c of cards){vm.runInContext('show(cards.find(c=>c.id==='+JSON.stringify(c.id)+'),false)',ctx);assert.ok(nodes.get('focused').children.some(n=>n.className==='strategy-guide'))}
 // Named snapshots, dirty drafts, browser restoration and legacy migration.
 nodes.get('new-troupe').onclick();assert.equal(vm.runInContext('teamIds.length',ctx),0);assert.equal(nodes.get('faction').value,'Undecided');
 nodes.get('troupe-name').value='Alpha';nodes.get('troupe-name').oninput();vm.runInContext('add(cards[0]);add(cards[1])',ctx);nodes.get('save-troupe').onclick();
 const alpha=vm.runInContext('activeTroupeId',ctx);assert.equal(vm.runInContext('savedTroupes.length',ctx),1);assert.equal(nodes.get('storage-status').textContent,'Saved locally');
 assert.equal(nodes.get('metric-summary').children.length,6);const radar=nodes.get('troupe-chart').children[0];assert.equal(radar.attributes.role,'img');assert.match(radar.attributes['aria-label'],/Tank.*Damage.*Support.*Moonstone.*Complexity.*Range/);assert.equal(radar.children.filter(n=>n.attributes?.class==='radar-grid').length,5);assert.equal(vm.runInContext('L.troupeMetrics(members()).Damage',ctx),(cards[0].troupe_metrics.Damage+cards[1].troupe_metrics.Damage)/2);
 nodes.get('new-troupe').onclick();nodes.get('troupe-name').value='Beta';vm.runInContext('add(cards[2])',ctx);nodes.get('save-troupe').onclick();assert.equal(vm.runInContext('savedTroupes.length',ctx),2);
 nodes.get('saved-troupes').value=alpha;nodes.get('load-troupe').onclick();assert.equal(nodes.get('troupe-name').value,'Alpha');assert.equal(vm.runInContext('teamIds.length',ctx),2);
 nodes.get('troupe-name').value='Renamed Alpha';nodes.get('troupe-name').oninput();assert.match(nodes.get('storage-status').textContent,/Unsaved/);nodes.get('save-troupe').onclick();assert.equal(vm.runInContext('savedTroupes.length',ctx),2);assert.equal(vm.runInContext('savedTroupes.find(t=>t.id===activeTroupeId).name',ctx),'Renamed Alpha');
 // Editing a draft does not overwrite the saved snapshot until Save.
 vm.runInContext('remove(cards[1])',ctx);assert.equal(vm.runInContext('savedTroupes.find(t=>t.id===activeTroupeId).ids.length',ctx),2);
 vm.runInContext('teamIds=[];savedTroupes=[];activeTroupeId=null;restoreTroupes()',ctx);assert.equal(vm.runInContext('teamIds.length',ctx),1);assert.equal(vm.runInContext('savedTroupes.length',ctx),2);assert.equal(nodes.get('troupe-name').value,'Renamed Alpha');
 nodes.get('saved-troupes').value=alpha;nodes.get('delete-troupe').onclick();assert.equal(vm.runInContext('savedTroupes.length',ctx),1);assert.equal(vm.runInContext('activeTroupeId',ctx),null);assert.equal(vm.runInContext('teamIds.length',ctx),1);
 nodes.get('new-troupe').onclick();assert.equal(vm.runInContext('L.troupeMetrics(members()).Tank',ctx),0);
 storage.delete('moonstone-troupes-v2');storage.set('moonstone-troupe-v1',JSON.stringify({ids:[cards[0].id,cards[0].id,cards[63].id,'gone'],faction:'Commonwealth',size:5}));vm.runInContext('savedTroupes=[];activeTroupeId=null;restoreTroupes()',ctx);assert.equal(vm.runInContext('teamIds.length',ctx),1);assert.equal(nodes.get('faction').value,'Commonwealth');assert.equal(nodes.get('size').value,'5');
 storage.set('moonstone-troupes-v2','{bad json');vm.runInContext('restoreTroupes()',ctx);assert.match(nodes.get('storage-status').textContent,/could not be read/);
 ctx.localStorage.setItem=()=>{throw Error('Quota exceeded')};const savedCount=vm.runInContext('savedTroupes.length',ctx);nodes.get('save-troupe').onclick();assert.equal(vm.runInContext('savedTroupes.length',ctx),savedCount);assert.match(nodes.get('storage-status').textContent,/unavailable/);
 console.log('Builder state checks passed: add/remove, duplicate/summon rejection, summaries, faction changes, saved troupes, migration, radar averages and filters.');
})().catch(e=>{console.error(e);process.exitCode=1});
