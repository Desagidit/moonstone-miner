// Minimal UI-state harness; no live browser or production review writes.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const nodes=new Map();
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.style={};this.value='';this.listeners={}}
 set id(v){this._id=v;nodes.set(v,this)}get id(){return this._id}
 append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}
 addEventListener(k,fn){this.listeners[k]=fn}
}
for(const id of ['progress','search','filter','list','name','page','card','official','raw','zoom','message','editor','save','verify','prev','next']){const e=new Element();e.id=id}
nodes.get('filter').value='all';
const cards=JSON.parse(fs.readFileSync('data/characters.json','utf8'));let saved;
const context=vm.createContext({console,URLSearchParams,location:{search:''},document:{getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})},window:{confirm:()=>true,addEventListener:()=>{}},fetch:async(url,opts)=>{if(opts){saved=JSON.parse(opts.body);return {ok:true,json:async()=>({revision:1})}}return {ok:true,json:async()=>({cards,revision:0,source_hash:'test-source'})}},navigator:{}});
vm.runInContext(fs.readFileSync('review/dist/app.js','utf8'),context);
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(vm.runInContext('current.source.pdf_page',context),1);
 // Changing a field invalidates its previous verification and touches only that group.
 assert.equal(nodes.get('editor').children.length,9);
 vm.runInContext("renderEditor();group='stats';entry(group).status='verified';const testInput=field(document.createElement('div'),'Melee',5,x=>entry('stats').values.stats.melee=x,'number');group='eligibility';testInput.value='6';testInput.listeners.input();",context);
 assert.equal(vm.runInContext("entry('stats').status",context),'needs_review');
 assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify([...touched])',context)),['stats']);
 await nodes.get('save').onclick();
 assert.deepEqual(Object.keys(saved.groups),['stats']);assert.equal(saved.groups.stats.values.stats.melee,6);
 assert.equal(vm.runInContext('dirty',context),false);
 await nodes.get('verify').onclick();
 assert.equal(Object.keys(saved.groups).length,9);
 assert.ok(Object.values(saved.groups).every(g=>g.status==='verified'));
 console.log('UI state checks passed: field edits invalidate verification; saves leave untouched groups available for re-extraction.');
})().catch(e=>{console.error(e);process.exitCode=1});
