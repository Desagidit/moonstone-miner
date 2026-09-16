const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),L=require('./review/dist/team_logic.js');
const nodes=new Map();class E{constructor(){this.children=[];this.style={};this.value=''}set id(v){nodes.set(v,this)}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}setAttribute(){} }
for(const id of ['faction','faction-filter','size','find','sort','team','team-status','tag-summary','keyword-summary','notice','catalogue','result-count','focused','filter-groups','add-group','clear-filters','outer-mode','load-status']){const e=new E();e.id=id}
nodes.get('faction').value='Undecided';nodes.get('size').value='6';nodes.get('sort').value='name';
const cards=JSON.parse(fs.readFileSync('data/characters.json','utf8')),storage=new Map();
const ctx=vm.createContext({TeamLogic:L,console,document:{getElementById:id=>nodes.get(id),createElement:()=>new E()},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:true,json:async()=>({cards})})});
vm.runInContext(fs.readFileSync(process.argv.includes('--static')?'site/builder.js':'review/dist/builder.js','utf8'),ctx);
(async()=>{await new Promise(r=>setImmediate(r));assert.equal(vm.runInContext('cards.length',ctx),141);assert.ok(nodes.get('catalogue').children.every(n=>!n.className.includes('incompatible')));assert.ok(nodes.get('faction-filter').disabled);assert.ok(!nodes.get('focused').children.some(n=>n.className==='panel'));
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
 console.log('Builder state checks passed: add/remove, duplicate/summon rejection, summaries, faction changes, saved troupe and filters.');
})().catch(e=>{console.error(e);process.exitCode=1});
